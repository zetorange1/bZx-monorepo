/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.4.24;
pragma experimental ABIEncoderV2;

import "openzeppelin-solidity/contracts/math/Math.sol";

import "../proxy/BZxProxiable.sol";
import "../shared/InternalFunctions.sol";

import "../oracle/OracleInterface.sol";

import "../tokens/EIP20.sol";


contract BZxLoanMaintenance2 is BZxStorage, BZxProxiable, InternalFunctions {
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
        targets[bytes4(keccak256("changeTraderOwnership(bytes32,address)"))] = _target;
        targets[bytes4(keccak256("changeLenderOwnership(bytes32,address)"))] = _target;
        targets[bytes4(keccak256("increaseLoanableAmount(bytes32,uint256)"))] = _target;
        targets[bytes4(keccak256("setLoanOrderDesc(bytes32,string)"))] = _target;
    }

    /// @dev Allows the trader to transfer ownership of the underlying assets in a position to another user.
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param newOwner The address receiving the transfer
    /// @return True on success
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
    /// @param newOwner The address receiving the transfer
    /// @return True on success
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

    /// @dev Allows a lender to increase the amount of token they will loan out for an order
    /// @dev The order must already be on chain and have been partially filled
    /// @dev Ensures the lender has enough balance and allowance
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param loanTokenAmountToAdd The amount to increase the loan token
    /// @return True on success
    function increaseLoanableAmount(
        bytes32 loanOrderHash,
        uint loanTokenAmountToAdd)      
        external
        nonReentrant
        tracksGas
        returns (bool)
    {
        if (orderLender[loanOrderHash] != msg.sender) {
            revert("BZxOrderTaking::increaseLoanableAmount: msg.sender is not the lender");
        }

        LoanOrder storage loanOrder = orders[loanOrderHash];
        if (loanOrder.loanTokenAddress == address(0)) {
            revert("BZxOrderTaking::increaseLoanableAmount: loanOrder.loanTokenAddress == address(0)");
        }

        uint totalNewFillableAmount = loanOrder.loanTokenAmount.sub(_getUnavailableLoanTokenAmount(loanOrderHash)).add(loanTokenAmountToAdd);
        
        // ensure adequate token balance
        require (EIP20(loanOrder.loanTokenAddress).balanceOf.gas(4999)(msg.sender) >= totalNewFillableAmount, "BZxOrderTaking::increaseLoanableAmount: lender balance is insufficient");

        // ensure adequate token allowance
        require (EIP20(loanOrder.loanTokenAddress).allowance.gas(4999)(msg.sender, vaultContract) >= totalNewFillableAmount, "BZxOrderTaking::increaseLoanableAmount: lender allowance is insufficient");
        
        uint newLoanTokenAmount = loanOrder.loanTokenAmount.add(loanTokenAmountToAdd);

        // Interest amount per day is calculated based on the fraction of loan token filled over total loanTokenAmount.
        // Since total loanTokenAmount is increasing, we increase interest proportionally.
        loanOrder.interestAmount = loanOrder.interestAmount.mul(newLoanTokenAmount).div(loanOrder.loanTokenAmount);

        loanOrder.loanTokenAmount = newLoanTokenAmount;

        if (! OracleInterface(oracleAddresses[loanOrder.oracleAddress]).didIncreaseLoanableAmount(
            loanOrder,
            msg.sender,
            loanTokenAmountToAdd,
            totalNewFillableAmount,
            gasUsed // initial used gas, collected in modifier
        )) {
            revert("BZxOrderTaking::increaseLoanableAmount: OracleInterface.didIncreaseLoanableAmount failed");
        }

        emit LogIncreasedLoanableAmount(
            loanOrderHash,
            msg.sender,
            loanTokenAmountToAdd,
            totalNewFillableAmount
        );

        return true;
    }

    /// @dev Allows the maker of an order to set a description
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param desc Descriptive text to attach to the loan order
    /// @return True on success
    function setLoanOrderDesc(
        bytes32 loanOrderHash,
        string desc)
        external
        nonReentrant
        tracksGas
        returns (bool)
    {
        LoanOrderAux storage loanOrderAux = orderAux[loanOrderHash];
        require(loanOrderAux.makerAddress == msg.sender, "BZxLoanMaintenance::setLoanOrderDesc: loanOrderAux.makerAddress != msg.sender");
        loanOrderAux.description = desc;

        return true;
    }
}
