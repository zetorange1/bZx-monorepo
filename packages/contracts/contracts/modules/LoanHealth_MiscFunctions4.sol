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


interface ILoanToken {
    function borrowInterestRate()
        external
        view
        returns (uint256);
}

contract LoanHealth_MiscFunctions4 is BZxStorage, BZxProxiable, OrderClosingFunctions {
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
        targets[bytes4(keccak256("liquidatePosition(bytes32,address,uint256)"))] = _target;
    }

    function _handleRollOver(
        LoanOrder storage loanOrder,
        LoanPosition storage loanPosition)
        internal
        returns (bool result)
    {
        require(block.timestamp >= loanPosition.loanEndUnixTimestampSec, "loan hasn't ended");

        address lender = orderLender[loanOrder.loanOrderHash];

        bytes32 slot = keccak256(abi.encodePacked("LenderIsiToken", lender));
        assembly {
            result := sload(slot)
        }
        if (!result) {
            return false;
        }

        LenderInterest storage oracleInterest = lenderOracleInterest[lender][loanOrder.oracleAddress][loanOrder.interestTokenAddress];
        TraderInterest storage traderInterest = traderLoanInterest[loanPosition.positionId];

        // update lender interest
        _payInterestForOracle(
            oracleInterest,
            lender,
            loanOrder.oracleAddress,
            loanOrder.interestTokenAddress,
            true // sendToOracle
        );

        if (traderInterest.interestUpdatedDate != 0 && traderInterest.interestOwedPerDay != 0) {
            traderInterest.interestPaid = loanPosition.loanEndUnixTimestampSec
                .sub(traderInterest.interestUpdatedDate)
                .mul(traderInterest.interestOwedPerDay)
                .div(86400)
                .add(traderInterest.interestPaid);
        }

        uint256 maxDuration = loanOrder.maxDurationUnixTimestampSec;

        uint256 owedPerDay;
        if (maxDuration != 0) {
            // fixed-term loan, so need to query iToken for latest variable rate
            uint256 newRate = ILoanToken(lender).borrowInterestRate();
            require(newRate != 0, "invalid rate");

            // loanOrder.loanTokenAmount doesn't change

            loanOrder.interestAmount = loanOrder.loanTokenAmount
                .mul(newRate);
            loanOrder.interestAmount = loanOrder.interestAmount
                .div(365 * 10**20);

            owedPerDay = SafeMath.div(
                SafeMath.mul(loanPosition.loanTokenAmountFilled, loanOrder.interestAmount),
                loanOrder.loanTokenAmount
            );

            oracleInterest.interestOwedPerDay = oracleInterest.interestOwedPerDay
                .add(owedPerDay)
                .sub(traderInterest.interestOwedPerDay);

            traderInterest.interestOwedPerDay = owedPerDay;
        } else {
            // indefinite-term loan
            owedPerDay = traderInterest.interestOwedPerDay;

            maxDuration = 2628000; // approx. 1 month
        }

        // update loan end time
        loanPosition.loanEndUnixTimestampSec = block.timestamp.add(maxDuration);

        uint256 interestAmountRequired = maxDuration
            .mul(owedPerDay)
            .div(86400);

        // spend collateral to top-up interest
        uint256 sourceTokenAmountUsed;
        if (loanPosition.collateralTokenAddressFilled == loanOrder.interestTokenAddress) {
            require (loanPosition.collateralTokenAmountFilled > interestAmountRequired, "can't fill interest");
            sourceTokenAmountUsed = interestAmountRequired;
        } else {
            address oracle = oracleAddresses[loanOrder.oracleAddress];

            require (BZxVault(vaultContract).withdrawToken(
                loanPosition.collateralTokenAddressFilled,
                oracle,
                loanPosition.collateralTokenAmountFilled),
                "withdraw failed"
            );
            uint256 destTokenAmountReceived;
            (destTokenAmountReceived, sourceTokenAmountUsed) = OracleInterface(oracle).trade(
                loanPosition.collateralTokenAddressFilled,
                loanOrder.interestTokenAddress,
                loanPosition.collateralTokenAmountFilled,
                interestAmountRequired
            );
            require (destTokenAmountReceived >= interestAmountRequired && destTokenAmountReceived != MAX_UINT, "can't fill interest");
        }

        loanPosition.collateralTokenAmountFilled = loanPosition.collateralTokenAmountFilled
            .sub(sourceTokenAmountUsed);

        // ensure the loan is still healthy
        /*require (!OracleInterface(oracle)
            .shouldLiquidate(loanOrder, loanPosition),
            "unhealthy"
        );*/

        traderInterest.interestDepositTotal = traderInterest.interestDepositTotal.add(interestAmountRequired);
        traderInterest.interestUpdatedDate = block.timestamp;

        tokenInterestOwed[lender][loanOrder.interestTokenAddress] = tokenInterestOwed[lender][loanOrder.interestTokenAddress].add(interestAmountRequired);

        return true;
    }

    /// @dev Checks that a position meets the conditions for liquidation, then closes the position and loan (or extends in some cases)
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param trader The trader of the position
    /// @param maxCloseAmount The maximum amount of loan principal to liquidate
    /// @dev A maxCloseAmount exceeding loanTokenAmountFilled or a maxCloseAmount of 0, will set the maximum to loanTokenAmountFilled.
    /// @return True on success
    function liquidatePosition(
        bytes32 loanOrderHash,
        address trader,
        uint256 maxCloseAmount)
        external
        nonReentrant
        tracksGas
        returns (bool result)
    {
        require(trader != msg.sender, "BZxLoanHealth::liquidatePosition: trader can't liquidate");
        require(msg.sender == tx.origin, "BZxLoanHealth::liquidatePosition: only EOAs can liquidate");

        LoanPosition storage loanPosition = loanPositions[loanPositionsIds[loanOrderHash][trader]];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            revert("BZxLoanHealth::liquidatePosition: loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active");
        }

        LoanOrder storage loanOrder = orders[loanOrderHash];
        if (loanOrder.loanTokenAddress == address(0)) {
            revert("BZxLoanHealth::liquidatePosition: loanOrder.loanTokenAddress == address(0)");
        }

        uint256 currentMargin = OracleInterface(oracleAddresses[loanOrder.oracleAddress]).getCurrentMarginAmount(
            loanOrder.loanTokenAddress,
            loanPosition.positionTokenAddressFilled,
            loanPosition.collateralTokenAddressFilled,
            loanPosition.loanTokenAmountFilled,
            loanPosition.positionTokenAmountFilled,
            loanPosition.collateralTokenAmountFilled
        );
        if (!DEBUG_MODE && block.timestamp < loanPosition.loanEndUnixTimestampSec && currentMargin > loanOrder.maintenanceMarginAmount) {
            revert("BZxLoanHealth::liquidatePosition: loan is healthy");
        }

        uint256 closeAmount;

        if ((!DEBUG_MODE && block.timestamp < loanPosition.loanEndUnixTimestampSec) ||
            (DEBUG_MODE && currentMargin <= loanOrder.maintenanceMarginAmount)) {
            // loan hasn't ended

            uint256 desiredMargin = loanOrder.maintenanceMarginAmount
                .add(10 ether); // 10 percentage points above maintenance

            uint256 normalizedCollateral = currentMargin
                .mul(loanPosition.loanTokenAmountFilled)
                .div(desiredMargin);

            if (loanPosition.loanTokenAmountFilled > normalizedCollateral) {
                closeAmount = loanPosition.loanTokenAmountFilled
                    .sub(normalizedCollateral);
            } else {
                closeAmount = loanPosition.loanTokenAmountFilled;
            }
        } else {
            // check if we need to roll-over without closing (iToken loans)
            if(_handleRollOver(
                loanOrder,
                loanPosition
            )) {
                return true;
            }

            // loans passed their end dates will fully closed if possible
            closeAmount = loanPosition.loanTokenAmountFilled;
        }

        if (maxCloseAmount == 0 || maxCloseAmount > loanPosition.loanTokenAmountFilled) {
            closeAmount = Math.min256(closeAmount, loanPosition.loanTokenAmountFilled);
        } else {
            closeAmount = Math.min256(closeAmount, maxCloseAmount);
        }

        uint256 loanAmountBought;
        if (loanOrder.interestAmount != 0) {
            (loanAmountBought,) = _settleInterest(
                loanOrder,
                loanPosition,
                closeAmount,
                true, // sendToOracle
                true  // refundToCollateral
            );
        }

        uint256 closeAmountUsable;

        if (loanPosition.positionTokenAddressFilled != loanOrder.loanTokenAddress) {
            if (loanPosition.positionTokenAmountFilled == 0) {
                loanPosition.positionTokenAddressFilled = loanOrder.loanTokenAddress;

                if (loanAmountBought != 0) {
                    closeAmountUsable = loanAmountBought;
                }
            } else {
                // If the position token is not the loan token, then we need to buy back the loan token prior to closing the loan.

                // transfer the current position token to the Oracle contract
                if (!BZxVault(vaultContract).withdrawToken(
                    loanPosition.positionTokenAddressFilled,
                    oracleAddresses[loanOrder.oracleAddress],
                    loanPosition.positionTokenAmountFilled)) {
                    revert("MiscFunctions::liquidatePosition: BZxVault.withdrawToken failed");
                }

                uint256 positionTokenAmountUsed;
                (closeAmountUsable, positionTokenAmountUsed) = OracleInterface(oracleAddresses[loanOrder.oracleAddress]).liquidatePosition(
                    loanOrder,
                    loanPosition,
                    closeAmount < loanPosition.loanTokenAmountFilled ?
                        closeAmount
                            .sub(loanAmountBought) :
                        MAX_UINT // maxDestTokenAmount
                );

                if (positionTokenAmountUsed == 0) {
                    revert("BZxLoanHealth::liquidatePosition: liquidation not allowed");
                }

                if (loanAmountBought != 0) {
                    closeAmountUsable = closeAmountUsable
                        .add(loanAmountBought);
                }

                if (closeAmount == loanPosition.loanTokenAmountFilled) {
                    if (loanPosition.positionTokenAmountFilled > positionTokenAmountUsed) {
                        // left over sourceToken needs to be dispursed
                        if (!BZxVault(vaultContract).withdrawToken(
                            loanPosition.positionTokenAddressFilled,
                            closeAmountUsable >= loanPosition.loanTokenAmountFilled ? loanPosition.trader : orderLender[loanOrderHash],
                            loanPosition.positionTokenAmountFilled.sub(positionTokenAmountUsed)
                        )) {
                            revert("BZxLoanHealth::liquidatePosition: BZxVault.withdrawToken excess failed");
                        }
                    }

                    // the loan token becomes the new position token
                    loanPosition.positionTokenAddressFilled = loanOrder.loanTokenAddress;
                    loanPosition.positionTokenAmountFilled = closeAmountUsable;
                } else {
                    loanPosition.positionTokenAmountFilled = loanPosition.positionTokenAmountFilled.sub(positionTokenAmountUsed);
                }
            }
        } else {
            if (loanPosition.positionTokenAmountFilled > closeAmount) {
                closeAmountUsable = closeAmount;
                loanPosition.positionTokenAmountFilled = loanPosition.positionTokenAmountFilled.sub(closeAmount);
            } else {
                closeAmountUsable = loanPosition.positionTokenAmountFilled;
                loanPosition.positionTokenAmountFilled = 0;
            }

            if (loanAmountBought != 0) {
                closeAmountUsable = closeAmountUsable
                    .add(loanAmountBought);
            }
        }

        (closeAmount,) = _finalizeLoan(
            trader, // receiver
            loanOrder,
            loanPosition, // needs to be storage
            closeAmount,
            closeAmountUsable,
            true, // isLiquidation
            gasUsed // initial used gas, collected in modifier
        );
        require(closeAmount != 0, "BZxLoanHealth::liquidatePosition: _finalizeLoan failed");

        return true;
    }
}
