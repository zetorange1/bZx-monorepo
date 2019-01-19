/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.2;
pragma experimental ABIEncoderV2;

import "../openzeppelin-solidity/Math.sol";

import "../proxy/BZxProxiable.sol";
import "../shared/MiscFunctions.sol";

import "../oracle/OracleInterface.sol";

import "../tokens/EIP20.sol";


contract LoanMaintenance_MiscFunctions2 is BZxStorage, BZxProxiable, MiscFunctions {
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
        targets[bytes4(keccak256("changeTraderOwnership(bytes32,address)"))] = _target;
        targets[bytes4(keccak256("changeLenderOwnership(bytes32,address)"))] = _target;
        targets[bytes4(keccak256("updateLoanAsLender(bytes32,uint256,uint256)"))] = _target;
        targets[bytes4(keccak256("isPositionOpen(bytes32,address)"))] = _target;
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

        uint256 positionid = loanPositionsIds[loanOrderHash][msg.sender];
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

    /// @dev Allows a lender to increase the amount of token they will loan out for an order and/or set the loan order expiration to a future date
    /// @dev The order must already be on chain
    /// @dev Ensures the lender has enough balance and allowance
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param increaseAmountForLoan Optional parameter to specify the amount of loan token increase
    /// @param futureExpirationTimestamp Optional parameter to set the expirationUnixTimestampSec on the loan to a future date
    /// @return True on success
    function updateLoanAsLender(
        bytes32 loanOrderHash,
        uint256 increaseAmountForLoan,
        uint256 futureExpirationTimestamp)
        external
        nonReentrant
        tracksGas
        returns (bool)
    {
        if (orderLender[loanOrderHash] != msg.sender || orderAux[loanOrderHash].makerAddress != msg.sender) {
            revert("BZxOrderTaking::updateLoanAsLender: sender did not make order as lender");
        }

        LoanOrder storage loanOrder = orders[loanOrderHash];
        if (loanOrder.loanTokenAddress == address(0)) {
            revert("BZxOrderTaking::updateLoanAsLender: loanOrder.loanTokenAddress == address(0)");
        }

        bool success = false;

        uint256 totalNewFillableAmount = loanOrder.loanTokenAmount.sub(_getUnavailableLoanTokenAmount(loanOrderHash));
        if (increaseAmountForLoan > 0) {
            totalNewFillableAmount = totalNewFillableAmount.add(increaseAmountForLoan);
        
            // ensure adequate token balance
            require (EIP20(loanOrder.loanTokenAddress).balanceOf.gas(4999)(msg.sender) >= totalNewFillableAmount, "BZxOrderTaking::updateLoanAsLender: lender balance is insufficient");

            // ensure adequate token allowance
            require (EIP20(loanOrder.loanTokenAddress).allowance.gas(4999)(msg.sender, vaultContract) >= totalNewFillableAmount, "BZxOrderTaking::updateLoanAsLender: lender allowance is insufficient");

            uint256 newLoanTokenAmount = loanOrder.loanTokenAmount.add(increaseAmountForLoan);

            if (loanOrder.interestAmount > 0) {
                if (loanOrder.loanTokenAmount > 0) {
                    // Interest amount per day is calculated based on the fraction of loan token filled over total loanTokenAmount.
                    // Since total loanTokenAmount is increasing, we increase interest proportionally.
                    loanOrder.interestAmount = loanOrder.interestAmount.mul(newLoanTokenAmount).div(loanOrder.loanTokenAmount);
                } else {
                    // HACK: We assume here that interestAmount has initially been set as a percentage when pushed on chain in a
                    // zero-value loan. We will convert it to an actual amount based on loan value, denominated in interestToken.
                    // Percentage format: 2% of total filled loan token value per day = 2 * 10**18
                    // This is limited to tokens supported by the oracle.
                    
                    uint256 loanToInterestAmount;
                    if (loanOrder.interestTokenAddress == loanOrder.loanTokenAddress) {
                        loanToInterestAmount = newLoanTokenAmount;
                    } else {
                        (,,loanToInterestAmount) = OracleInterface(oracleAddresses[loanOrder.oracleAddress]).getTradeData(
                            loanOrder.loanTokenAddress,
                            loanOrder.interestTokenAddress,
                            newLoanTokenAmount);
                    }
                    require(loanToInterestAmount > 0, "BZxOrderTaking::updateLoanAsLender: loanToInterestAmount == 0");

                    loanOrder.interestAmount = loanToInterestAmount.mul(loanOrder.interestAmount).div(10**20);
                }
            }

            loanOrder.loanTokenAmount = newLoanTokenAmount;

            success = true;
        }

        if (futureExpirationTimestamp > orderAux[loanOrderHash].expirationUnixTimestampSec) {
            orderAux[loanOrderHash].expirationUnixTimestampSec = futureExpirationTimestamp;
            success = true;
        }

        if (success) {
            emit LogUpdateLoanAsLender(
                loanOrderHash,
                msg.sender,
                increaseAmountForLoan,
                totalNewFillableAmount,
                orderAux[loanOrderHash].expirationUnixTimestampSec
            );

            if (! OracleInterface(oracleAddresses[loanOrder.oracleAddress]).didUpdateLoanAsLender(
                loanOrder,
                msg.sender,
                increaseAmountForLoan,
                totalNewFillableAmount,
                orderAux[loanOrderHash].expirationUnixTimestampSec,
                gasUsed // initial used gas, collected in modifier
            )) {
                revert("BZxOrderTaking::updateLoanAsLender: OracleInterface.didUpdateLoanAsLender failed");
            }

            return true;
        } else {
            return false;
        }
    }

    /// @param loanOrderHash A unique hash representing the loan order
    /// @param trader The trader of the position
    /// @return True if the position is open/active, false otherwise
    function isPositionOpen(
        bytes32 loanOrderHash,
        address trader)
        public
        view
        returns (bool)
    {
        LoanPosition memory loanPosition = loanPositions[loanPositionsIds[loanOrderHash][trader]];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            return false;
        } else {
            return true;
        }
    }

    /// @dev Allows the maker of an order to set a description
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param desc Descriptive text to attach to the loan order
    /// @return True on success
    function setLoanOrderDesc(
        bytes32 loanOrderHash,
        string calldata desc)
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
