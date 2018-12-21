/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.2;
pragma experimental ABIEncoderV2;

import "../openzeppelin-solidity/Math.sol";

import "../proxy/BZxProxiable.sol";
import "../shared/OrderTakingFunctions.sol";


contract OrderTaking_MiscFunctions is BZxStorage, BZxProxiable, OrderTakingFunctions {
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
        targets[bytes4(keccak256("cancelLoanOrder(address[8],uint256[11],bytes,uint256)"))] = _target;
        targets[bytes4(keccak256("cancelLoanOrderWithHash(bytes32,uint256)"))] = _target;
        targets[bytes4(keccak256("pushLoanOrderOnChain(address[8],uint256[11],bytes,bytes)"))] = _target;
        targets[bytes4(keccak256("preSign(address,address[8],uint256[11],bytes,bytes)"))] = _target;
        targets[bytes4(keccak256("preSignWithHash(address,bytes32,bytes)"))] = _target;
        targets[bytes4(keccak256("getLoanOrderHash(address[8],uint256[11],bytes)"))] = _target;
        targets[bytes4(keccak256("isValidSignature(address,bytes32,bytes)"))] = _target;
        targets[bytes4(keccak256("getInitialCollateralRequired(address,address,address,uint256,uint256)"))] = _target;
    }

    /// @dev Cancels remaining (untaken) loan
    /// @param orderAddresses Array of order's makerAddress, loanTokenAddress, interestTokenAddress, collateralTokenAddress, feeRecipientAddress, oracleAddress, takerAddress, tradeTokenToFillAddress.
    /// @param orderValues Array of order's loanTokenAmount, interestAmount, initialMarginAmount, maintenanceMarginAmount, lenderRelayFee, traderRelayFee, maxDurationUnixTimestampSec, expirationUnixTimestampSec, makerRole (0=lender, 1=trader), withdrawOnOpen, and salt.
    /// @param oracleData An arbitrary length bytes stream to pass to the oracle.
    /// @param cancelLoanTokenAmount The amount of remaining unloaned token to cancel.
    /// @return The amount of loan token canceled.
    function cancelLoanOrder(
        address[8] calldata orderAddresses,
        uint[11] calldata orderValues,
        bytes calldata oracleData,
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

    /// @dev Pushes an order on chain
    /// @param orderAddresses Array of order's makerAddress, loanTokenAddress, interestTokenAddress, collateralTokenAddress, feeRecipientAddress, oracleAddress, takerAddress, tradeTokenToFillAddress.
    /// @param orderValues Array of order's loanTokenAmount, interestAmount, initialMarginAmount, maintenanceMarginAmount, lenderRelayFee, traderRelayFee, maxDurationUnixTimestampSec, expirationUnixTimestampSec, makerRole (0=lender, 1=trader), withdrawOnOpen, and salt.
    /// @param oracleData An arbitrary length bytes stream to pass to the oracle.
    /// @param signature ECDSA signature in raw bytes (rsv).
    /// @return A unique hash representing the loan order.
    function pushLoanOrderOnChain(
        address[8] calldata orderAddresses,
        uint[11] calldata orderValues,
        bytes calldata oracleData,
        bytes calldata signature)        
        external
        nonReentrant
        tracksGas
        returns (bytes32)
    {
        bytes32 loanOrderHash = _addLoanOrder(
            orderAddresses,
            orderValues,
            oracleData,
            signature);

        require(!orderListIndex[loanOrderHash][address(0)].isSet, "BZxOrderTaking::pushLoanOrderOnChain: this order is already on chain");

        // record of fillable (non-expired, unfilled) orders
        orderList[address(0)].push(loanOrderHash);
        orderListIndex[loanOrderHash][address(0)] = ListIndex({
            index: orderList[address(0)].length-1,
            isSet: true
        });

        return loanOrderHash;
    }

    /// @dev Approves a hash on-chain using any valid signature type.
    ///      After presigning a hash, the preSign signature type will become valid for that hash and signer.
    /// @param signer Address that should have signed the hash generated by the loanOrder parameters given.
    /// @param orderAddresses Array of order's makerAddress, loanTokenAddress, interestTokenAddress, collateralTokenAddress, feeRecipientAddress, oracleAddress, takerAddress, tradeTokenToFillAddress.
    /// @param orderValues Array of order's loanTokenAmount, interestAmount, initialMarginAmount, maintenanceMarginAmount, lenderRelayFee, traderRelayFee, maxDurationUnixTimestampSec, expirationUnixTimestampSec, makerRole (0=lender, 1=trader), withdrawOnOpen, and salt.
    /// @param oracleData An arbitrary length bytes stream to pass to the oracle.
    /// @param signature Proof that the hash has been signed by signer.
    function preSign(
        address signer,
        address[8] calldata orderAddresses,
        uint[11] calldata orderValues,
        bytes calldata oracleData,
        bytes calldata signature)
        external
        nonReentrant
    {
        _preSign(
            signer,
            _getLoanOrderHash(orderAddresses, orderValues, oracleData),
            signature
        );
    }

    /// @dev Approves a hash on-chain using any valid signature type.
    ///      After presigning a hash, the preSign signature type will become valid for that hash and signer.
    /// @param signer Address that should have signed the given hash.
    /// @param hash Signed Keccak-256 hash.
    /// @param signature Proof that the hash has been signed by signer.
    function preSignWithHash(
        address signer,
        bytes32 hash,
        bytes calldata signature)
        external
        nonReentrant
    {
        _preSign(
            signer,
            hash,
            signature
        );
    }

    /// @dev Calculates Keccak-256 hash of order with specified parameters.
    /// @param orderAddresses Array of order's makerAddress, loanTokenAddress, interestTokenAddress, collateralTokenAddress, feeRecipientAddress, oracleAddress, takerAddress, tradeTokenToFillAddress.
    /// @param orderValues Array of order's loanTokenAmount, interestAmount, initialMarginAmount, maintenanceMarginAmount, lenderRelayFee, traderRelayFee, maxDurationUnixTimestampSec, expirationUnixTimestampSec, makerRole (0=lender, 1=trader), withdrawOnOpen, and salt.
    /// @param oracleData An arbitrary length bytes stream to pass to the oracle.
    /// @return Keccak-256 hash of loanOrder.
    function getLoanOrderHash(
        address[8] memory orderAddresses,
        uint[11] memory orderValues,
        bytes memory oracleData)
        public
        view
        returns (bytes32)
    {
        return _getLoanOrderHash(orderAddresses, orderValues, oracleData);
    }

    /// @dev Verifies that an order signature is valid.
    /// @param signer address of signer.
    /// @param hash Signed Keccak-256 hash.
    /// @param signature ECDSA signature in raw bytes (rsv) + signatureType.
    /// @return Validity of order signature.
    function isValidSignature(
        address signer,
        bytes32 hash,
        bytes memory signature)
        public
        view
        returns (bool)
    {
        return _isValidSignature(
            signer,
            hash,
            signature);
    }

    /// @dev Calculates the initial collateral required to open the loan.
    /// @param collateralTokenAddress The collateral token used by the trader.
    /// @param oracleAddress The oracle address specified in the loan order.
    /// @param loanTokenAmountFilled The amount of loan token borrowed.
    /// @param initialMarginAmount The initial margin percentage amount (i.e. 50000000000000000000 == 50%)
    /// @return The minimum collateral requirement to open the loan.
    function getInitialCollateralRequired(
        address loanTokenAddress,
        address collateralTokenAddress,
        address oracleAddress,
        uint loanTokenAmountFilled,
        uint initialMarginAmount)
        public
        view
        returns (uint collateralTokenAmount)
    {
        collateralTokenAmount = _getCollateralRequired(
            loanTokenAddress,
            collateralTokenAddress,
            oracleAddress,
            loanTokenAmountFilled,
            initialMarginAmount);
    }

    function _preSign(
        address signer,
        bytes32 hash,
        bytes memory signature)
        internal
    {
        if (signer != msg.sender) {
            require(
                _isValidSignature(
                    signer,
                    hash,
                    signature
                ),
                "INVALID_SIGNATURE"
            );
        }
        preSigned[hash][signer] = true;
    }
}

