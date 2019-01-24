/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.2;
pragma experimental ABIEncoderV2;

import "../openzeppelin-solidity/Math.sol";

import "../proxy/BZxProxiable.sol";
import "../shared/OrderTakingFunctions.sol";


contract OrderTaking_takeLoanOrderAsTrader is BZxStorage, BZxProxiable, OrderTakingFunctions {
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
        targets[bytes4(keccak256("takeLoanOrderAsTrader(address[8],uint256[11],bytes,address,uint256,address,bool,bytes)"))] = _target;
    }

    /// @dev Takes the order as trader
    /// @param orderAddresses Array of order's makerAddress, loanTokenAddress, interestTokenAddress, collateralTokenAddress, feeRecipientAddress, oracleAddress, takerAddress, tradeTokenToFillAddress.
    /// @param orderValues Array of order's loanTokenAmount, interestAmount, initialMarginAmount, maintenanceMarginAmount, lenderRelayFee, traderRelayFee, maxDurationUnixTimestampSec, expirationUnixTimestampSec, makerRole (0=lender, 1=trader), withdrawOnOpen, and salt.
    /// @param oracleData An arbitrary length bytes stream to pass to the oracle.
    /// @param collateralTokenFilled Desired address of the collateralTokenAddress the trader wants to use.
    /// @param loanTokenAmountFilled Desired amount of loanToken the trader wants to borrow.
    /// @param tradeTokenToFillAddress If non-zero address, will swap the loanToken for this asset using the oracle.
    /// @param withdrawOnOpen If true, will overcollateralize the loan and withdraw the position token to the trader's wallet. If set, tradeTokenToFillAddress is ignored.
    /// @param signature ECDSA signature in raw bytes (rsv).
    /// @return Total amount of loanToken borrowed (uint256).
    /// @dev Traders can take a portion of the total coin being lended (loanTokenAmountFilled).
    /// @dev Traders also specify the token that will fill the margin requirement if they are taking the order.
    function takeLoanOrderAsTrader(
        address[8] calldata orderAddresses,
        uint256[11] calldata orderValues,
        bytes calldata oracleData,
        address collateralTokenFilled,
        uint256 loanTokenAmountFilled,
        address tradeTokenToFillAddress,
        bool withdrawOnOpen,
        bytes calldata signature)
        external
        nonReentrant
        tracksGas
        returns (uint256)
    {
        bytes32 loanOrderHash = _addLoanOrder(
            msg.sender,
            orderAddresses,
            orderValues,
            oracleData,
            signature);

        // Lenders that are makers can change the relative interest amount for new loans once the loan order is on-chain.
        // We check for this change here, which invalidates the off-chain order object.
        LoanOrder memory loanOrder = orders[loanOrderHash];
        require (loanOrder.interestAmount.mul(10**18).div(loanOrder.loanTokenAmount) == orderValues[1].mul(10**18).div(orderValues[0]),
            "takeLoanOrderAsTrader: order invalidated by maker"
        );

        loanOrder = _takeLoanOrder(
            msg.sender,
            loanOrderHash,
            collateralTokenFilled,
            loanTokenAmountFilled,
            1, // takerRole
            withdrawOnOpen
        );

        if (!withdrawOnOpen && tradeTokenToFillAddress != address(0)) {
            _fillTradeToken(
                loanOrder,
                msg.sender, // trader
                tradeTokenToFillAddress
            );
        }

        return loanTokenAmountFilled;
    }
}

