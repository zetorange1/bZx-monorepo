/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.3;
pragma experimental ABIEncoderV2;

import "../openzeppelin-solidity/SafeMath.sol";

import "../storage/BZxStorage.sol";
import "../BZxVault.sol";
import "../oracle/OracleInterface.sol";
import "./MiscFunctions.sol";

import "../tokens/EIP20.sol";


contract OrderClosingFunctions is BZxStorage, MiscFunctions {
    using SafeMath for uint256;

    function _closeLoan(
        bytes32 loanOrderHash,
        address borrower,
        uint256 gasUsed)
        internal
        returns (bool)
    {
        LoanPosition storage loanPosition = loanPositions[loanPositionsIds[loanOrderHash][msg.sender]];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            return false;
        }

        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.loanTokenAddress == address(0)) {
            revert("BZxLoanHealth::_closeLoan: loanOrder.loanTokenAddress == address(0)");
        }

        // only the borrower can close a loan with a margin trade
        // positions that are not trades can be closed by others if position token is sufficient (loan paid back)
        require(borrower == msg.sender ||
            (loanPosition.positionTokenAddressFilled == loanOrder.loanTokenAddress &&
             loanPosition.positionTokenAmountFilled >= loanPosition.loanTokenAmountFilled),
            "unauthorized"
        );

        uint256 loanAmountBought;
        if (loanOrder.interestAmount != 0) {
            (loanAmountBought,) = _settleInterest(
                loanOrder,
                loanPosition,
                loanPosition.loanTokenAmountFilled, // closeAmount
                true, // sendToOracle
                true  // refundToCollateral
            );
        }

        // If the position token is not the loan token, then we need to buy back the loan token prior to closing the loan.
        if (loanPosition.positionTokenAddressFilled != loanOrder.loanTokenAddress) {
            uint256 loanTokenAmount;
            uint256 positionTokenAmountUsed;
            if (loanPosition.positionTokenAmountFilled != 0) {
                (loanTokenAmount, positionTokenAmountUsed) = _tradePositionWithOracle(
                    loanOrder,
                    loanPosition,
                    loanOrder.loanTokenAddress, // tradeTokenAddress
                    loanPosition.positionTokenAddressFilled == loanPosition.collateralTokenAddressFilled ?
                        loanPosition.loanTokenAmountFilled :
                        MAX_UINT, // close the entire position
                    false // ensureHealthy
                );

                if (positionTokenAmountUsed < loanPosition.positionTokenAmountFilled) {
                    // left over sourceToken needs to be dispursed
                    address receiver;
                    if (loanPosition.positionTokenAddressFilled == loanPosition.collateralTokenAddressFilled) {
                        receiver = loanPosition.trader;
                    } else {
                        receiver = loanTokenAmount >= loanPosition.loanTokenAmountFilled ?
                            loanPosition.trader :
                            orderLender[loanOrderHash];
                    }
                    if (!BZxVault(vaultContract).withdrawToken(
                        loanPosition.positionTokenAddressFilled,
                        receiver,
                        loanPosition.positionTokenAmountFilled.sub(positionTokenAmountUsed)
                    )) {
                        revert("BZxLoanHealth::liquidatePosition: BZxVault.withdrawToken excess failed");
                    }
                }
            }

            // position token is now equal to loan token
            loanPosition.positionTokenAddressFilled = loanOrder.loanTokenAddress;
            loanPosition.positionTokenAmountFilled = loanTokenAmount;
        }

        if (loanAmountBought != 0) {
            loanPosition.positionTokenAmountFilled = loanPosition.positionTokenAmountFilled
                .add(loanAmountBought);
        }

        return _finalizeLoan(
            loanOrder,
            loanPosition, // needs to be storage
            loanPosition.loanTokenAmountFilled, // closeAmount
            loanPosition.positionTokenAmountFilled, // closeAmountUsable
            false, // isLiquidation
            gasUsed // initial used gas, collected in modifier
        );
    }

    function _finalizeLoan(
        LoanOrder memory loanOrder,
        LoanPosition storage loanPosition,
        uint256 closeAmount, // amount of loanToken being closed
        uint256 closeAmountUsable, // amount of loanToken available to close (closeAmountUsable <= closeAmount)
        bool isLiquidation,
        uint256 gasUsed)
        internal
        returns (bool)
    {
        //require(loanPosition.positionTokenAddressFilled == loanOrder.loanTokenAddress, "BZxLoanHealth::_finalizeLoan: loanPosition.positionTokenAddressFilled != loanOrder.loanTokenAddress");

        if (closeAmount > loanPosition.loanTokenAmountFilled)
            closeAmount = loanPosition.loanTokenAmountFilled;

        if (loanPosition.collateralTokenAmountFilled != 0) {
            if (isLiquidation || closeAmount > closeAmountUsable) {
                // Send collateral to the oracle for processing. Unused collateral must be returned.
                if (!BZxVault(vaultContract).withdrawToken(
                    loanPosition.collateralTokenAddressFilled,
                    oracleAddresses[loanOrder.oracleAddress],
                    loanPosition.collateralTokenAmountFilled
                )) {
                    revert("BZxLoanHealth::_finalizeLoan: BZxVault.withdrawToken (collateral) failed");
                }

                (uint256 loanTokenAmountCovered, uint256 collateralTokenAmountUsed) = OracleInterface(oracleAddresses[loanOrder.oracleAddress]).processCollateral(
                    loanOrder,
                    loanPosition,
                    closeAmount > closeAmountUsable ? closeAmount - closeAmountUsable : 0,
                    isLiquidation
                );

                closeAmountUsable = closeAmountUsable.add(loanTokenAmountCovered);
                loanPosition.collateralTokenAmountFilled = loanPosition.collateralTokenAmountFilled.sub(collateralTokenAmountUsed);
            }
        }

        address lender = orderLender[loanOrder.loanOrderHash];

        if (loanPosition.collateralTokenAmountFilled != 0) {
            if (closeAmount > closeAmountUsable) {
                // in case we couldn't cover the full loanTokenAmount yet,
                // reemburse the lender in collateralToken as last resort
                uint256 reimburseAmount = closeAmount - closeAmountUsable;
                if (loanPosition.collateralTokenAddressFilled != loanOrder.loanTokenAddress) {
                    (,,reimburseAmount) = OracleInterface(oracleAddresses[loanOrder.oracleAddress]).getTradeData(
                        loanOrder.loanTokenAddress,
                        loanPosition.collateralTokenAddressFilled,
                        reimburseAmount
                    );
                }
                if (reimburseAmount > 0 && loanPosition.collateralTokenAmountFilled >= reimburseAmount) {
                    if (loanPosition.collateralTokenAmountFilled >= reimburseAmount) {
                        if (!BZxVault(vaultContract).withdrawToken(
                            loanPosition.collateralTokenAddressFilled,
                            lender,
                            reimburseAmount
                        )) {
                            revert("BZxLoanHealth::_finalizeLoan: BZxVault.withdrawToken collateral failed");
                        }
                        loanPosition.collateralTokenAmountFilled = loanPosition.collateralTokenAmountFilled.sub(reimburseAmount);
                    }
                }
            }

            if (loanPosition.collateralTokenAmountFilled != 0) {
                if (closeAmount == loanPosition.loanTokenAmountFilled) {
                    // send remaining collateral token back to the trader if the loan is being fully closed
                    if (!BZxVault(vaultContract).withdrawToken(
                        loanPosition.collateralTokenAddressFilled,
                        loanPosition.trader,
                        loanPosition.collateralTokenAmountFilled
                    )) {
                        revert("BZxLoanHealth::_finalizeLoan: BZxVault.withdrawToken collateral failed");
                    }
                    loanPosition.collateralTokenAmountFilled = 0;
                }
            }
        }

        if (closeAmountUsable != 0) {
            if (closeAmountUsable > closeAmount) {
                // send unpaid profit to the trader
                uint256 profit = closeAmountUsable-closeAmount;
                if (!BZxVault(vaultContract).withdrawToken(
                    loanOrder.loanTokenAddress,
                    loanPosition.trader,
                    profit
                )) {
                    revert("BZxLoanHealth::_finalizeLoan: BZxVault.withdrawToken profit failed");
                }
                closeAmountUsable = closeAmount;
            }

            // send owed loan token back to the lender
            if (!BZxVault(vaultContract).withdrawToken(
                loanOrder.loanTokenAddress,
                lender,
                closeAmountUsable
            )) {
                revert("BZxLoanHealth::_finalizeLoan: BZxVault.withdrawToken loan failed");
            }

            if (orderAux[loanOrder.loanOrderHash].expirationUnixTimestampSec == 0 || block.timestamp < orderAux[loanOrder.loanOrderHash].expirationUnixTimestampSec) {
                // since order is not expired, we make the closeAmountUsable available for borrowing again
                orderFilledAmounts[loanOrder.loanOrderHash] = orderFilledAmounts[loanOrder.loanOrderHash].sub(closeAmountUsable);

                if (!orderListIndex[loanOrder.loanOrderHash][address(0)].isSet && loanOrder.loanTokenAmount.sub(_getUnavailableLoanTokenAmount(loanOrder.loanOrderHash)) > 0) {
                    // record of fillable (non-expired/unfilled) orders
                    orderList[address(0)].push(loanOrder.loanOrderHash);
                    orderListIndex[loanOrder.loanOrderHash][address(0)] = ListIndex({
                        index: orderList[address(0)].length-1,
                        isSet: true
                    });
                }
            }
        }

        if (closeAmount == loanPosition.loanTokenAmountFilled) {
            loanPosition.positionTokenAmountFilled = closeAmount; // for historical reference
            loanPosition.loanTokenAmountFilled = 0;
            //loanPosition.loanTokenAmountUsed = 0; <- not used yet

            loanPosition.active = false;
            _removePosition(
                loanOrder.loanOrderHash,
                loanPosition.trader
            );

            emit LogLoanClosed(
                lender,
                loanPosition.trader,
                msg.sender, // loanCloser
                isLiquidation,
                loanOrder.loanOrderHash,
                loanPosition.positionId
            );
        } else {
            loanPosition.loanTokenAmountFilled = loanPosition.loanTokenAmountFilled.sub(closeAmount);
            //loanPosition.loanTokenAmountUsed = loanPosition.loanTokenAmountUsed.sub(closeAmount); <- not used yet
        }

        reentrancyLock = REENTRANCY_GUARD_FREE; // reentrancy safe at this point
        if (!OracleInterface(oracleAddresses[loanOrder.oracleAddress]).didCloseLoan(
            loanOrder,
            loanPosition,
            msg.sender, // loanCloser
            closeAmount,
            isLiquidation,
            gasUsed
        )) {
            revert("BZxLoanHealth::_finalizeLoan: OracleInterface.didCloseLoan failed");
        }

        return true;
    }

    function _settleInterest(
        LoanOrder memory loanOrder,
        LoanPosition storage loanPosition,
        uint256 closeAmount,
        bool sendToOracle,
        bool refundToCollateral) // will refund to collateral if appropriate
        internal
        returns (uint256 loanAmountBought, uint256 positionAmountSold)
    {
        TraderInterest storage traderInterest = traderLoanInterest[loanPosition.positionId];

        uint256 owedPerDayRefund;
        if (closeAmount < loanPosition.loanTokenAmountFilled) {
            owedPerDayRefund = SafeMath.div(
                SafeMath.mul(closeAmount, traderInterest.interestOwedPerDay),
                loanPosition.loanTokenAmountFilled
            );
        } else {
            owedPerDayRefund = traderInterest.interestOwedPerDay;
        }

        address lender = orderLender[loanOrder.loanOrderHash];

        _settleInterestForLender(
            loanOrder,
            lender,
            sendToOracle,
            owedPerDayRefund
        );

        // update trader interest
        uint256 interestTime = block.timestamp;
        if (interestTime > loanPosition.loanEndUnixTimestampSec) {
            interestTime = loanPosition.loanEndUnixTimestampSec;
        }

        if (traderInterest.interestUpdatedDate != 0 && traderInterest.interestOwedPerDay != 0) {
            uint256 interestPaid = interestTime
                .sub(traderInterest.interestUpdatedDate);
            interestPaid = interestPaid
                .mul(traderInterest.interestOwedPerDay);
            interestPaid = interestPaid
                .div(86400);
            interestPaid = interestPaid
                .add(traderInterest.interestPaid);

            traderInterest.interestPaid = interestPaid;
        }

        uint256 totalInterestToRefund = loanPosition.loanEndUnixTimestampSec
            .sub(interestTime);
        totalInterestToRefund = totalInterestToRefund
            .mul(owedPerDayRefund);
        totalInterestToRefund = totalInterestToRefund
            .div(86400);

        traderInterest.interestUpdatedDate = interestTime;
        if (closeAmount < loanPosition.loanTokenAmountFilled) {
            traderInterest.interestOwedPerDay = traderInterest.interestOwedPerDay.sub(owedPerDayRefund);
            traderInterest.interestDepositTotal = traderInterest.interestDepositTotal.sub(totalInterestToRefund);
        } else {
            traderInterest.interestOwedPerDay = 0;
            traderInterest.interestDepositTotal = 0;
        }

        if (totalInterestToRefund != 0) {
            tokenInterestOwed[lender][loanOrder.interestTokenAddress] = totalInterestToRefund < tokenInterestOwed[lender][loanOrder.interestTokenAddress] ?
                tokenInterestOwed[lender][loanOrder.interestTokenAddress].sub(totalInterestToRefund) :
                0;

            if (refundToCollateral &&
                loanOrder.interestTokenAddress == loanOrder.loanTokenAddress) {

                if (loanOrder.loanTokenAddress == loanPosition.positionTokenAddressFilled) {
                    // payback part of the loan using the interest
                    loanAmountBought = totalInterestToRefund;
                    totalInterestToRefund = 0;
                } else if (loanOrder.interestTokenAddress != loanPosition.collateralTokenAddressFilled) {
                    // we will attempt to pay the trader back in collateral token
                    if (loanPosition.positionTokenAmountFilled != 0 &&
                        loanPosition.collateralTokenAddressFilled == loanPosition.positionTokenAddressFilled) {

                        (uint256 sourceToDestRate, uint256 sourceToDestPrecision,) = OracleInterface(oracleAddresses[loanOrder.oracleAddress]).getTradeData(
                            loanOrder.interestTokenAddress,
                            loanPosition.collateralTokenAddressFilled,
                            MAX_UINT // get best rate
                        );
                        positionAmountSold = totalInterestToRefund
                            .mul(sourceToDestRate);
                        positionAmountSold = positionAmountSold
                            .div(sourceToDestPrecision);

                        if (positionAmountSold != 0) {
                            if (loanPosition.positionTokenAmountFilled >= positionAmountSold) {
                                loanPosition.positionTokenAmountFilled = loanPosition.positionTokenAmountFilled
                                    .sub(positionAmountSold);

                                // closeAmount always >= totalInterestToRefund at this point, so set used amount
                                loanAmountBought = totalInterestToRefund;
                                totalInterestToRefund = 0;
                            } else {
                                loanAmountBought = loanPosition.positionTokenAmountFilled
                                    .mul(sourceToDestPrecision);
                                loanAmountBought = loanAmountBought
                                    .div(sourceToDestRate);

                                if (loanAmountBought > totalInterestToRefund)
                                    loanAmountBought = totalInterestToRefund;

                                positionAmountSold = loanPosition.positionTokenAmountFilled;
                                totalInterestToRefund = totalInterestToRefund.sub(loanAmountBought);
                                loanPosition.positionTokenAmountFilled = 0;
                            }

                            if (positionAmountSold != 0) {
                                if (!BZxVault(vaultContract).withdrawToken(
                                    loanPosition.collateralTokenAddressFilled,
                                    loanPosition.trader,
                                    positionAmountSold
                                )) {
                                    revert("_settleInterest: BZxVault.withdrawToken interest failed");
                                }
                            }
                        }
                    }
                }
            }

            if (totalInterestToRefund != 0) {
                // refund interest as is if we weren't able to swap for collateral token above
                if (!BZxVault(vaultContract).withdrawToken(
                    loanOrder.interestTokenAddress,
                    loanPosition.trader,
                    totalInterestToRefund
                )) {
                    revert("_settleInterest: BZxVault.withdrawToken interest failed");
                }
            }
        }
    }

    function _settleInterestForLender(
        LoanOrder memory loanOrder,
        address lender,
        bool sendToOracle,
        uint256 owedPerDayRefund)
        internal
    {
        LenderInterest storage oracleInterest = lenderOracleInterest[lender][loanOrder.oracleAddress][loanOrder.interestTokenAddress];

        // update lender interest
        _payInterestForOracle(
            oracleInterest,
            lender,
            loanOrder.oracleAddress,
            loanOrder.interestTokenAddress,
            sendToOracle
        );

        oracleInterest.interestOwedPerDay = oracleInterest.interestOwedPerDay.sub(owedPerDayRefund);
    }

    function _removePosition(
        bytes32 loanOrderHash,
        address trader)
        internal
    {
        uint256 positionId = loanPositionsIds[loanOrderHash][trader];
        if (positionListIndex[positionId].isSet) {
            assert(positionList.length > 0);

            if (positionList.length > 1) {
                // get positionList index
                uint256 index = positionListIndex[positionId].index;

                // replace loan in list with last loan in array
                positionList[index] = positionList[positionList.length - 1];

                // update the position of this replacement
                positionListIndex[positionList[index].positionId].index = index;
            }

            // trim array
            positionList.length--;
        }
    }
}