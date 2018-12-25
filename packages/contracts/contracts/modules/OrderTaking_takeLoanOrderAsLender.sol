/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.2;
pragma experimental ABIEncoderV2;

import "../openzeppelin-solidity/Math.sol";

import "../proxy/BZxProxiable.sol";
import "../shared/OrderTakingFunctions.sol";


contract OrderTaking_takeLoanOrderAsLender is BZxStorage, BZxProxiable, OrderTakingFunctions {
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
        targets[bytes4(keccak256("takeLoanOrderAsLender(address[8],uint256[11],bytes,bytes)"))] = _target;
    }

    /// @dev Takes the order as lender
    /// @param orderAddresses Array of order's makerAddress, loanTokenAddress, interestTokenAddress, collateralTokenAddress, feeRecipientAddress, oracleAddress, takerAddress, tradeTokenToFillAddress.
    /// @param orderValues Array of order's loanTokenAmount, interestAmount, initialMarginAmount, maintenanceMarginAmount, lenderRelayFee, traderRelayFee, maxDurationUnixTimestampSec, expirationUnixTimestampSec, makerRole (0=lender, 1=trader), withdrawOnOpen, and salt.
    /// @param oracleData An arbitrary length bytes stream to pass to the oracle.
    /// @param signature ECDSA signature in raw bytes (rsv).
    /// @return Total amount of loanToken borrowed (uint).
    /// @dev Lenders have to fill the entire desired amount the trader wants to borrow.
    /// @dev This makes loanTokenAmountFilled = loanOrder.loanTokenAmount.
    function takeLoanOrderAsLender(
        address[8] calldata orderAddresses,
        uint[11] calldata orderValues,
        bytes calldata oracleData,
        bytes calldata signature)
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

        LoanOrderAux memory loanOrderAux = orderAux[loanOrderHash];
        
        // lenders have to fill the entire uncanceled loanTokenAmount
        uint loanTokenAmountFilled = orderValues[0].sub(_getUnavailableLoanTokenAmount(loanOrderHash));
        LoanOrder memory loanOrder = _takeLoanOrder(
            loanOrderHash,
            orderAddresses[3], // collateralTokenFilled
            loanTokenAmountFilled,
            0, // takerRole
            loanOrderAux.withdrawOnOpen
        );

        if (!loanOrderAux.withdrawOnOpen && loanOrderAux.tradeTokenToFillAddress != address(0)) {
            _fillTradeToken(
                loanOrder,
                orderAddresses[0], // trader
                loanOrderAux.tradeTokenToFillAddress
            );
        }

        return loanTokenAmountFilled;
    }
}

