/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/math/Math.sol";

import "./BZxProxyContracts.sol";
import "../shared/OrderTakingFunctions.sol";


contract BZxOrderTakingOnChain is BZxStorage, Proxiable, OrderTakingFunctions {
    using SafeMath for uint256;

    constructor() public {}

    function initialize(
        address _target)
        public
        onlyOwner
    {
        targets[0x2e02a716] = _target; // bytes4(keccak256("pushLoanOrderOnChain(address[6],uint256[10],bytes)"))
        targets[0x60e2fbe3] = _target; // bytes4(keccak256("takeLoanOrderOnChainAsTrader(bytes32,address,uint256)"))
        targets[0xd6cc0c14] = _target; // bytes4(keccak256("takeLoanOrderOnChainAsLender(bytes32)"))
        targets[0x53609b03] = _target; // bytes4(keccak256("getLoanOrderHash(address[6],uint256[10])"))
        targets[0x238a4d1e] = _target; // bytes4(keccak256("isValidSignature(address,bytes32,bytes)"))
        targets[0x8823d53c] = _target; // bytes4(keccak256("getInitialCollateralRequired(address,address,address,uint256,uint256)"))
    }

    /// @dev Pushes an order on chain
    /// @param orderAddresses Array of order's makerAddress, loanTokenAddress, interestTokenAddress, collateralTokenAddress, feeRecipientAddress, oracleAddress.
    /// @param orderValues Array of order's loanTokenAmount, interestAmount, initialMarginAmount, maintenanceMarginAmount, lenderRelayFee, traderRelayFee, maxDurationUnixTimestampSec, expirationUnixTimestampSec, makerRole (0=lender, 1=trader), and salt.
    /// @param signature ECDSA signature in raw bytes (rsv).
    /// @return A unique hash representing the loan order.
    function pushLoanOrderOnChain(
        address[6] orderAddresses,
        uint[10] orderValues,
        bytes signature)        
        external
        nonReentrant
        tracksGas
        returns (bytes32)
    {
        bytes32 loanOrderHash = _addLoanOrder(
            orderAddresses,
            orderValues,
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

    /// @dev Takes the order as trader that's already pushed on chain
    /// @param loanOrderHash A unique hash representing the loan order.
    /// @return Total amount of loanToken borrowed (uint).
    /// @dev Traders can take a portion of the total coin being lended (loanTokenAmountFilled).
    /// @dev Traders also specify the token that will fill the margin requirement if they are taking the order.
    function takeLoanOrderOnChainAsTrader(
        bytes32 loanOrderHash,
        address collateralTokenFilled,
        uint loanTokenAmountFilled)
        external
        nonReentrant
        tracksGas
        returns (uint)
    {
        return _takeLoanOrder(
            loanOrderHash,
            collateralTokenFilled,
            loanTokenAmountFilled,
            1 // takerRole
        );
    }

    /// @dev Takes the order as lender that's already pushed on chain
    /// @param loanOrderHash A unique hash representing the loan order.
    /// @return Total amount of loanToken borrowed (uint).
    /// @dev Lenders have to fill the entire desired amount the trader wants to borrow.
    /// @dev This makes loanTokenAmountFilled = loanOrder.loanTokenAmount.
    function takeLoanOrderOnChainAsLender(
        bytes32 loanOrderHash)
        external
        nonReentrant
        tracksGas
        returns (uint)
    {
        // lenders have to fill the entire uncanceled loanTokenAmount
        return _takeLoanOrder(
            loanOrderHash,
            orders[loanOrderHash].collateralTokenAddress,
            orders[loanOrderHash].loanTokenAmount.sub(_getUnavailableLoanTokenAmount(loanOrderHash)),
            0 // takerRole
        );
    }

    /// @dev Calculates Keccak-256 hash of order with specified parameters.
    /// @param orderAddresses Array of order's makerAddress, loanTokenAddress, interestTokenAddress, collateralTokenAddress, feeRecipientAddress, oracleAddress.
    /// @param orderValues Array of order's loanTokenAmount, interestAmount, initialMarginAmount, maintenanceMarginAmount, lenderRelayFee, traderRelayFee, maxDurationUnixTimestampSec, expirationUnixTimestampSec, makerRole (0=lender, 1=trader), and salt.
    /// @return Keccak-256 hash of loanOrder.
    function getLoanOrderHash(
        address[6] orderAddresses,
        uint[10] orderValues)
        public
        view
        returns (bytes32)
    {
        return _getLoanOrderHash(orderAddresses, orderValues);
    }

    /// @dev Verifies that an order signature is valid.
    /// @param signer address of signer.
    /// @param hash Signed Keccak-256 hash.
    /// @param signature ECDSA signature in raw bytes (rsv) + signatureType.
    /// @return Validity of order signature.
    function isValidSignature(
        address signer,
        bytes32 hash,
        bytes signature)
        public
        pure
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
    /// @param initialMarginAmount The initial margin percentage amount (i.e. 50 == 50%)
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
        collateralTokenAmount = _getInitialCollateralRequired(
            loanTokenAddress,
            collateralTokenAddress,
            oracleAddress,
            loanTokenAmountFilled,
            initialMarginAmount);
    }
}

