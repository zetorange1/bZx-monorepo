/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.4.24;
pragma experimental ABIEncoderV2;

import "openzeppelin-solidity/contracts/math/Math.sol";

import "../proxy/BZxProxiable.sol";
import "../shared/OrderTakingFunctions.sol";


contract BZxOrderTaking is BZxStorage, BZxProxiable, OrderTakingFunctions {
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
        targets[bytes4(keccak256("takeLoanOrderAsTrader(address[6],uint256[10],bytes,address,uint256,bytes)"))] = _target;
        targets[bytes4(keccak256("takeLoanOrderAsTraderAndWithdraw(address[6],uint256[10],bytes,address,uint256,bytes)"))] = _target;
        targets[bytes4(keccak256("takeLoanOrderAsLender(address[6],uint256[10],bytes,bytes)"))] = _target;
        targets[bytes4(keccak256("cancelLoanOrder(address[6],uint256[10],bytes,uint256)"))] = _target;
        targets[bytes4(keccak256("cancelLoanOrderWithHash(bytes32,uint256)"))] = _target;
    }

    /// @dev Takes the order as trader
    /// @param orderAddresses Array of order's makerAddress, loanTokenAddress, interestTokenAddress, collateralTokenAddress, feeRecipientAddress, oracleAddress.
    /// @param orderValues Array of order's loanTokenAmount, interestAmount, initialMarginAmount, maintenanceMarginAmount, lenderRelayFee, traderRelayFee, maxDurationUnixTimestampSec, expirationUnixTimestampSec, makerRole (0=lender, 1=trader), and salt.
    /// @param oracleData An arbitrary length bytes stream to pass to the oracle.
    /// @param collateralTokenFilled Desired address of the collateralTokenAddress the trader wants to use.
    /// @param loanTokenAmountFilled Desired amount of loanToken the trader wants to borrow.
    /// @param signature ECDSA signature in raw bytes (rsv).
    /// @return Total amount of loanToken borrowed (uint).
    /// @dev Traders can take a portion of the total coin being lended (loanTokenAmountFilled).
    /// @dev Traders also specify the token that will fill the margin requirement if they are taking the order.
    function takeLoanOrderAsTrader(
        address[6] orderAddresses,
        uint[10] orderValues,
        bytes oracleData,
        address collateralTokenFilled,
        uint loanTokenAmountFilled,
        bytes signature)
        external
        nonReentrant
        tracksGas
        returns (uint)
    {
        bytes32 loanOrderHash = _addLoanOrder(
            orderAddresses,
            orderValues,
            oracleData,
            signature);

        return _takeLoanOrder(
            loanOrderHash,
            collateralTokenFilled,
            loanTokenAmountFilled,
            1, // takerRole
            false // withdraw loan token
        );
    }

    /// @dev Takes the order as trader, overcollateralizes the loan, and withdraws the loan token to the trader's wallet
    /// @param orderAddresses Array of order's makerAddress, loanTokenAddress, interestTokenAddress, collateralTokenAddress, feeRecipientAddress, oracleAddress.
    /// @param orderValues Array of order's loanTokenAmount, interestAmount, initialMarginAmount, maintenanceMarginAmount, lenderRelayFee, traderRelayFee, maxDurationUnixTimestampSec, expirationUnixTimestampSec, makerRole (0=lender, 1=trader), and salt.
    /// @param oracleData An arbitrary length bytes stream to pass to the oracle.
    /// @param collateralTokenFilled Desired address of the collateralTokenAddress the trader wants to use.
    /// @param loanTokenAmountFilled Desired amount of loanToken the trader wants to borrow.
    /// @param signature ECDSA signature in raw bytes (rsv).
    /// @return Total amount of loanToken borrowed (uint).
    /// @dev Traders can take a portion of the total coin being lended (loanTokenAmountFilled).
    /// @dev Traders also specify the token that will fill the margin requirement if they are taking the order.
    function takeLoanOrderAsTraderAndWithdraw(
        address[6] orderAddresses,
        uint[10] orderValues,
        bytes oracleData,
        address collateralTokenFilled,
        uint loanTokenAmountFilled,
        bytes signature)
        external
        nonReentrant
        tracksGas
        returns (uint)
    {
        bytes32 loanOrderHash = _addLoanOrder(
            orderAddresses,
            orderValues,
            oracleData,
            signature);

        return _takeLoanOrder(
            loanOrderHash,
            collateralTokenFilled,
            loanTokenAmountFilled,
            1, // takerRole
            true // withdraw loan token
        );
    }

    /// @dev Takes the order as lender
    /// @param orderAddresses Array of order's makerAddress, loanTokenAddress, interestTokenAddress, collateralTokenAddress, feeRecipientAddress, oracleAddress.
    /// @param orderValues Array of order's loanTokenAmount, interestAmount, initialMarginAmount, maintenanceMarginAmount, lenderRelayFee, traderRelayFee, maxDurationUnixTimestampSec, expirationUnixTimestampSec, makerRole (0=lender, 1=trader), and salt.
    /// @param oracleData An arbitrary length bytes stream to pass to the oracle.
    /// @param signature ECDSA signature in raw bytes (rsv).
    /// @return Total amount of loanToken borrowed (uint).
    /// @dev Lenders have to fill the entire desired amount the trader wants to borrow.
    /// @dev This makes loanTokenAmountFilled = loanOrder.loanTokenAmount.
    function takeLoanOrderAsLender(
        address[6] orderAddresses,
        uint[10] orderValues,
        bytes oracleData,
        bytes signature)
        external
        nonReentrant
        tracksGas
        returns (uint)
    {
        bytes32 loanOrderHash = _addLoanOrder(
            orderAddresses,
            orderValues,
            oracleData,
            signature);

        // lenders have to fill the entire uncanceled loanTokenAmount
        return _takeLoanOrder(
            loanOrderHash,
            orderAddresses[3], // collateralTokenFilled
            orderValues[0].sub(_getUnavailableLoanTokenAmount(loanOrderHash)), // loanTokenAmountFilled
            0, // takerRole
            false // withdraw loan token
        );
    }

    /// @dev Cancels remaining (untaken) loan
    /// @param orderAddresses Array of order's makerAddress, loanTokenAddress, interestTokenAddress, collateralTokenAddress, feeRecipientAddress, oracleAddress.
    /// @param orderValues Array of order's loanTokenAmount, interestAmount, initialMarginAmount, maintenanceMarginAmount, lenderRelayFee, traderRelayFee, maxDurationUnixTimestampSec, expirationUnixTimestampSec, makerRole (0=lender, 1=trader), and salt.
    /// @param oracleData An arbitrary length bytes stream to pass to the oracle.
    /// @param cancelLoanTokenAmount The amount of remaining unloaned token to cancel.
    /// @return The amount of loan token canceled.
    function cancelLoanOrder(
        address[6] orderAddresses,
        uint[10] orderValues,
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

        require(loanOrderAux.maker == msg.sender, "BZxOrderTaking::cancelLoanOrderWithHash: loanOrderAux.maker != msg.sender");
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

