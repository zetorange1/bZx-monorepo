/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.3;
pragma experimental ABIEncoderV2;

import "../openzeppelin-solidity/Math.sol";

import "../shared/OrderClosingFunctions.sol";

import "../BZxVault.sol";
import "../oracle/OracleInterface.sol";


contract OrderClosingFunctionsForPartial is BZxStorage, MiscFunctions, OrderClosingFunctions {
    using SafeMath for uint256;

    function _closeLoanPartially(
        address[3] memory addrs, // borrower, receiver, oracle
        uint256[4] memory vals,  // closeAmount, collateralCloseAmount, marginAmountBeforeClose, gasUsed
        LoanOrder memory loanOrder,
        LoanPosition storage loanPosition,
        bool ensureHealthy)
        internal
        returns (uint256, uint256, address)
    {
        if (vals[0] >= loanPosition.loanTokenAmountFilled) {
            // close entire loan requested
            (vals[0], vals[1]) = _closeLoan(
                loanOrder.loanOrderHash,
                addrs[0],
                addrs[1],
                vals[3] // initial used gas, collected in modifier
            );
            return (
                vals[0],
                vals[1],
                vals[0] != 0 ?
                    loanPosition.collateralTokenAddressFilled :
                    address(0)
            );
        }

        uint256[3] memory tmpVals; // destTokenAmountReceived, sourceTokenAmountUsed, closeAmountNotRecovered

        if (vals[2] == 0) {
            vals[2] = _getCurrentMarginAmount(
                loanOrder,
                loanPosition,
                addrs[2]
            );
            if (ensureHealthy && vals[2] <= loanOrder.maintenanceMarginAmount) {
                revert("BZxLoanHealth::_closeLoanPartially: unhealthy position");
            }

            if (loanOrder.loanTokenAddress == loanPosition.collateralTokenAddressFilled) {
                vals[1] = vals[0];
            } else {
                // variables needed later are re-purposed here; variable names are inappropriate
                (tmpVals[0], tmpVals[1],) = OracleInterface(addrs[2]).getTradeData(
                    loanOrder.loanTokenAddress,
                    loanPosition.collateralTokenAddressFilled,
                    MAX_UINT // get best rate
                );
                vals[1] = vals[0]
                    .mul(tmpVals[0]);  // sourceToDestRate
                vals[1] = vals[1]
                    .div(tmpVals[1]);    // sourceToDestPrecision
            }

            vals[1] = vals[1]
                .mul(vals[2]);
            vals[1] = vals[1]
                .div(10**20);
        }

        // closeAmountNotRecovered
        tmpVals[2] = vals[0];

        // pay lender interest so far, and do partial interest refund to borrower
        if (loanOrder.interestAmount != 0) {
            (tmpVals[0], tmpVals[1]) = _settleInterest(
                loanOrder,
                loanPosition,
                vals[0],
                true, // sendToOracle
                true  // interestToCollateralSwap
            );
            if (tmpVals[0] != 0) {
                tmpVals[2] = tmpVals[2]
                    .sub(tmpVals[0]);

                //vals[0] = vals[0]
                //    .sub(tmpVals[0]);
                vals[1] = vals[1]
                    .sub(tmpVals[1]);
                /*(vals[0], vals[1]) = _updateCloseAmounts(
                    vals[0],
                    vals[1],
                    tmpVals[0]
                );*/
                /*vals[0] = vals[0]
                    .sub(tmpVals[0]);

                tmpVals[1] = tmpVals[1]
                    .mul(10**20);
                tmpVals[1] = tmpVals[1]
                    .div(vals[2]);
                if (vals[1] > tmpVals[1]) {
                    vals[1] = vals[1]
                        .sub(tmpVals[1]);
                } else {
                    vals[1] = 0;
                }*/
            }
        }

        if (loanPosition.positionTokenAddressFilled != loanOrder.loanTokenAddress) {
            if (loanPosition.positionTokenAmountFilled != 0) {
                if (tmpVals[2] != 0) {
                    (tmpVals[0], tmpVals[1]) = _tradeWithOracle(
                        loanPosition.positionTokenAddressFilled,
                        loanOrder.loanTokenAddress,
                        addrs[2],
                        loanPosition.positionTokenAmountFilled,
                        tmpVals[2] // maxDestTokenAmount
                    );

                    if (tmpVals[0] < tmpVals[2]) {
                        tmpVals[2] = tmpVals[2] - tmpVals[0];
                    } else {
                        tmpVals[2] = 0;
                    }
                    loanPosition.positionTokenAmountFilled = loanPosition.positionTokenAmountFilled.sub(tmpVals[1]);
                }
            }
        } else {
            if (loanPosition.positionTokenAmountFilled < tmpVals[2]) {
                tmpVals[2] -= loanPosition.positionTokenAmountFilled;
                loanPosition.positionTokenAmountFilled = 0;
            } else {
                // we can close all of tmpVals[2], if here
                loanPosition.positionTokenAmountFilled -= tmpVals[2];
                tmpVals[2] = 0;
            }
        }

        if (vals[2] > loanOrder.maintenanceMarginAmount) {
            // only use collateral if the position doesn't need liquidation
            if (loanPosition.collateralTokenAmountFilled != 0) {
                //tmpVals[1] = 0;
                if (tmpVals[2] != 0) {
                    // try to recover closeAmount needed from collateral
                    if (loanPosition.collateralTokenAddressFilled != loanOrder.loanTokenAddress) {
                        (tmpVals[0], tmpVals[1]) = _tradeWithOracle(
                            loanPosition.collateralTokenAddressFilled,
                            loanOrder.loanTokenAddress,
                            addrs[2],
                            loanPosition.collateralTokenAmountFilled,
                            tmpVals[2] // maxDestTokenAmount
                        );

                        //tmpVals[2] = tmpVals[2].sub(tmpVals[0]);
                        /*loanPosition.collateralTokenAmountFilled = loanPosition.collateralTokenAmountFilled.sub(tmpVals[1]);

                        if (tmpVals[2] != 0) {
                            // we've closed as much as we can
                            vals[0] = vals[0].sub(tmpVals[2]);
                        }*/

                        // older code
                        if (tmpVals[0] < tmpVals[2]) {
                            // update vals[1] and closeAmount for the actual amount we will be able to close

                            tmpVals[2] = tmpVals[2].sub(tmpVals[0]);
                            (vals[0], vals[1]) = _updateCloseAmounts(
                                vals[0],
                                vals[1],
                                tmpVals[2]
                            );
                        }

                        loanPosition.collateralTokenAmountFilled = loanPosition.collateralTokenAmountFilled.sub(tmpVals[1]);
                    } else {
                        if (loanPosition.collateralTokenAmountFilled < tmpVals[2]) {
                            // update vals[1] and closeAmount for the actual amount we will be able to close

                            // older code
                            (vals[0], vals[1]) = _updateCloseAmounts(
                                vals[0],
                                vals[1],
                                loanPosition.collateralTokenAmountFilled
                            );

                            //tmpVals[1] = loanPosition.collateralTokenAmountFilled;
                            //tmpVals[2] = tmpVals[2].sub(loanPosition.collateralTokenAmountFilled);
                            loanPosition.collateralTokenAmountFilled = 0;

                            // we've closed as much as we can (newer code)
                            //vals[0] = vals[0].sub(tmpVals[2]);
                        } else {
                            // we can close all of closeAmount, if here
                            //tmpVals[1] = tmpVals[2];

                            loanPosition.collateralTokenAmountFilled -= tmpVals[2];
                            //tmpVals[2] = 0;
                        }
                    }
                }

                if (vals[1] != 0) {
                    if (loanPosition.collateralTokenAmountFilled >= vals[1]) {
                        // send excess collateral token back to the receiver
                        if (!BZxVault(vaultContract).withdrawToken(
                            loanPosition.collateralTokenAddressFilled,
                            addrs[1],
                            vals[1]
                        )) {
                            revert("BZxLoanHealth::_closeLoanPartially: BZxVault.withdrawToken collateral failed");
                        }
                        loanPosition.collateralTokenAmountFilled = loanPosition.collateralTokenAmountFilled.sub(vals[1]);
                    } else {
                        vals[1] = 0;
                    }
                }
            } else {
                vals[1] = 0;
            }
        } else {
            vals[1] = 0;
            vals[0] = vals[0].sub(tmpVals[2]);
        }

        require(vals[0] > 0, "closeAmount should not == 0");

        loanPosition.loanTokenAmountFilled = loanPosition.loanTokenAmountFilled.sub(vals[0]);
        //loanPosition.loanTokenAmountUsed = loanPosition.loanTokenAmountUsed.sub(vals[0]); <- not used yet

        _settlePartialClosure(
            loanOrder.loanOrderHash,
            loanOrder.loanTokenAddress,
            //loanOrder.loanTokenAmount,
            vals[0]
        );

        reentrancyLock = REENTRANCY_GUARD_FREE; // reentrancy safe at this point
        if (!OracleInterface(addrs[2]).didCloseLoan(
            loanOrder,
            loanPosition,
            msg.sender, // loanCloser
            vals[0],
            false, // isLiquidation
            vals[3]
        )) {
            revert("BZxLoanHealth::_closeLoanPartially: OracleInterface.didCloseLoan failed");
        }

        return (vals[0], vals[1], loanPosition.collateralTokenAddressFilled);
    }

    function _getCurrentMarginAmount(
        LoanOrder memory loanOrder,
        LoanPosition memory loanPosition,
        address oracleAddress)
        internal
        view
        returns (uint256)
    {
        return OracleInterface(oracleAddress).getCurrentMarginAmount(
            loanOrder.loanTokenAddress,
            loanPosition.positionTokenAddressFilled,
            loanPosition.collateralTokenAddressFilled,
            loanPosition.loanTokenAmountFilled,
            loanPosition.positionTokenAmountFilled,
            loanPosition.collateralTokenAmountFilled
        );
    }

    function _tradeWithOracle(
        address sourceTokenAddress,
        address destTokenAddress,
        address oracleAddress,
        uint256 sourceTokenAmount,
        uint256 maxDestTokenAmount)
        internal
        returns (uint256 destTokenAmountReceived, uint256 sourceTokenAmountUsed)
    {
        if (!BZxVault(vaultContract).withdrawToken(
            sourceTokenAddress,
            oracleAddress,
            sourceTokenAmount
        )) {
            revert("oracletrade: withdrawToken (sourceToken) failed");
        }

        (destTokenAmountReceived, sourceTokenAmountUsed) = OracleInterface(oracleAddress).trade(
            sourceTokenAddress,
            destTokenAddress,
            sourceTokenAmount,
            maxDestTokenAmount
        );
        require (destTokenAmountReceived != 0, "destTokenAmountReceived == 0");

        if (destTokenAmountReceived == MAX_UINT) {
            destTokenAmountReceived = 0;
        }
    }

    function _settlePartialClosure(
        bytes32 loanOrderHash,
        address loanTokenAddress,
        //uint256 loanTokenAmount,
        uint256 closeAmount)
        internal
    {
        // send closed token back to the lender
        if (!BZxVault(vaultContract).withdrawToken(
            loanTokenAddress,
            orderLender[loanOrderHash],
            closeAmount
        )) {
            revert("BZxLoanHealth::_closeLoanPartially: BZxVault.withdrawToken loan failed");
        }

        /*if (orderAux[loanOrderHash].expirationUnixTimestampSec == 0 || block.timestamp < orderAux[loanOrderHash].expirationUnixTimestampSec) {
            // since order is not expired, we make the closeAmount available for borrowing again
            orderFilledAmounts[loanOrderHash] = orderFilledAmounts[loanOrderHash].sub(closeAmount);

            if (!orderListIndex[loanOrderHash][address(0)].isSet && loanTokenAmount.sub(_getUnavailableLoanTokenAmount(loanOrderHash)) > 0) {
                // record of fillable (non-expired/unfilled) orders
                orderList[address(0)].push(loanOrderHash);
                orderListIndex[loanOrderHash][address(0)] = ListIndex({
                    index: orderList[address(0)].length-1,
                    isSet: true
                });
            }
        }*/
    }

    function _updateCloseAmounts(
        uint256 closeAmount,
        uint256 collateralCloseAmount,
        uint256 subtrahend)
        internal
        pure
        returns (uint256, uint256)
    {
        uint256 newCloseAmount = closeAmount
            .sub(subtrahend);

        return (
            newCloseAmount,
            collateralCloseAmount
                .mul(newCloseAmount)
                .div(closeAmount)
        );
    }
}