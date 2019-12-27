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
        address receiver,
        uint256 gasUsed)
        internal
        returns (uint256 closeAmount, uint256 collateralCloseAmount)
    {
        LoanPosition storage loanPosition = loanPositions[loanPositionsIds[loanOrderHash][borrower]];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            return (0, 0);
        }

        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.loanTokenAddress == address(0)) {
            revert("_closeLoan: loanOrder.loanTokenAddress == address(0)");
        }

        // only the borrower can close a loan with a margin trade
        // positions that are not trades can be closed by others if position token is sufficient (loan paid back)
        require(borrower == msg.sender ||
            (loanPosition.positionTokenAddressFilled == loanOrder.loanTokenAddress &&
             loanPosition.positionTokenAmountFilled >= loanPosition.loanTokenAmountFilled),
            "unauthorized"
        );

        borrower = receiver;

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

        uint256 dispurseAmount;

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
                    if (loanPosition.positionTokenAddressFilled == loanPosition.collateralTokenAddressFilled) {
                        receiver = loanPosition.trader;
                    } else {
                        receiver = loanTokenAmount >= loanPosition.loanTokenAmountFilled ?
                            loanPosition.trader :
                            orderLender[loanOrderHash];
                    }
                    dispurseAmount = loanPosition.positionTokenAmountFilled.sub(positionTokenAmountUsed);
                    if (!BZxVault(vaultContract).withdrawToken(
                        loanPosition.positionTokenAddressFilled,
                        receiver,
                        dispurseAmount
                    )) {
                        revert("withdrawToken excess failed");
                    }
                    if (loanPosition.positionTokenAddressFilled != loanPosition.collateralTokenAddressFilled) {
                        dispurseAmount = 0;
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

        (closeAmount, collateralCloseAmount) = _finalizeLoan(
            borrower, // receiver
            loanOrder,
            loanPosition, // needs to be storage
            loanPosition.loanTokenAmountFilled, // closeAmount
            loanPosition.positionTokenAmountFilled, // closeAmountUsable
            false, // isLiquidation
            gasUsed // initial used gas, collected in modifier
        );
        if (dispurseAmount != 0) {
            collateralCloseAmount = collateralCloseAmount
                .add(dispurseAmount);
        }
        return (closeAmount, collateralCloseAmount);
    }

    function _finalizeLoan(
        address receiver, // of collateral
        LoanOrder memory loanOrder,
        LoanPosition storage loanPosition,
        uint256 closeAmount, // amount of loanToken being closed
        uint256 closeAmountUsable, // amount of loanToken available to close
        bool isLiquidation,
        uint256 gasUsed)
        internal
        returns (uint256, uint256)
    {
        //require(loanPosition.positionTokenAddressFilled == loanOrder.loanTokenAddress, "_finalizeLoan: loanPosition.positionTokenAddressFilled != loanOrder.loanTokenAddress");

        if (closeAmount > loanPosition.loanTokenAmountFilled)
            closeAmount = loanPosition.loanTokenAmountFilled;

        OracleInterface oracle = OracleInterface(oracleAddresses[loanOrder.oracleAddress]);
        BZxVault vault = BZxVault(vaultContract);

        if (loanPosition.collateralTokenAmountFilled != 0) {
            if (isLiquidation || closeAmount > closeAmountUsable) {
                // Send collateral to the oracle for processing. Unused collateral must be returned.
                require(vault.withdrawToken(
                    loanPosition.collateralTokenAddressFilled,
                    address(oracle),
                    loanPosition.collateralTokenAmountFilled
                ), "_finalizeLoan: withdrawToken (collateral) failed");

                 // loanTokenAmountCovered, collateralTokenAmountUsed, reserve
                uint256[3] memory returnValues;

                returnValues[0] = closeAmount > closeAmountUsable ?
                    closeAmount - closeAmountUsable :
                    0;

                returnValues = oracle.processCollateral(
                    loanOrder,
                    loanPosition,
                    returnValues[0], // destTokenAmountNeeded
                    0, // gasUsedForRollover
                    address(0), // gasRefundAddress,
                    isLiquidation
                );

                closeAmountUsable = closeAmountUsable.add(returnValues[0]);
                loanPosition.collateralTokenAmountFilled = loanPosition.collateralTokenAmountFilled.sub(returnValues[1]);
            }
        }

        require(closeAmountUsable >= closeAmount, "insufficient liquidity");

        address _receiver = receiver;

        uint256 collateralCloseAmount;
        if (loanPosition.collateralTokenAmountFilled != 0) {
            if (closeAmount == loanPosition.loanTokenAmountFilled) {
                // send remaining collateral token back to the trader if the loan is being fully closed
                require(vault.withdrawToken(
                    loanPosition.collateralTokenAddressFilled,
                    _receiver,
                    loanPosition.collateralTokenAmountFilled
                ), "_finalizeLoan: withdrawToken collateral failed");

                collateralCloseAmount = loanPosition.collateralTokenAmountFilled;
                loanPosition.collateralTokenAmountFilled = 0;
            }
        }

        // collateral receiver variable no longer needed, so reclaim
        _receiver = orderLender[loanOrder.loanOrderHash];

        if (closeAmountUsable != 0) {
            if (closeAmountUsable > closeAmount) {
                // send unpaid profit to the trader
                require(vault.withdrawToken(
                    loanOrder.loanTokenAddress,
                    loanPosition.trader,
                    closeAmountUsable - closeAmount // profit
                ), "_finalizeLoan: withdrawToken profit failed");

                closeAmountUsable = closeAmount;
            }

            // send owed loan token back to the lender
            require(vault.withdrawToken(
                loanOrder.loanTokenAddress,
                _receiver, // lender
                closeAmountUsable
            ), "_finalizeLoan: withdrawToken loan failed");

            /*if (orderAux[loanOrder.loanOrderHash].expirationUnixTimestampSec == 0 || block.timestamp < orderAux[loanOrder.loanOrderHash].expirationUnixTimestampSec) {
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
            }*/
        }

        if (closeAmount == loanPosition.loanTokenAmountFilled) {
            _endLoan(
                loanOrder,
                loanPosition,
                closeAmount,
                _receiver, // lender
                isLiquidation
            );
        } else {
            loanPosition.loanTokenAmountFilled = loanPosition.loanTokenAmountFilled.sub(closeAmount);
            //loanPosition.loanTokenAmountUsed = loanPosition.loanTokenAmountUsed.sub(closeAmount); <- not used yet
        }

        reentrancyLock = REENTRANCY_GUARD_FREE; // reentrancy safe at this point
        require(oracle.didCloseLoan(
            loanOrder,
            loanPosition,
            msg.sender, // loanCloser
            closeAmount,
            isLiquidation,
            gasUsed
        ), "_finalizeLoan: didCloseLoan failed");

        return (closeAmount,
            collateralCloseAmount
        );
    }

    function _endLoan(
        LoanOrder memory loanOrder,
        LoanPosition storage loanPosition,
        uint256 closeAmount,
        address lender,
        bool isLiquidation)
        internal
    {
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
        if (traderInterest.interestOwedPerDay == 0) {
            return (0, 0);
        }

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
                                    revert("_settleInterest: withdrawToken interest failed");
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
                    revert("_settleInterest: withdrawToken interest failed");
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