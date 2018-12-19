/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.4.24;
pragma experimental ABIEncoderV2;

import "openzeppelin-solidity/contracts/math/Math.sol";

import "../proxy/BZxProxiable.sol";
import "../shared/OrderTakingFunctions.sol";


contract BZxOrderTaking2 is BZxStorage, BZxProxiable, OrderTakingFunctions {
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
        targets[bytes4(keccak256("cancelLoanOrder(address[8],uint256[11],bytes,uint256)"))] = _target;
        targets[bytes4(keccak256("cancelLoanOrderWithHash(bytes32,uint256)"))] = _target;
    }

    /// @dev Cancels remaining (untaken) loan
    /// @param orderAddresses Array of order's makerAddress, loanTokenAddress, interestTokenAddress, collateralTokenAddress, feeRecipientAddress, oracleAddress, takerAddress, tradeTokenToFill.
    /// @param orderValues Array of order's loanTokenAmount, interestAmount, initialMarginAmount, maintenanceMarginAmount, lenderRelayFee, traderRelayFee, maxDurationUnixTimestampSec, expirationUnixTimestampSec, makerRole (0=lender, 1=trader), withdrawOnOpen, and salt.
    /// @param oracleData An arbitrary length bytes stream to pass to the oracle.
    /// @param cancelLoanTokenAmount The amount of remaining unloaned token to cancel.
    /// @return The amount of loan token canceled.
    function cancelLoanOrder(
        address[8] orderAddresses,
        uint[11] orderValues,
        bytes oracleData,
        uint cancelLoanTokenAmount)
        external
        nonReentrant
        tracksGas
        returns (uint)
    {
        bytes32 loanOrderHash = _getLoanOrderHash(orderAddresses, orderValues, oracleData);

        require(orderAddresses[0] == msg.sender, "BZxOrderTaking::cancelLoanOrder: makerAddress != msg.sender");
        require(orderValues[0] > 0 && cancelLoanTokenAmount > 0, "BZxOrderTaking::cancelLoanOrder: invalid params");

        if (orderValues[7] > 0 && block.timestamp >= orderValues[7]) {
            _removeLoanOrder(loanOrderHash, address(0));
            return 0;
        }

        uint remainingLoanTokenAmount = orderValues[0].sub(_getUnavailableLoanTokenAmount(loanOrderHash));
        uint cancelledLoanTokenAmount = Math.min256(cancelLoanTokenAmount, remainingLoanTokenAmount);
        if (cancelledLoanTokenAmount == 0) {
            // none left to cancel
            return 0;
        }

        if (remainingLoanTokenAmount == cancelledLoanTokenAmount) {
            _removeLoanOrder(loanOrderHash, address(0));
        }

        orderCancelledAmounts[loanOrderHash] = orderCancelledAmounts[loanOrderHash].add(cancelledLoanTokenAmount);

        emit LogLoanCancelled(
            msg.sender,
            cancelledLoanTokenAmount,
            (remainingLoanTokenAmount - cancelledLoanTokenAmount),
            loanOrderHash
        );
    
        return cancelledLoanTokenAmount;
    }

    /// @dev Cancels remaining (untaken) loan
    /// @param loanOrderHash A unique hash representing the loan order.
    /// @param cancelLoanTokenAmount The amount of remaining unloaned token to cancel.
    /// @return The amount of loan token canceled.
    function cancelLoanOrderWithHash(
        bytes32 loanOrderHash,
        uint cancelLoanTokenAmount)
        external
        nonReentrant
        tracksGas
        returns (uint)
    {
        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.loanTokenAddress == address(0)) {
            revert("BZxOrderTaking::cancelLoanOrderWithHash: loanOrder.loanTokenAddress == address(0)");
        }
        
        LoanOrderAux memory loanOrderAux = orderAux[loanOrderHash];

        require(loanOrderAux.makerAddress == msg.sender, "BZxOrderTaking::cancelLoanOrderWithHash: loanOrderAux.makerAddress != msg.sender");
        require(loanOrder.loanTokenAmount > 0 && cancelLoanTokenAmount > 0, "BZxOrderTaking::cancelLoanOrderWithHash: invalid params");

        if (loanOrderAux.expirationUnixTimestampSec > 0 && block.timestamp >= loanOrderAux.expirationUnixTimestampSec) {
            _removeLoanOrder(loanOrder.loanOrderHash, address(0));
            return 0;
        }

        uint remainingLoanTokenAmount = loanOrder.loanTokenAmount.sub(_getUnavailableLoanTokenAmount(loanOrder.loanOrderHash));
        uint cancelledLoanTokenAmount = Math.min256(cancelLoanTokenAmount, remainingLoanTokenAmount);
        if (cancelledLoanTokenAmount == 0) {
            // none left to cancel
            return 0;
        }

        if (remainingLoanTokenAmount == cancelledLoanTokenAmount) {
            _removeLoanOrder(loanOrder.loanOrderHash, address(0));
        }

        orderCancelledAmounts[loanOrder.loanOrderHash] = orderCancelledAmounts[loanOrder.loanOrderHash].add(cancelledLoanTokenAmount);

        emit LogLoanCancelled(
            msg.sender,
            cancelledLoanTokenAmount,
            (remainingLoanTokenAmount - cancelledLoanTokenAmount),
            loanOrder.loanOrderHash
        );
    
        return cancelledLoanTokenAmount;
    }
}

