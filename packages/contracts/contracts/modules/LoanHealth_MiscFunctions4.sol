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

    function totalAssetSupply()
        external
        view
        returns (uint256);

    function totalAssetBorrow()
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
        targets[bytes4(keccak256("liquidateWithCollateral(bytes32,address,uint256,address,uint256)"))] = _target;
        targets[bytes4(keccak256("getCloseAmount(bytes32,address)"))] = _target;
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
        LoanOrder storage loanOrder = orders[loanOrderHash];
        require (loanOrder.loanTokenAddress != address(0), "invalid loan");

        LoanPosition storage loanPosition = loanPositions[loanPositionsIds[loanOrderHash][trader]];
        require (loanPosition.loanTokenAmountFilled != 0 && loanPosition.active, "inactive loan");

        return _liquidatePosition(
            BZxVault(vaultContract),
            OracleInterface(oracleAddresses[loanOrder.oracleAddress]),
            loanOrder,
            loanPosition,
            maxCloseAmount
        );
    }

    /// @dev Checks that a position meets the conditions for liquidation, then closes the position and loan (or extends in some cases)
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param trader The trader of the position
    /// @param maxCloseAmount The maximum amount of loan principal to liquidate
    /// @param depositTokenAddress Collateral token supplied by the liquidator (can be any supported asset)
    /// @param depositAmount Collateral amount supplied by the liquidator (amounts are swapped into correct collateral token)
    /// @dev A maxCloseAmount exceeding loanTokenAmountFilled or a maxCloseAmount of 0, will set the maximum to loanTokenAmountFilled.
    /// @return True on success
    function liquidateWithCollateral(
        bytes32 loanOrderHash,
        address trader,
        uint256 maxCloseAmount,
        address depositTokenAddress, // ignored if non-zero and ether is sent with the call
        uint256 depositAmount) // ignored if ether is sent with the call
        external
        payable
        nonReentrant
        tracksGas
        returns (bool result)
    {
        address _depositTokenAddress = depositTokenAddress;
        uint256 _depositAmount = depositAmount;
        if (msg.value != 0) {
            require (_depositTokenAddress != address(0), "ether sent");
            _depositTokenAddress = wethContract;
            _depositAmount = msg.value;
        }

        LoanOrder storage loanOrder = orders[loanOrderHash];
        require (loanOrder.loanTokenAddress != address(0), "invalid loan");

        LoanPosition storage loanPosition = loanPositions[loanPositionsIds[loanOrderHash][trader]];
        require (loanPosition.loanTokenAmountFilled != 0 && loanPosition.active, "inactive loan");

        BZxVault vault = BZxVault(vaultContract);
        OracleInterface oracle = OracleInterface(oracleAddresses[loanOrder.oracleAddress]);

        if (_depositTokenAddress != address(0) && _depositAmount != 0) {
            _depositLiquidationCollateral(
                vault,
                oracle,
                loanPosition,
                _depositTokenAddress,
                _depositAmount
            );
        }

        return _liquidatePosition(
            vault,
            oracle,
            loanOrder,
            loanPosition,
            maxCloseAmount
        );
    }

    function getCloseAmount(
        bytes32 loanOrderHash,
        address trader)
        external
        view
        returns (uint256)
    {
        LoanOrder memory loanOrder = orders[loanOrderHash];
        LoanPosition memory loanPosition = loanPositions[loanPositionsIds[loanOrderHash][trader]];
        OracleInterface oracle = OracleInterface(oracleAddresses[loanOrder.oracleAddress]);

        (uint256 currentMargin, uint256 collateralInEthAmount) = oracle.getCurrentMarginAndCollateralSize(
            loanOrder.loanTokenAddress,
            loanPosition.positionTokenAddressFilled,
            loanPosition.collateralTokenAddressFilled,
            loanPosition.loanTokenAmountFilled,
            loanPosition.positionTokenAmountFilled,
            loanPosition.collateralTokenAmountFilled
        );

        return _getCloseAmount(
            loanOrder,
            loanPosition,
            0, // maxCloseAmount
            currentMargin,
            collateralInEthAmount
        );
    }

    function _getCloseAmount(
        LoanOrder memory loanOrder,
        LoanPosition memory loanPosition,
        uint256 maxCloseAmount,
        uint256 currentMargin,
        uint256 collateralInEthAmount)
        internal
        view
        returns (uint256 closeAmount)
    {
        if (block.timestamp < loanPosition.loanEndUnixTimestampSec) {
            // loan hasn't ended

            if (collateralInEthAmount >= 0.2 ether) {
                uint256 desiredMargin = loanOrder.maintenanceMarginAmount
                    .add(10 ether); // 10 percentage points above maintenance

                if (desiredMargin > loanOrder.initialMarginAmount) {
                    desiredMargin = loanOrder.initialMarginAmount;
                }

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
                // position is too small for partial liquidation
                closeAmount = loanPosition.loanTokenAmountFilled;
            }
        } else {
            // loans passed their end dates will fully closed if possible
            closeAmount = loanPosition.loanTokenAmountFilled;
        }

        if (maxCloseAmount == 0 || maxCloseAmount > loanPosition.loanTokenAmountFilled) {
            closeAmount = Math.min256(closeAmount, loanPosition.loanTokenAmountFilled);
        } else {
            closeAmount = Math.min256(closeAmount, maxCloseAmount);
        }
    }

    function _liquidatePosition(
        BZxVault vault,
        OracleInterface oracle,
        LoanOrder storage loanOrder,
        LoanPosition storage loanPosition,
        uint256 maxCloseAmount)
        internal
        returns (bool result)
    {
        require(msg.sender == tx.origin, "only EOAs can liquidate");

        (uint256 currentMargin, uint256 collateralInEthAmount) = oracle.getCurrentMarginAndCollateralSize(
            loanOrder.loanTokenAddress,
            loanPosition.positionTokenAddressFilled,
            loanPosition.collateralTokenAddressFilled,
            loanPosition.loanTokenAmountFilled,
            loanPosition.positionTokenAmountFilled,
            loanPosition.collateralTokenAmountFilled
        );
        if (currentMargin > loanOrder.maintenanceMarginAmount && block.timestamp < loanPosition.loanEndUnixTimestampSec) {
            revert("loan is healthy");
        }

        if (block.timestamp >= loanPosition.loanEndUnixTimestampSec) {
            // check if we need to roll-over without closing (iToken loans)
            if(collateralInEthAmount >= 0.2 ether && _handleRollOver(
                vault,
                oracle,
                loanOrder,
                loanPosition,
                gasUsed // initial used gas, collected in modifier
            )) {
                return true;
            }
        }

        uint256 closeAmount = _getCloseAmount(
            loanOrder,
            loanPosition,
            maxCloseAmount,
            currentMargin,
            collateralInEthAmount
        );

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
                if (closeAmount == loanPosition.loanTokenAmountFilled) {
                    loanPosition.positionTokenAddressFilled = loanOrder.loanTokenAddress;
                }

                if (loanAmountBought != 0) {
                    closeAmountUsable = loanAmountBought;
                }
            } else {
                // If the position token is not the loan token, then we need to buy back the loan token prior to closing the loan.

                // transfer the current position token to the Oracle contract
                if (!vault.withdrawToken(
                    loanPosition.positionTokenAddressFilled,
                    oracleAddresses[loanOrder.oracleAddress],
                    loanPosition.positionTokenAmountFilled)) {
                    revert("BZxVault.withdrawToken failed");
                }

                uint256 positionTokenAmountUsed;
                (closeAmountUsable, positionTokenAmountUsed) = oracle.liquidatePosition(
                    loanOrder,
                    loanPosition,
                    closeAmount < loanPosition.loanTokenAmountFilled ?
                        closeAmount
                            .sub(loanAmountBought) :
                        MAX_UINT // maxDestTokenAmount
                );

                if (positionTokenAmountUsed == 0) {
                    revert("liquidation not allowed");
                }

                if (loanAmountBought != 0) {
                    closeAmountUsable = closeAmountUsable
                        .add(loanAmountBought);
                }

                if (closeAmount == loanPosition.loanTokenAmountFilled) {
                    if (loanPosition.positionTokenAmountFilled > positionTokenAmountUsed) {
                        // left over sourceToken needs to be dispursed
                        if (!vault.withdrawToken(
                            loanPosition.positionTokenAddressFilled,
                            closeAmountUsable >= loanPosition.loanTokenAmountFilled ? loanPosition.trader : orderLender[loanOrder.loanOrderHash],
                            loanPosition.positionTokenAmountFilled - positionTokenAmountUsed
                        )) {
                            revert("BZxVault.withdrawToken excess failed");
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
            loanPosition.trader, // receiver
            loanOrder,
            loanPosition, // needs to be storage
            closeAmount,
            closeAmountUsable,
            true, // isLiquidation
            gasUsed // initial used gas, collected in modifier
        );
        require(closeAmount != 0, "_finalizeLoan failed");

        return true;
    }

    function _depositLiquidationCollateral(
        BZxVault vault,
        OracleInterface oracle,
        LoanPosition storage loanPosition,
        address depositTokenAddress,
        uint256 depositAmount)
        internal
    {
        bool success;
        if (msg.value != 0) {
            // depositTokenAddress already == wethContract
            // depositAmount already == msg.value

            // deposit()
            (success,) = depositTokenAddress.call.value(depositAmount)("0xd0e30db0");
            if (success) {
                success = EIP20(depositTokenAddress).transfer(
                    depositTokenAddress != loanPosition.collateralTokenAddressFilled ?
                        address(oracle) : // swap needed at oracle
                        address(vault),
                    depositAmount
                );
            }
        } else {
            success = vault.transferTokenFrom(
                depositTokenAddress,
                msg.sender,
                depositTokenAddress != loanPosition.collateralTokenAddressFilled ?
                    address(oracle) : // swap needed at oracle
                    address(vault),
                depositAmount
            );
        }
        require(success, "deposit failed");

        uint256 collateralTokenAmountReceived;
        if (depositTokenAddress != loanPosition.collateralTokenAddressFilled) {
            uint256 depositTokenAmountUsed;
            (collateralTokenAmountReceived, depositTokenAmountUsed) = oracle.trade(
                depositTokenAddress,
                loanPosition.collateralTokenAddressFilled,
                depositAmount,
                MAX_UINT);

            require(collateralTokenAmountReceived != 0 && collateralTokenAmountReceived != MAX_UINT, "collateralTokenAmountReceived == 0");

            if (depositTokenAmountUsed < depositAmount) {
                // left over depositToken needs to be refunded to trader
                require(vault.withdrawToken(
                    depositTokenAddress,
                    msg.sender,
                    depositAmount - depositTokenAmountUsed),
                    "refund failed"
                );
            }
        } else {
            collateralTokenAmountReceived = depositAmount;
        }
        loanPosition.collateralTokenAmountFilled = loanPosition.collateralTokenAmountFilled.add(collateralTokenAmountReceived);
    }

    function _verifyiToken(
        address lender)
        internal
        view
        returns (bool result)
    {
        bytes32 slot = keccak256(abi.encodePacked("LenderIsiToken", lender));
        assembly {
            result := sload(slot)
        }
    }

    function _processCollateral(
        BZxVault vault,
        OracleInterface oracle,
        LoanOrder storage loanOrder,
        LoanPosition storage loanPosition,
        uint256 interestAmountRequired,
        uint256 gasUsed)
        internal
        //returns (bool didCollectReserve)
    {
        require (vault.withdrawToken(
            loanPosition.collateralTokenAddressFilled,
            address(oracle),
            loanPosition.collateralTokenAmountFilled),
            "withdraw failed"
        );

         // loanTokenAmountCovered, collateralTokenAmountUsed, reserve
        uint256[3] memory returnValues = oracle.processCollateral(
            loanOrder,
            loanPosition,
            interestAmountRequired,
            gasUsed,
            msg.sender,
            true // isLiquidation
        );
        //didCollectReserve = reserve != 0;

        require (returnValues[0] >= interestAmountRequired && returnValues[0] != MAX_UINT, "can't fill interest");

        loanPosition.collateralTokenAmountFilled = loanPosition.collateralTokenAmountFilled
            .sub(returnValues[1]);
    }

    function _handleRollOver(
        BZxVault vault,
        OracleInterface oracle,
        LoanOrder storage loanOrder,
        LoanPosition storage loanPosition,
        uint256 gasUsed)
        internal
        returns (bool)
    {
        // require(block.timestamp >= loanPosition.loanEndUnixTimestampSec, "loan hasn't ended"); <-- verified earlier

        address lender = orderLender[loanOrder.loanOrderHash];

        if (!_verifyiToken(lender)) {
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
                .sub(traderInterest.interestUpdatedDate);
            traderInterest.interestPaid = traderInterest.interestPaid
                .mul(traderInterest.interestOwedPerDay);
            traderInterest.interestPaid = traderInterest.interestPaid
                .div(86400);
            traderInterest.interestPaid = traderInterest.interestPaid
                .add(traderInterest.interestPaid);
        }

        uint256 maxDuration = loanOrder.maxDurationUnixTimestampSec;

        uint256 owedPerDay;
        if (maxDuration != 0) {
            // fixed-term loan, so need to query iToken for latest variable rate
            // loanOrder.loanTokenAmount doesn't change
            loanOrder.interestAmount = loanOrder.loanTokenAmount
                .mul(
                    ILoanToken(lender).borrowInterestRate()
                );
            require(loanOrder.interestAmount != 0, "invalid rate");

            loanOrder.interestAmount = loanOrder.interestAmount
                .div(365 * 10**20);

            owedPerDay = loanPosition.loanTokenAmountFilled
                .mul(loanOrder.interestAmount);
            owedPerDay = owedPerDay
                .div(loanOrder.loanTokenAmount);

            oracleInterest.interestOwedPerDay = oracleInterest.interestOwedPerDay
                .add(owedPerDay);
            oracleInterest.interestOwedPerDay = oracleInterest.interestOwedPerDay
                .sub(traderInterest.interestOwedPerDay);

            traderInterest.interestOwedPerDay = owedPerDay;
        } else {
            // indefinite-term loan, so need to query iToken to check for a distressed loan pool
            uint256 utilRate = ILoanToken(lender).totalAssetBorrow()
                .mul(10**20)
                .div(ILoanToken(lender).totalAssetSupply());
            if (utilRate >= 95 ether) {
                return false;
            }

            owedPerDay = traderInterest.interestOwedPerDay;

            maxDuration = 2628000; // approx. 1 month
        }

        // update loan end time
        loanPosition.loanEndUnixTimestampSec = block.timestamp.add(maxDuration);

        uint256 interestAmountRequired = maxDuration
            .mul(owedPerDay);
        interestAmountRequired = interestAmountRequired
            .div(86400);

        // ensure the loan is still healthy
        /*require (!OracleInterface(oracle)
            .shouldLiquidate(loanOrder, loanPosition),
            "unhealthy"
        );*/

        traderInterest.interestDepositTotal = traderInterest.interestDepositTotal.add(interestAmountRequired);
        traderInterest.interestUpdatedDate = block.timestamp;

        tokenInterestOwed[lender][loanOrder.interestTokenAddress] = tokenInterestOwed[lender][loanOrder.interestTokenAddress].add(interestAmountRequired);

        _processCollateral(
            vault,
            oracle,
            loanOrder,
            loanPosition,
            interestAmountRequired,
            gasUsed
        );

        return true;
    }
}
