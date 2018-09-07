/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.4.24;
pragma experimental ABIEncoderV2;

import "openzeppelin-solidity/contracts/math/Math.sol";

import "../proxy/BZxProxiable.sol";
import "../shared/InternalFunctions.sol";

import "../BZxVault.sol";
import "../oracle/OracleInterface.sol";


contract BZxLoanMaintenance is BZxStorage, BZxProxiable, InternalFunctions {
    using SafeMath for uint256;

    constructor() public {}

    function initialize(
        address _target)
        public
        onlyOwner
    {
        targets[bytes4(keccak256("depositCollateral(bytes32,address,uint256)"))] = _target;
        targets[bytes4(keccak256("withdrawExcessCollateral(bytes32,address,uint256)"))] = _target;
        targets[bytes4(keccak256("changeCollateral(bytes32,address)"))] = _target;
        targets[bytes4(keccak256("withdrawProfit(bytes32)"))] = _target;
        targets[bytes4(keccak256("changeTraderOwnership(bytes32,address)"))] = _target;
        targets[bytes4(keccak256("changeLenderOwnership(bytes32,address)"))] = _target;
        targets[bytes4(keccak256("getProfitOrLoss(bytes32,address)"))] = _target;
    }

    /// @dev Allows the trader to increase the collateral for a loan.
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param collateralTokenFilled The address of the collateral token used.
    /// @return depositAmount The amount of additional collateral token to deposit.
    function depositCollateral(
        bytes32 loanOrderHash,
        address collateralTokenFilled,
        uint depositAmount)
        external
        nonReentrant
        tracksGas
        returns (bool)
    {
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
    /// @return withdrawAmount The amount of excess collateral token to withdraw. The actual amount withdrawn will be less if there's less excess.
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

        // the new collateral amount must be enough to satify the initial margin requirement of the loan
        uint initialCollateralTokenAmount = _getInitialCollateralRequired(
            loanOrder.loanTokenAddress,
            loanPosition.collateralTokenAddressFilled,
            oracleAddresses[loanOrder.oracleAddress],
            loanPosition.loanTokenAmountFilled,
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
            gasUsed // initial used gas, collected in modifier
        )) {
            revert("BZxLoanHealth::withdrawExcessCollateral: OracleInterface.didWithdrawCollateral failed");
        }
    }

    /// @dev Allows the trader to change the collateral token being used for a loan.
    /// @dev This function will transfer in the initial margin requirement of the new token and the old token will be refunded to the trader.
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param collateralTokenFilled The address of the collateral token used.
    /// @return True on success
    function changeCollateral(
        bytes32 loanOrderHash,
        address collateralTokenFilled)
        external
        nonReentrant
        tracksGas
        returns (bool)
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

        // the new collateral amount must be enough to satify the initial margin requirement of the loan
        uint collateralTokenAmountFilled = _getInitialCollateralRequired(
            loanOrder.loanTokenAddress,
            collateralTokenFilled,
            oracleAddresses[loanOrder.oracleAddress],
            loanPosition.loanTokenAmountFilled,
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
            loanPosition.positionTokenAmountFilled
        );

        return profitAmount;
    }

    /// @dev Allows the trader to transfer ownership of the underlying assets in a position to another user.
    /// @param loanOrderHash A unique hash representing the loan order
    function changeTraderOwnership(
        bytes32 loanOrderHash,
        address newOwner)
        external
        nonReentrant
        tracksGas
        returns (bool)
    {
        if (orderListIndex[loanOrderHash][newOwner].isSet) {
            // user can't transfer ownership to another trader or lender already in this order
            revert("BZxLoanMaintenance::changeTraderOwnership: new owner is invalid");
        }
        
        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.loanTokenAddress == address(0)) {
            revert("BZxLoanMaintenance::changeTraderOwnership: loanOrder.loanTokenAddress == address(0)");
        }

        uint positionid = loanPositionsIds[loanOrderHash][msg.sender];
        LoanPosition storage loanPosition = loanPositions[positionid];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            revert("BZxLoanMaintenance::changeTraderOwnership: loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active");
        }

        if (loanPosition.trader != msg.sender) {
            revert("BZxLoanMaintenance::changeTraderOwnership: msg.sender is not the trader in this position");
        }

        // remove old owner references to loanOrder and loanPosition
        delete loanPositionsIds[loanOrderHash][msg.sender];
        _removeLoanOrder(
            loanOrderHash,
            msg.sender
        );

        // add new owner references to loanOrder and loanPosition
        loanPosition.trader = newOwner;
        loanPositionsIds[loanOrderHash][newOwner] = positionid;
        orderList[newOwner].push(loanOrderHash);
        orderListIndex[loanOrderHash][newOwner] = ListIndex({
            index: orderList[newOwner].length-1,
            isSet: true
        });

        if (! OracleInterface(oracleAddresses[loanOrder.oracleAddress]).didChangeTraderOwnership(
            loanOrder,
            loanPosition,
            msg.sender, // old owner
            gasUsed // initial used gas, collected in modifier
        )) {
            revert("BZxLoanMaintenance::changeTraderOwnership: OracleInterface.didChangeTraderOwnership failed");
        }

        emit LogChangeTraderOwnership(
            loanOrder.loanOrderHash,
            msg.sender, // old owner
            newOwner
        );

        return true;
    }

    /// @dev Allows the lender to transfer ownership of the underlying assets in a position to another user.
    /// @param loanOrderHash A unique hash representing the loan order
    function changeLenderOwnership(
        bytes32 loanOrderHash,
        address newOwner)
        external
        nonReentrant
        tracksGas
        returns (bool)
    {
        if (orderLender[loanOrderHash] != msg.sender) {
            revert("BZxLoanMaintenance::changeLenderOwnership: msg.sender is not the lender in this position");
        }
        
        if (orderListIndex[loanOrderHash][newOwner].isSet) {
            // user can't transfer ownership to another trader or lender already in this order
            revert("BZxLoanMaintenance::changeLenderOwnership: new owner is invalid");
        }

        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.loanTokenAddress == address(0)) {
            revert("BZxLoanMaintenance::changeLenderOwnership: loanOrder.loanTokenAddress == address(0)");
        }

        // remove old owner references to loanOrder
        _removeLoanOrder(
            loanOrderHash,
            msg.sender
        );

        // add new owner references to loanOrder
        orderLender[loanOrderHash] = newOwner;
        orderList[newOwner].push(loanOrderHash);
        orderListIndex[loanOrderHash][newOwner] = ListIndex({
            index: orderList[newOwner].length-1,
            isSet: true
        });

        if (! OracleInterface(oracleAddresses[loanOrder.oracleAddress]).didChangeLenderOwnership(
            loanOrder,
            msg.sender, // old owner
            newOwner,
            gasUsed // initial used gas, collected in modifier
        )) {
            revert("BZxLoanMaintenance::changeLenderOwnership: OracleInterface.didChangeLenderOwnership failed");
        }

        emit LogChangeLenderOwnership(
            loanOrder.loanOrderHash,
            msg.sender, // old owner
            newOwner
        );

        return true;
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
