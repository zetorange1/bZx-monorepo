/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.3;
pragma experimental ABIEncoderV2;

import "../openzeppelin-solidity/Math.sol";

import "../proxy/BZxProxiable.sol";
import "../shared/OrderClosingFunctions.sol";

import "../BZxVault.sol";
import "../oracle/OracleInterface.sol";


contract LoanHealth_MiscFunctions3 is BZxStorage, BZxProxiable, OrderClosingFunctions {
    using SafeMath for uint256;

    constructor() public {}

    function()
        external
    {
        revert("fallback not allowed");
    }

    function initialize(
        address _target)
        public
        onlyOwner
    {
        targets[bytes4(keccak256("closeLoanPartially(bytes32,uint256)"))] = _target;
        targets[bytes4(keccak256("closeLoanPartiallyIfHealthy(bytes32,uint256)"))] = _target;
        targets[bytes4(keccak256("closeLoanPartiallyFromCollateral(bytes32,uint256)"))] = _target;
    }

    /// @dev Called by the trader to close part of their loan early.
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param closeAmount The amount of the loan token to return to the lender
    /// @return The actual amount closed. Greater than closeAmount means the loan needed liquidation.
    function closeLoanPartially(
        bytes32 loanOrderHash,
        uint256 closeAmount)
        external
        nonReentrant
        tracksGas
        returns (uint256 actualCloseAmount)
    {
        if (closeAmount == 0) {
            return 0;
        }

        LoanPosition storage loanPosition = loanPositions[loanPositionsIds[loanOrderHash][msg.sender]];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            return 0;
        }

        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.loanTokenAddress == address(0)) {
            revert("_closeLoanPartially: loanOrder.loanTokenAddress == address(0)");
        }

        return _closeLoanPartially(
            loanOrder,
            loanPosition,
            closeAmount,
            0, // collateralCloseAmount (calculated later)
            0, // marginAmountBeforeClose (calculated later)
            oracleAddresses[loanOrder.oracleAddress],
            false, // ensureHealthy
            gasUsed // initial used gas, collected in modifier
        );
    }

    /// @dev Called by the trader to close part of their loan early.
    /// @dev Contract will revert if the position is unhealthy and the full position is not being closed.
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param closeAmount The amount of the loan token to return to the lender
    /// @return The actual amount closed. Greater than closeAmount means the loan needed liquidation.
    function closeLoanPartiallyIfHealthy(
        bytes32 loanOrderHash,
        uint256 closeAmount)
        external
        nonReentrant
        tracksGas
        returns (uint256 actualCloseAmount)
    {
        if (closeAmount == 0) {
            return 0;
        }

        LoanPosition storage loanPosition = loanPositions[loanPositionsIds[loanOrderHash][msg.sender]];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            return 0;
        }

        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.loanTokenAddress == address(0)) {
            revert("_closeLoanPartially: loanOrder.loanTokenAddress == address(0)");
        }

        return _closeLoanPartially(
            loanOrder,
            loanPosition,
            closeAmount,
            0, // collateralCloseAmount (calculated later)
            0, // marginAmountBeforeClose (calculated later)
            oracleAddresses[loanOrder.oracleAddress],
            true, // ensureHealthy
            gasUsed // initial used gas, collected in modifier
        );
    }

    /// @dev Called by the trader to close part of their loan early.
    /// @dev Contract will revert if the position is unhealthy and the full position is not being closed.
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param closeAmount The amount of collateral token to close out. Loan amount to close will be calculated based on current margin.
    /// @return The actual amount of loan token closed. Greater than closeAmount means the loan needed liquidation.
    function closeLoanPartiallyFromCollateral(
        bytes32 loanOrderHash,
        uint256 closeAmount)
        external
        nonReentrant
        tracksGas
        returns (uint256 actualCloseAmount)
    {
        if (closeAmount == 0) {
            return 0;
        }

        LoanPosition storage loanPosition = loanPositions[loanPositionsIds[loanOrderHash][msg.sender]];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            return 0;
        }

        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.loanTokenAddress == address(0)) {
            revert("_closeLoanPartially: loanOrder.loanTokenAddress == address(0)");
        }

        address oracleAddress = oracleAddresses[loanOrder.oracleAddress];

        uint256 marginAmountBeforeClose;
        uint256 collateralCloseAmount;
        uint256 updatedCloseAmount;
        if (closeAmount < loanPosition.collateralTokenAmountFilled) {
            marginAmountBeforeClose = _getCurrentMarginAmount(
                loanOrder,
                loanPosition,
                oracleAddress
            );
            if (marginAmountBeforeClose <= loanOrder.maintenanceMarginAmount) {
                revert("BZxLoanHealth::_closeLoanPartially: unhealthy position");
            }

            collateralCloseAmount = closeAmount;
            updatedCloseAmount = collateralCloseAmount
                .mul(10**20)
                .div(marginAmountBeforeClose);

            if (loanPosition.collateralTokenAddressFilled != loanOrder.loanTokenAddress) {
                (uint256 sourceToDestRate, uint256 sourceToDestPrecision,) = OracleInterface(oracleAddress).getTradeData(
                    loanOrder.loanTokenAddress,
                    loanPosition.collateralTokenAddressFilled,
                    MAX_UINT // get best rate
                );
                updatedCloseAmount = updatedCloseAmount
                    .mul(sourceToDestPrecision)
                    .div(sourceToDestRate);
                /*(,,updatedCloseAmount) = OracleInterface(oracleAddress).getTradeData(
                    loanPosition.collateralTokenAddressFilled,
                    loanOrder.loanTokenAddress,
                    collateralCloseAmount
                );
                updatedCloseAmount = updatedCloseAmount
                    .mul(sourceToDestRate)
                    .div(sourceToDestPrecision)
                    .mul(10**20)
                    .div(marginAmountBeforeClose);*/
                /*(,,updatedCloseAmount) = OracleInterface(oracleAddress).getTradeData(
                    loanPosition.collateralTokenAddressFilled,
                    loanOrder.loanTokenAddress,
                    updatedCloseAmount
                );*/
            }
        } else {
            // this will trigger closing the entire loan amount
            collateralCloseAmount = loanPosition.collateralTokenAmountFilled;
            updatedCloseAmount = MAX_UINT;
        }

        return _closeLoanPartially(
            loanOrder,
            loanPosition,
            updatedCloseAmount,
            collateralCloseAmount,
            marginAmountBeforeClose,
            oracleAddress,
            true, // ensureHealthy
            gasUsed // initial used gas, collected in modifier
        );
    }


    /*
    * Internal functions
    */

    function _closeLoanPartially(
        LoanOrder memory loanOrder,
        LoanPosition storage loanPosition,
        uint256 closeAmount,
        uint256 collateralCloseAmount,
        uint256 marginAmountBeforeClose,
        address oracleAddress,
        bool ensureHealthy,
        uint256 gasUsed)
        internal
        returns (uint256)
    {
        if (closeAmount >= loanPosition.loanTokenAmountFilled) {
            closeAmount = loanPosition.loanTokenAmountFilled; // save before storage update

            // close entire loan requested
            ensureHealthy = _closeLoan(
                loanOrder.loanOrderHash,
                msg.sender, // borrower
                gasUsed // initial used gas, collected in modifier
            );
            if (ensureHealthy)
                return closeAmount;
            else
                return 0;
        }

        uint256 destTokenAmountReceived;
        uint256 sourceTokenAmountUsed;

        if (marginAmountBeforeClose == 0) {
            marginAmountBeforeClose = _getCurrentMarginAmount(
                loanOrder,
                loanPosition,
                oracleAddress
            );
            if (ensureHealthy && marginAmountBeforeClose <= loanOrder.maintenanceMarginAmount) {
                revert("BZxLoanHealth::_closeLoanPartially: unhealthy position");
            }

            if (loanOrder.loanTokenAddress == loanPosition.collateralTokenAddressFilled) {
                collateralCloseAmount = closeAmount;
            } else {
                // variables needed later are re-purposed here; variable names are inappropriate
                (destTokenAmountReceived, sourceTokenAmountUsed,) = OracleInterface(oracleAddress).getTradeData(
                    loanOrder.loanTokenAddress,
                    loanPosition.collateralTokenAddressFilled,
                    MAX_UINT // get best rate
                );
                collateralCloseAmount = closeAmount
                    .mul(destTokenAmountReceived);  // sourceToDestRate
                collateralCloseAmount = collateralCloseAmount
                    .div(sourceTokenAmountUsed);    // sourceToDestPrecision
            }

            collateralCloseAmount = collateralCloseAmount
                .mul(marginAmountBeforeClose);
            collateralCloseAmount = collateralCloseAmount
                .div(10**20);
        }

        uint256 closeAmountNotRecovered = closeAmount;

        // pay lender interest so far, and do partial interest refund to trader
        if (loanOrder.interestAmount != 0) {
            (destTokenAmountReceived, sourceTokenAmountUsed) = _settleInterest(
                loanOrder,
                loanPosition,
                closeAmount,
                true, // sendToOracle
                true  // interestToCollateralSwap
            );
            if (destTokenAmountReceived != 0) {
                closeAmountNotRecovered = closeAmountNotRecovered
                    .sub(destTokenAmountReceived);

                //closeAmount = closeAmount
                //    .sub(destTokenAmountReceived);
                collateralCloseAmount = collateralCloseAmount
                    .sub(sourceTokenAmountUsed);
                /*(closeAmount, collateralCloseAmount) = _updateCloseAmounts(
                    closeAmount,
                    collateralCloseAmount,
                    destTokenAmountReceived
                );*/
                /*closeAmount = closeAmount
                    .sub(destTokenAmountReceived);

                sourceTokenAmountUsed = sourceTokenAmountUsed
                    .mul(10**20);
                sourceTokenAmountUsed = sourceTokenAmountUsed
                    .div(marginAmountBeforeClose);
                if (collateralCloseAmount > sourceTokenAmountUsed) {
                    collateralCloseAmount = collateralCloseAmount
                        .sub(sourceTokenAmountUsed);
                } else {
                    collateralCloseAmount = 0;
                }*/
            }
        }

        if (loanPosition.positionTokenAddressFilled != loanOrder.loanTokenAddress) {
            if (loanPosition.positionTokenAmountFilled != 0) {
                if (closeAmountNotRecovered != 0) {
                    (destTokenAmountReceived, sourceTokenAmountUsed) = _tradeWithOracle(
                        loanPosition.positionTokenAddressFilled,
                        loanOrder.loanTokenAddress,
                        oracleAddress,
                        loanPosition.positionTokenAmountFilled,
                        closeAmountNotRecovered // maxDestTokenAmount
                    );

                    if (destTokenAmountReceived < closeAmountNotRecovered) {
                        closeAmountNotRecovered = closeAmountNotRecovered - destTokenAmountReceived;
                    } else {
                        closeAmountNotRecovered = 0;
                    }
                    loanPosition.positionTokenAmountFilled = loanPosition.positionTokenAmountFilled.sub(sourceTokenAmountUsed);
                }
            }
        } else {
            if (loanPosition.positionTokenAmountFilled < closeAmountNotRecovered) {
                closeAmountNotRecovered = closeAmountNotRecovered - loanPosition.positionTokenAmountFilled;
                loanPosition.positionTokenAmountFilled = 0;
            } else {
                // we can close all of closeAmountNotRecovered, if here
                closeAmountNotRecovered = 0;
                loanPosition.positionTokenAmountFilled = loanPosition.positionTokenAmountFilled.sub(closeAmount);
            }
        }

        if (marginAmountBeforeClose > loanOrder.maintenanceMarginAmount) {
            // only use collateral if the position doesn't need liquidation
            if (loanPosition.collateralTokenAmountFilled != 0) {
                //sourceTokenAmountUsed = 0;
                if (closeAmountNotRecovered != 0) {
                    // try to recover closeAmount needed from collateral
                    if (loanPosition.collateralTokenAddressFilled != loanOrder.loanTokenAddress) {
                        (destTokenAmountReceived, sourceTokenAmountUsed) = _tradeWithOracle(
                            loanPosition.collateralTokenAddressFilled,
                            loanOrder.loanTokenAddress,
                            oracleAddress,
                            loanPosition.collateralTokenAmountFilled,
                            closeAmountNotRecovered // maxDestTokenAmount
                        );

                        //closeAmountNotRecovered = closeAmountNotRecovered.sub(destTokenAmountReceived);
                        /*loanPosition.collateralTokenAmountFilled = loanPosition.collateralTokenAmountFilled.sub(sourceTokenAmountUsed);

                        if (closeAmountNotRecovered != 0) {
                            // we've closed as much as we can
                            closeAmount = closeAmount.sub(closeAmountNotRecovered);
                        }*/

                        // older code
                        if (destTokenAmountReceived < closeAmountNotRecovered) {
                            // update collateralCloseAmount and closeAmount for the actual amount we will be able to close

                            closeAmountNotRecovered = closeAmountNotRecovered.sub(destTokenAmountReceived);
                            (closeAmount, collateralCloseAmount) = _updateCloseAmounts(
                                closeAmount,
                                collateralCloseAmount,
                                closeAmountNotRecovered
                            );
                        }

                        loanPosition.collateralTokenAmountFilled = loanPosition.collateralTokenAmountFilled.sub(sourceTokenAmountUsed);
                    } else {
                        if (loanPosition.collateralTokenAmountFilled < closeAmountNotRecovered) {
                            // update collateralCloseAmount and closeAmount for the actual amount we will be able to close

                            // older code
                            (closeAmount, collateralCloseAmount) = _updateCloseAmounts(
                                closeAmount,
                                collateralCloseAmount,
                                loanPosition.collateralTokenAmountFilled
                            );

                            //sourceTokenAmountUsed = loanPosition.collateralTokenAmountFilled;
                            //closeAmountNotRecovered = closeAmountNotRecovered.sub(loanPosition.collateralTokenAmountFilled);
                            loanPosition.collateralTokenAmountFilled = 0;

                            // we've closed as much as we can (newer code)
                            //closeAmount = closeAmount.sub(closeAmountNotRecovered);
                        } else {
                            // we can close all of closeAmount, if here
                            //sourceTokenAmountUsed = closeAmountNotRecovered;

                            //closeAmountNotRecovered = 0;
                            loanPosition.collateralTokenAmountFilled = loanPosition.collateralTokenAmountFilled.sub(closeAmountNotRecovered);
                        }
                    }
                }

                if (collateralCloseAmount != 0 &&
                    loanPosition.collateralTokenAmountFilled >= collateralCloseAmount) {
                    // send excess collateral token back to the trader
                    if (!BZxVault(vaultContract).withdrawToken(
                        loanPosition.collateralTokenAddressFilled,
                        msg.sender,
                        collateralCloseAmount
                    )) {
                        revert("BZxLoanHealth::_closeLoanPartially: BZxVault.withdrawToken collateral failed");
                    }
                    loanPosition.collateralTokenAmountFilled = loanPosition.collateralTokenAmountFilled.sub(collateralCloseAmount);
                }
            }
        } else {
            closeAmount = closeAmount.sub(closeAmountNotRecovered);
        }

        require(closeAmount > 0, "closeAmount should not == 0");

        loanPosition.loanTokenAmountFilled = loanPosition.loanTokenAmountFilled.sub(closeAmount);
        //loanPosition.loanTokenAmountUsed = loanPosition.loanTokenAmountUsed.sub(closeAmount); <- not used yet

        _settlePartialClosure(
            loanOrder.loanOrderHash,
            loanOrder.loanTokenAddress,
            loanOrder.loanTokenAmount,
            closeAmount
        );

        reentrancyLock = REENTRANCY_GUARD_FREE; // reentrancy safe at this point
        if (!OracleInterface(oracleAddress).didCloseLoan(
            loanOrder,
            loanPosition,
            msg.sender, // loanCloser
            closeAmount,
            false, // isLiquidation
            gasUsed
        )) {
            revert("BZxLoanHealth::_closeLoanPartially: OracleInterface.didCloseLoan failed");
        }

        return closeAmount;
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
        uint256 loanTokenAmount,
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

        if (orderAux[loanOrderHash].expirationUnixTimestampSec == 0 || block.timestamp < orderAux[loanOrderHash].expirationUnixTimestampSec) {
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
        }
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
