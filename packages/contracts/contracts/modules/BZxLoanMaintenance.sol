/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.4.25;
pragma experimental ABIEncoderV2;

import "openzeppelin-solidity/contracts/math/Math.sol";

import "../proxy/BZxProxiable.sol";
import "../shared/InternalFunctions.sol";

import "../BZxVault.sol";
import "../oracle/OracleInterface.sol";


contract BZxLoanMaintenance is BZxStorage, BZxProxiable, InternalFunctions {
    using SafeMath for uint256;

    constructor() public {}

    function()  
        public
    {
        revert("fallback not allowed");
    }

    function initialize(
        address _target)
        public
        onlyOwner
    {
        targets[bytes4(keccak256("depositCollateral(bytes32,address,uint256)"))] = _target;
        targets[bytes4(keccak256("withdrawExcessCollateral(bytes32,address,uint256)"))] = _target;
        targets[bytes4(keccak256("changeCollateral(bytes32,address)"))] = _target;
        targets[bytes4(keccak256("withdrawPosition(bytes32)"))] = _target;
        targets[bytes4(keccak256("depositPosition(bytes32,address,uint256)"))] = _target;
        targets[bytes4(keccak256("withdrawProfit(bytes32)"))] = _target;
        targets[bytes4(keccak256("getProfitOrLoss(bytes32,address)"))] = _target;
    }

    /// @dev Allows the trader to increase the collateral for a loan.
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param collateralTokenFilled The address of the collateral token used.
    /// @param depositAmount The amount of additional collateral token to deposit.
    /// @return True on success
    function depositCollateral(
        bytes32 loanOrderHash,
        address collateralTokenFilled,
        uint depositAmount)
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
    function withdrawExcessCollateral(
        bytes32 loanOrderHash,
        address collateralTokenFilled,
        uint withdrawAmount)
        external
        nonReentrant
        tracksGas
        returns (uint excessCollateral)
    {
        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.loanTokenAddress == address(0)) {
            revert("BZxLoanHealth::withdrawExcessCollateral: loanOrder.loanTokenAddress == address(0)");
        }

        LoanPosition storage loanPosition = loanPositions[loanPositionsIds[loanOrderHash][msg.sender]];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            revert("BZxLoanHealth::withdrawExcessCollateral: loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active");
        }

        if (collateralTokenFilled != loanPosition.collateralTokenAddressFilled) {
            revert("BZxLoanHealth::withdrawExcessCollateral: collateralTokenFilled != loanPosition.collateralTokenAddressFilled");
        }

        uint positionToLoanTokenAmount;
        if (loanPosition.positionTokenAddressFilled == loanOrder.loanTokenAddress) {
            positionToLoanTokenAmount = loanPosition.positionTokenAmountFilled;
        } else {
            (, positionToLoanTokenAmount) = OracleInterface(oracleAddresses[loanOrder.oracleAddress]).getTradeData(
                loanPosition.positionTokenAddressFilled,
                loanOrder.loanTokenAddress,
                loanPosition.positionTokenAmountFilled);
        }

        uint initialCollateralTokenAmount = _getCollateralRequired(
            loanOrder.loanTokenAddress,
            loanPosition.collateralTokenAddressFilled,
            oracleAddresses[loanOrder.oracleAddress],
            positionToLoanTokenAmount < loanPosition.loanTokenAmountFilled ?
                loanPosition.loanTokenAmountFilled.add(loanPosition.loanTokenAmountFilled.sub(positionToLoanTokenAmount).mul(100).div(loanOrder.initialMarginAmount)) :
                loanPosition.loanTokenAmountFilled.sub(positionToLoanTokenAmount.sub(loanPosition.loanTokenAmountFilled).mul(100).div(loanOrder.initialMarginAmount)),
            loanOrder.initialMarginAmount
        );

        if (initialCollateralTokenAmount == 0 || initialCollateralTokenAmount >= loanPosition.collateralTokenAmountFilled) {
            revert("BZxLoanHealth::withdrawExcessCollateral: initialCollateralTokenAmount == 0 || initialCollateralTokenAmount >= loanPosition.collateralTokenAmountFilled");
        }
        
        excessCollateral = Math.min256(withdrawAmount, loanPosition.collateralTokenAmountFilled-initialCollateralTokenAmount);

        // transfer excess collateral to trader
        if (! BZxVault(vaultContract).withdrawToken(
            loanPosition.collateralTokenAddressFilled,
            msg.sender,
            excessCollateral
        )) {
            revert("BZxLoanHealth::withdrawExcessCollateral: BZxVault.withdrawToken collateral failed");
        }

        // update stored collateral amount
        loanPosition.collateralTokenAmountFilled = loanPosition.collateralTokenAmountFilled.sub(excessCollateral);

        if (! OracleInterface(oracleAddresses[loanOrder.oracleAddress]).didWithdrawCollateral(
            loanOrder,
            loanPosition,
            excessCollateral,
            gasUsed // initial used gas, collected in modifier
        )) {
            revert("BZxLoanHealth::withdrawExcessCollateral: OracleInterface.didWithdrawCollateral failed");
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
        returns (uint collateralTokenAmountFilled)
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

        uint positionToLoanTokenAmount;
        if (loanPosition.positionTokenAddressFilled == loanOrder.loanTokenAddress) {
            positionToLoanTokenAmount = loanPosition.positionTokenAmountFilled;
        } else {
            (, positionToLoanTokenAmount) = OracleInterface(oracleAddresses[loanOrder.oracleAddress]).getTradeData(
                loanPosition.positionTokenAddressFilled,
                loanOrder.loanTokenAddress,
                loanPosition.positionTokenAmountFilled);
        }

        // the new collateral amount must be enough to satify the initial margin requirement of the loan
        collateralTokenAmountFilled = _getCollateralRequired(
            loanOrder.loanTokenAddress,
            collateralTokenFilled,
            oracleAddresses[loanOrder.oracleAddress],
            positionToLoanTokenAmount < loanPosition.loanTokenAmountFilled ?
                loanPosition.loanTokenAmountFilled.add(loanPosition.loanTokenAmountFilled.sub(positionToLoanTokenAmount).mul(100).div(loanOrder.initialMarginAmount)) :
                loanPosition.loanTokenAmountFilled.sub(positionToLoanTokenAmount.sub(loanPosition.loanTokenAmountFilled).mul(100).div(loanOrder.initialMarginAmount)),
            loanOrder.initialMarginAmount
        );
        if (collateralTokenAmountFilled == 0) {
            revert("BZxLoanHealth::changeCollateral: collateralTokenAmountFilled == 0");
        }

        // transfer the new collateral token from the trader to the vault
        if (! BZxVault(vaultContract).depositToken(
            collateralTokenFilled,
            msg.sender,
            collateralTokenAmountFilled
        )) {
            revert("BZxLoanHealth::changeCollateral: BZxVault.depositToken new collateral failed");
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

    /// @dev Allows the trader to withdraw some or all of the position token for overcollateralized loans
    /// @dev The trader will only be able to withdraw an amount the keeps the loan at or above initial margin
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param withdrawAmount The amount of position token withdrawn
    /// @return True on success
    function withdrawPosition(
        bytes32 loanOrderHash,
        uint withdrawAmount)
        external
        nonReentrant
        tracksGas
        returns (bool)
    {
        LoanOrder memory loanOrder = orders[loanOrderHash];
        LoanPosition storage loanPosition = loanPositions[loanPositionsIds[loanOrderHash][msg.sender]];

        require(withdrawAmount <= loanPosition.positionTokenAmountFilled, "BZxLoanHealth::withdrawPosition: withdrawAmount amount too high");

        uint currentMargin = OracleInterface(oracleAddresses[loanOrder.oracleAddress]).getCurrentMarginAmount(
            loanOrder.loanTokenAddress,
            loanPosition.positionTokenAddressFilled,
            loanPosition.collateralTokenAddressFilled,
            loanPosition.loanTokenAmountFilled,
            loanPosition.positionTokenAmountFilled,
            loanPosition.collateralTokenAmountFilled);

        uint initialMarginAmount = loanOrder.initialMarginAmount.mul(10**18);
        require(currentMargin > initialMarginAmount, "BZxLoanHealth::withdrawPosition: current margin too low");

        uint amountToWithdraw = Math.min256(withdrawAmount, loanPosition.positionTokenAmountFilled.sub(loanPosition.positionTokenAmountFilled.mul(initialMarginAmount).div(currentMargin)));

        // transfer the position token to the trader
        if (! BZxVault(vaultContract).withdrawToken(
            loanPosition.positionTokenAddressFilled,
            msg.sender,
            amountToWithdraw
        )) {
            revert("BZxLoanHealth::withdrawProfit: BZxVault.withdrawToken loan failed");
        }

        // deduct amountToWithdraw from positionToken balance
        loanPosition.positionTokenAmountFilled = loanPosition.positionTokenAmountFilled.sub(amountToWithdraw);

        if (! OracleInterface(oracleAddresses[loanOrder.oracleAddress]).didWithdrawPosition(
            loanOrder,
            loanPosition,
            amountToWithdraw,
            gasUsed // initial used gas, collected in modifier
        )) {
            revert("BZxLoanHealth::withdrawProfit: OracleInterface.didWithdrawPosition failed");
        }

        return true;
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
        uint depositAmount)
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

        uint positionTokenAmountReceived;
        if (depositTokenAddress != loanPosition.positionTokenAddressFilled) {
            // send deposit token directly to the oracle to trade it
            if (!BZxVault(vaultContract).transferTokenFrom(
                depositTokenAddress,
                msg.sender,
                oracleAddresses[loanOrder.oracleAddress],
                depositAmount)) {
                revert("BZxLoanHealth::depositPosition: BZxVault.transferTokenFrom failed");
            }
            
            uint depositTokenAmountUsed;
            (positionTokenAmountReceived, depositTokenAmountUsed) = OracleInterface(oracleAddresses[loanOrder.oracleAddress]).doTrade(
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

    /// @dev Allows the trader to withdraw their profits, if any.
    /// @dev Profits are paid out from the current positionToken.
    /// @param loanOrderHash A unique hash representing the loan order
    /// @return profitAmount The amount of profit withdrawn denominated in positionToken
    function withdrawProfit(
        bytes32 loanOrderHash)
        external
        nonReentrant
        tracksGas
        returns (uint profitAmount)
    {
        LoanOrder memory loanOrder = orders[loanOrderHash];
        LoanPosition storage loanPosition = loanPositions[loanPositionsIds[loanOrderHash][msg.sender]];

        bool isProfit;
        (isProfit, profitAmount,) = _getProfitOrLoss(
            loanOrder,
            loanPosition);
        if (profitAmount == 0 || !isProfit) {
            revert("BZxLoanHealth::withdrawProfit: profitAmount == 0 || !isProfit");
        }

        // transfer profit to the trader
        if (! BZxVault(vaultContract).withdrawToken(
            loanPosition.positionTokenAddressFilled,
            msg.sender,
            profitAmount
        )) {
            revert("BZxLoanHealth::withdrawProfit: BZxVault.withdrawToken loan failed");
        }

        // deduct profit from positionToken balance
        loanPosition.positionTokenAmountFilled = loanPosition.positionTokenAmountFilled.sub(profitAmount);

        if (! OracleInterface(oracleAddresses[loanOrder.oracleAddress]).didWithdrawProfit(
            loanOrder,
            loanPosition,
            profitAmount,
            gasUsed // initial used gas, collected in modifier
        )) {
            revert("BZxLoanHealth::withdrawProfit: OracleInterface.didWithdrawProfit failed");
        }

        emit LogWithdrawProfit(
            loanOrder.loanOrderHash,
            msg.sender,
            profitAmount,
            loanPosition.positionTokenAmountFilled,
            loanPosition.positionId
        );

        return profitAmount;
    }

    /*
    * Constant public functions
    */
    /// @dev Get the current profit/loss data of a position
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param trader The trader of the position
    /// @return isProfit False it there's a loss, True otherwise
    /// @return profitOrLoss The amount of profit or amount of loss (denominated in positionToken)
    /// @return positionTokenAddress The position token current filled, which could be the same as the loanToken
    function getProfitOrLoss(
        bytes32 loanOrderHash,
        address trader)
        public
        view
        returns (bool isProfit, uint profitOrLoss, address positionTokenAddress)
    {
        LoanOrder memory loanOrder = orders[loanOrderHash];
        LoanPosition memory loanPosition = loanPositions[loanPositionsIds[loanOrderHash][trader]];

        return _getProfitOrLoss(
            loanOrder,
            loanPosition);
    }

    /*
    * Constant Internal functions
    */
    function _getProfitOrLoss(
        LoanOrder loanOrder,
        LoanPosition loanPosition)
        internal
        view
        returns (bool isProfit, uint profitOrLoss, address positionTokenAddress)
    {
        if (loanOrder.loanTokenAddress == address(0)) {
            return;
        }

        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            return;
        }

        (isProfit, profitOrLoss) = OracleInterface(oracleAddresses[loanOrder.oracleAddress]).getProfitOrLoss(
            loanPosition.positionTokenAddressFilled,
            loanOrder.loanTokenAddress,
            loanPosition.positionTokenAmountFilled,
            loanPosition.loanTokenAmountFilled);

        positionTokenAddress = loanPosition.positionTokenAddressFilled;
    }

}
