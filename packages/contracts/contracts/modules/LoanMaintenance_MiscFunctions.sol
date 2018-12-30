/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.2;
pragma experimental ABIEncoderV2;

import "../openzeppelin-solidity/Math.sol";

import "../proxy/BZxProxiable.sol";
import "../shared/MiscFunctions.sol";

import "../BZxVault.sol";
import "../oracle/OracleInterface.sol";


contract LoanMaintenance_MiscFunctions is BZxStorage, BZxProxiable, MiscFunctions {
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
        targets[bytes4(keccak256("depositCollateral(bytes32,address,uint256)"))] = _target;
        targets[bytes4(keccak256("withdrawCollateral(bytes32,address,uint256)"))] = _target;
        targets[bytes4(keccak256("changeCollateral(bytes32,address)"))] = _target;
        targets[bytes4(keccak256("withdrawPosition(bytes32,uint256)"))] = _target;
        targets[bytes4(keccak256("depositPosition(bytes32,address,uint256)"))] = _target;
        targets[bytes4(keccak256("getPositionOffset(bytes32,address)"))] = _target;
    }

    /// @dev Allows the trader to increase the collateral for a loan.
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param collateralTokenFilled The address of the collateral token used.
    /// @param depositAmount The amount of additional collateral token to deposit.
    /// @return True on success
    function depositCollateral(
        bytes32 loanOrderHash,
        address collateralTokenFilled,
        uint256 depositAmount)
        external
        nonReentrant
        tracksGas
        returns (bool)
    {
        require(depositAmount > 0, "BZxLoanHealth::depositCollateral: depositAmount too low");
        
        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.loanTokenAddress == address(0)) {
            revert("BZxLoanHealth::depositCollateral: loanOrder.loanTokenAddress == address(0)");
        }

        LoanPosition storage loanPosition = loanPositions[loanPositionsIds[loanOrderHash][msg.sender]];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            revert("BZxLoanHealth::depositCollateral: loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active");
        }

        if (block.timestamp >= loanPosition.loanEndUnixTimestampSec) {
            revert("BZxLoanHealth::depositCollateral: block.timestamp >= loanPosition.loanEndUnixTimestampSec");
        }

        if (collateralTokenFilled != loanPosition.collateralTokenAddressFilled) {
            revert("BZxLoanHealth::depositCollateral: collateralTokenFilled != loanPosition.collateralTokenAddressFilled");
        }

        if (! BZxVault(vaultContract).depositToken(
            collateralTokenFilled,
            msg.sender,
            depositAmount
        )) {
            revert("BZxLoanHealth::depositCollateral: BZxVault.depositToken collateral failed");
        }

        loanPosition.collateralTokenAmountFilled = loanPosition.collateralTokenAmountFilled.add(depositAmount);

        if (! OracleInterface(oracleAddresses[loanOrder.oracleAddress]).didDepositCollateral(
            loanOrder,
            loanPosition,
            depositAmount,
            gasUsed // initial used gas, collected in modifier
        )) {
            revert("BZxLoanHealth::depositCollateral: OracleInterface.didDepositCollateral failed");
        }

        return true;
    }

    /// @dev Allows the trader to withdraw excess collateral for a loan.
    /// @dev Excess collateral is any amount above the initial margin.
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param collateralTokenFilled The address of the collateral token used.
    /// @return excessCollateral The amount of excess collateral token to withdraw. The actual amount withdrawn will be less if there's less excess.
    function withdrawCollateral(
        bytes32 loanOrderHash,
        address collateralTokenFilled,
        uint256 withdrawAmount)
        external
        nonReentrant
        tracksGas
        returns (uint256 excessCollateral)
    {
        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.loanTokenAddress == address(0)) {
            revert("BZxLoanHealth::withdrawCollateral: loanOrder.loanTokenAddress == address(0)");
        }

        LoanPosition storage loanPosition = loanPositions[loanPositionsIds[loanOrderHash][msg.sender]];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            revert("BZxLoanHealth::withdrawCollateral: loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active");
        }

        if (collateralTokenFilled != loanPosition.collateralTokenAddressFilled) {
            revert("BZxLoanHealth::withdrawCollateral: collateralTokenFilled != loanPosition.collateralTokenAddressFilled");
        }

        uint256 positionToLoanTokenAmount;
        if (loanPosition.positionTokenAddressFilled == loanOrder.loanTokenAddress) {
            positionToLoanTokenAmount = loanPosition.positionTokenAmountFilled;
        } else {
            (, positionToLoanTokenAmount) = OracleInterface(oracleAddresses[loanOrder.oracleAddress]).getTradeData(
                loanPosition.positionTokenAddressFilled,
                loanOrder.loanTokenAddress,
                loanPosition.positionTokenAmountFilled);
        }

        uint256 positionOffsetForCollateral = positionToLoanTokenAmount < loanPosition.loanTokenAmountFilled ?
            (loanPosition.loanTokenAmountFilled - positionToLoanTokenAmount).mul(10**20).div(loanOrder.initialMarginAmount) :
            (positionToLoanTokenAmount - loanPosition.loanTokenAmountFilled).mul(10**20).div(loanOrder.initialMarginAmount);

        uint256 initialCollateralTokenAmount;
        if (positionToLoanTokenAmount >= loanPosition.loanTokenAmountFilled && positionOffsetForCollateral >= loanPosition.loanTokenAmountFilled) {
            initialCollateralTokenAmount = 0;
        } else {
            initialCollateralTokenAmount = _getCollateralRequired(
                loanOrder.loanTokenAddress,
                loanPosition.collateralTokenAddressFilled,
                oracleAddresses[loanOrder.oracleAddress],
                positionToLoanTokenAmount < loanPosition.loanTokenAmountFilled ?
                    loanPosition.loanTokenAmountFilled.add(positionOffsetForCollateral) :
                    loanPosition.loanTokenAmountFilled.sub(positionOffsetForCollateral),
                loanOrder.initialMarginAmount
            );
        }

        if (initialCollateralTokenAmount >= loanPosition.collateralTokenAmountFilled) {
            return 0;
        }
        
        excessCollateral = Math.min256(withdrawAmount, loanPosition.collateralTokenAmountFilled-initialCollateralTokenAmount);

        // transfer excess collateral to trader
        if (! BZxVault(vaultContract).withdrawToken(
            loanPosition.collateralTokenAddressFilled,
            msg.sender,
            excessCollateral
        )) {
            revert("BZxLoanHealth::withdrawCollateral: BZxVault.withdrawToken collateral failed");
        }

        // update stored collateral amount
        loanPosition.collateralTokenAmountFilled = loanPosition.collateralTokenAmountFilled.sub(excessCollateral);

        if (! OracleInterface(oracleAddresses[loanOrder.oracleAddress]).didWithdrawCollateral(
            loanOrder,
            loanPosition,
            excessCollateral,
            gasUsed // initial used gas, collected in modifier
        )) {
            revert("BZxLoanHealth::withdrawCollateral: OracleInterface.didWithdrawCollateral failed");
        }

        return excessCollateral;
    }

    /// @dev Allows the trader to change the collateral token being used for a loan.
    /// @dev This function will transfer in the initial margin requirement of the new token and the old token will be refunded to the trader.
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param collateralTokenFilled The address of the collateral token used.
    /// @return collateralTokenAmountFilled The amount of new collateral token filled
    function changeCollateral(
        bytes32 loanOrderHash,
        address collateralTokenFilled)
        external
        nonReentrant
        tracksGas
        returns (uint256 collateralTokenAmountFilled)
    {
        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.loanTokenAddress == address(0)) {
            revert("BZxLoanHealth::changeCollateral: loanOrder.loanTokenAddress == address(0)");
        }

        LoanPosition storage loanPosition = loanPositions[loanPositionsIds[loanOrderHash][msg.sender]];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            revert("BZxLoanHealth::changeCollateral: loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active");
        }

        if (collateralTokenFilled == address(0) || collateralTokenFilled == loanPosition.collateralTokenAddressFilled) {
            revert("BZxLoanHealth::changeCollateral: collateralTokenFilled == address(0) || collateralTokenFilled == loanPosition.collateralTokenAddressFilled");
        }

        if (block.timestamp >= loanPosition.loanEndUnixTimestampSec) {
            revert("BZxLoanHealth::changeCollateral: block.timestamp >= loanPosition.loanEndUnixTimestampSec");
        }

        uint256 positionToLoanTokenAmount;
        if (loanPosition.positionTokenAddressFilled == loanOrder.loanTokenAddress) {
            positionToLoanTokenAmount = loanPosition.positionTokenAmountFilled;
        } else {
            (, positionToLoanTokenAmount) = OracleInterface(oracleAddresses[loanOrder.oracleAddress]).getTradeData(
                loanPosition.positionTokenAddressFilled,
                loanOrder.loanTokenAddress,
                loanPosition.positionTokenAmountFilled);
        }

        uint256 positionOffsetForCollateral = positionToLoanTokenAmount < loanPosition.loanTokenAmountFilled ?
            (loanPosition.loanTokenAmountFilled - positionToLoanTokenAmount).mul(10**20).div(loanOrder.initialMarginAmount) :
            (positionToLoanTokenAmount - loanPosition.loanTokenAmountFilled).mul(10**20).div(loanOrder.initialMarginAmount);

        // the new collateral amount must be enough to satify the initial margin requirement of the loan
        if (positionToLoanTokenAmount >= loanPosition.loanTokenAmountFilled && positionOffsetForCollateral >= loanPosition.loanTokenAmountFilled) {
            collateralTokenAmountFilled = 0;
        } else {
            collateralTokenAmountFilled = _getCollateralRequired(
                loanOrder.loanTokenAddress,
                collateralTokenFilled,
                oracleAddresses[loanOrder.oracleAddress],
                positionToLoanTokenAmount < loanPosition.loanTokenAmountFilled ?
                    loanPosition.loanTokenAmountFilled.add(positionOffsetForCollateral) :
                    loanPosition.loanTokenAmountFilled.sub(positionOffsetForCollateral),
                loanOrder.initialMarginAmount
            );
        }

        if (collateralTokenAmountFilled > 0) {
            // transfer the new collateral token from the trader to the vault
            if (! BZxVault(vaultContract).depositToken(
                collateralTokenFilled,
                msg.sender,
                collateralTokenAmountFilled
            )) {
                revert("BZxLoanHealth::changeCollateral: BZxVault.depositToken new collateral failed");
            }
        }

        // transfer the old collateral token from the vault to the trader
        if (! BZxVault(vaultContract).withdrawToken(
            loanPosition.collateralTokenAddressFilled,
            msg.sender,
            loanPosition.collateralTokenAmountFilled
        )) {
            revert("BZxLoanHealth::changeCollateral: BZxVault.withdrawToken old collateral failed");
        }

        loanPosition.collateralTokenAddressFilled = collateralTokenFilled;
        loanPosition.collateralTokenAmountFilled = collateralTokenAmountFilled;

        if (! OracleInterface(oracleAddresses[loanOrder.oracleAddress]).didChangeCollateral(
            loanOrder,
            loanPosition,
            gasUsed // initial used gas, collected in modifier
        )) {
            revert("BZxLoanHealth::changeCollateral: OracleInterface.didChangeCollateral failed");
        }

        return collateralTokenAmountFilled;
    }

    /// @dev Allows the trader to return the position/loan token to increase their escrowed balance
    /// @dev This should be used by the trader if they've withdraw an overcollateralized loan
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param depositTokenAddress The address of the position token being returned
    /// @param depositAmount The amount of position token to deposit.
    /// @return True on success
    function depositPosition(
        bytes32 loanOrderHash,
        address depositTokenAddress,
        uint256 depositAmount)
        external
        nonReentrant
        tracksGas
        returns (bool)
    {
        require(depositAmount > 0, "BZxLoanHealth::depositPosition: depositAmount too low");
        
        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.loanTokenAddress == address(0)) {
            revert("BZxLoanHealth::depositPosition: loanOrder.loanTokenAddress == address(0)");
        }

        LoanPosition storage loanPosition = loanPositions[loanPositionsIds[loanOrderHash][msg.sender]];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            revert("BZxLoanHealth::depositPosition: loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active");
        }

        uint256 positionTokenAmountReceived;
        if (depositTokenAddress != loanPosition.positionTokenAddressFilled) {
            // send deposit token directly to the oracle to trade it
            if (!BZxVault(vaultContract).transferTokenFrom(
                depositTokenAddress,
                msg.sender,
                oracleAddresses[loanOrder.oracleAddress],
                depositAmount)) {
                revert("BZxLoanHealth::depositPosition: BZxVault.transferTokenFrom failed");
            }
            
            uint256 depositTokenAmountUsed;
            (positionTokenAmountReceived, depositTokenAmountUsed) = OracleInterface(oracleAddresses[loanOrder.oracleAddress]).trade(
                depositTokenAddress,
                loanPosition.positionTokenAddressFilled,
                depositAmount,
                MAX_UINT);

            if (positionTokenAmountReceived == 0) {
                revert("BZxLoanHealth::depositPosition: positionTokenAmountReceived == 0");
            }

            if (depositTokenAmountUsed < depositAmount) {
                // left over depositToken needs to be refunded to trader
                if (! BZxVault(vaultContract).withdrawToken(
                    depositTokenAddress,
                    msg.sender,
                    depositAmount.sub(depositTokenAmountUsed)
                )) {
                    revert("BZxLoanHealth::depositPosition: BZxVault.withdrawToken deposit failed");
                }
            }

            loanPosition.positionTokenAmountFilled = loanPosition.positionTokenAmountFilled.add(positionTokenAmountReceived);
        } else {
            // send deposit token to the value
            if (! BZxVault(vaultContract).depositToken(
                depositTokenAddress,
                msg.sender,
                depositAmount
            )) {
                revert("BZxLoanHealth::depositPosition: BZxVault.depositToken position failed");
            }

            loanPosition.positionTokenAmountFilled = loanPosition.positionTokenAmountFilled.add(depositAmount);
            positionTokenAmountReceived = depositAmount;
        }

        if (! OracleInterface(oracleAddresses[loanOrder.oracleAddress]).didDepositPosition(
            loanOrder,
            loanPosition,
            positionTokenAmountReceived,
            gasUsed // initial used gas, collected in modifier
        )) {
            revert("BZxLoanHealth::depositPosition: OracleInterface.didDepositPosition failed");
        }

        return true;
    }

    /// @dev Allows the trader to withdraw any amount in excess of their loan principal
    /// @dev The trader will only be able to withdraw an amount the keeps the loan at or above initial margin
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param withdrawAmount The amount to withdraw
    /// @return amountWithdrawn The amount withdrawn denominated in positionToken. Can be less than withdrawAmount.
    function withdrawPosition(
        bytes32 loanOrderHash,
        uint256 withdrawAmount)
        external
        nonReentrant
        tracksGas
        returns (uint256 amountWithdrawn)
    {
        LoanOrder memory loanOrder = orders[loanOrderHash];
        LoanPosition storage loanPosition = loanPositions[loanPositionsIds[loanOrderHash][msg.sender]];

        bool isPositive;
        (isPositive, amountWithdrawn,) = _getPositionOffset(
            loanOrder,
            loanPosition);
        if (amountWithdrawn == 0 || !isPositive) {
            revert("BZxLoanHealth::withdrawPosition: amountWithdrawn == 0 || !isPositive");
        }

        // Withdraw withdrawAmount or amountWithdrawn, whichever is lessor
        amountWithdrawn = Math.min256(withdrawAmount, amountWithdrawn);

        // transfer position excess to the trader
        if (! BZxVault(vaultContract).withdrawToken(
            loanPosition.positionTokenAddressFilled,
            msg.sender,
            amountWithdrawn
        )) {
            revert("BZxLoanHealth::withdrawPosition: BZxVault.withdrawToken loan failed");
        }

        // deduct position excess from positionToken balance
        loanPosition.positionTokenAmountFilled = loanPosition.positionTokenAmountFilled.sub(amountWithdrawn);

        if (! OracleInterface(oracleAddresses[loanOrder.oracleAddress]).didWithdrawPosition(
            loanOrder,
            loanPosition,
            amountWithdrawn,
            gasUsed // initial used gas, collected in modifier
        )) {
            revert("BZxLoanHealth::withdrawPosition: OracleInterface.didWithdrawPosition failed");
        }

        emit LogWithdrawPosition(
            loanOrder.loanOrderHash,
            msg.sender,
            amountWithdrawn,
            loanPosition.positionTokenAmountFilled,
            loanPosition.positionId
        );

        return amountWithdrawn;
    }

    /*
    * Constant public functions
    */
    /// @dev Get the current excess or deficit position amount from the loan principal
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param trader The trader of the position
    /// @return isPositive False it there's a deficit, True otherwise
    /// @return offsetAmount The amount of excess or deficit
    /// @return positionTokenAddress The position token current filled, which could be the same as the loanToken
    function getPositionOffset(
        bytes32 loanOrderHash,
        address trader)
        public
        view
        returns (bool isPositive, uint256 offsetAmount, address positionTokenAddress)
    {
        LoanOrder memory loanOrder = orders[loanOrderHash];
        LoanPosition memory loanPosition = loanPositions[loanPositionsIds[loanOrderHash][trader]];

        return _getPositionOffset(
            loanOrder,
            loanPosition);
    }

    /*
    * Constant Internal functions
    */
    function _getPositionOffset(
        LoanOrder memory loanOrder,
        LoanPosition memory loanPosition)
        internal
        view
        returns (bool isPositive, uint256 offsetAmount, address positionTokenAddress)
    {
        if (loanOrder.loanTokenAddress == address(0)) {
            return (false,0,address(0));
        }

        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            return (false,0,address(0));
        }

        (isPositive, offsetAmount) = OracleInterface(oracleAddresses[loanOrder.oracleAddress]).getPositionOffset(loanOrder, loanPosition);

        positionTokenAddress = loanPosition.positionTokenAddressFilled;
    }

}
