/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
 
pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../tokens/EIP20.sol";
import "../tokens/EIP20Wrapper.sol";
import "../modifiers/BZxOwnable.sol";

import "./ExchangeInterface.sol";


contract BZxTo0x is EIP20Wrapper, BZxOwnable {
    using SafeMath for uint256;

    address public exchangeContract;
    address public zrxTokenContract;
    address public tokenTransferProxyContract;

    constructor(
        address _exchange,
        address _zrxToken,
        address _proxy)
        public
    {
        exchangeContract = _exchange;
        zrxTokenContract = _zrxToken;
        tokenTransferProxyContract = _proxy;
    }

    function()
        public {
        revert();
    }

   function take0xTrade(
        address trader,
        address vaultAddress,
        uint sourceTokenAmountToUse,
        bytes orderData0x, // 0x order arguments, converted to hex, padded to 32 bytes and concatenated
        bytes signature0x) // ECDSA of the 0x order
        public
        onlyBZx
        returns (
            address destTokenAddress,
            uint destTokenAmount,
            uint sourceTokenUsedAmount)
    {
        (address[5][] memory orderAddresses0x, uint[6][] memory orderValues0x) = getOrderValuesFromData(orderData0x);

        (sourceTokenUsedAmount, destTokenAmount) = _take0xTrade(
            trader,
            sourceTokenAmountToUse,
            orderAddresses0x,
            orderValues0x,
            signature0x);

        if (sourceTokenUsedAmount < sourceTokenAmountToUse) {
            // all sourceToken has to be traded
            revert("BZxTo0x::take0xTrade: sourceTokenUsedAmount < sourceTokenAmountToUse");
        }

        // transfer the destToken to the vault
        eip20Transfer(
            orderAddresses0x[0][2],
            vaultAddress,
            destTokenAmount);

        destTokenAddress = orderAddresses0x[0][2]; // makerToken (aka destTokenAddress)
    }

    function getOrderValuesFromData(
        bytes orderData0x)
        public
        pure
        returns (
            address[5][] orderAddresses,
            uint[6][] orderValues)
    {
        address maker;
        address taker;
        address makerToken;
        address takerToken;
        address feeRecipient;
        uint makerTokenAmount;
        uint takerTokenAmount;
        uint makerFee;
        uint takerFee;
        uint expirationTimestampInSec;
        uint salt;
        orderAddresses = new address[5][](orderData0x.length/352);
        orderValues = new uint[6][](orderData0x.length/352);
        for (uint i = 0; i < orderData0x.length/352; i++) {
            assembly {
                maker := mload(add(orderData0x, add(mul(i, 352), 32)))
                taker := mload(add(orderData0x, add(mul(i, 352), 64)))
                makerToken := mload(add(orderData0x, add(mul(i, 352), 96)))
                takerToken := mload(add(orderData0x, add(mul(i, 352), 128)))
                feeRecipient := mload(add(orderData0x, add(mul(i, 352), 160)))
                makerTokenAmount := mload(add(orderData0x, add(mul(i, 352), 192)))
                takerTokenAmount := mload(add(orderData0x, add(mul(i, 352), 224)))
                makerFee := mload(add(orderData0x, add(mul(i, 352), 256)))
                takerFee := mload(add(orderData0x, add(mul(i, 352), 288)))
                expirationTimestampInSec := mload(add(orderData0x, add(mul(i, 352), 320)))
                salt := mload(add(orderData0x, add(mul(i, 352), 352)))
            }
            orderAddresses[i] = [
                maker,
                taker,
                makerToken,
                takerToken,
                feeRecipient
            ];
            orderValues[i] = [
                makerTokenAmount,
                takerTokenAmount,
                makerFee,
                takerFee,
                expirationTimestampInSec,
                salt
            ];
        }
    }

    /// @param signatures ECDSA signatures in raw bytes (rsv).
    function getSignatureParts(
        bytes signatures)
        public
        pure
        returns (
            uint8[] vs,
            bytes32[] rs,
            bytes32[] ss)
    {
        vs = new uint8[](signatures.length/65);
        rs = new bytes32[](signatures.length/65);
        ss = new bytes32[](signatures.length/65);
        for (uint i = 0; i < signatures.length/65; i++) {
            uint8 v;
            bytes32 r;
            bytes32 s;
            assembly {
                r := mload(add(signatures, add(mul(i, 65), 32)))
                s := mload(add(signatures, add(mul(i, 65), 64)))
                v := mload(add(signatures, add(mul(i, 65), 65)))
            }
            if (v < 27) {
                v = v + 27;
            }
            vs[i] = v;
            rs[i] = r;
            ss[i] = s;
        }
    }

    /// @dev Calculates partial value given a numerator and denominator.
    /// @param numerator Numerator.
    /// @param denominator Denominator.
    /// @param target Value to calculate partial of.
    /// @return Partial value of target.
    function getPartialAmount(uint numerator, uint denominator, uint target)
        public
        pure
        returns (uint)
    {
        return SafeMath.div(SafeMath.mul(numerator, target), denominator);
    }

    function set0xExchange (
        address _exchange)
        public
        onlyOwner
    {
        exchangeContract = _exchange;
    }

    function setZRXToken (
        address _zrxToken)
        public
        onlyOwner
    {
        zrxTokenContract = _zrxToken;
    }

    function set0xTokenProxy (
        address _proxy)
        public
        onlyOwner
    {
        tokenTransferProxyContract = _proxy;
    }

    function approveFor (
        address token,
        address spender,
        uint value)
        public
        onlyOwner
        returns (bool)
    {
        eip20Approve(
            token,
            spender,
            value);

        return true;
    }

    function _take0xTrade(
        address trader,
        uint sourceTokenAmountToUse,
        address[5][] orderAddresses0x,
        uint[6][] orderValues0x,
        bytes signature)
        internal
        returns (uint sourceTokenUsedAmount, uint destTokenAmount)
    {
        uint[3] memory summations; // takerTokenAmountTotal, makerTokenAmountTotal, zrxTokenAmount

        for (uint i = 0; i < orderAddresses0x.length; i++) {
            // Note: takerToken is confirmed to be the same in 0x for batch orders
            require(orderAddresses0x[i][2] == orderAddresses0x[0][2], "makerToken must be the same for each order"); // // makerToken (aka destTokenAddress) must be the same for each order

            summations[0] += orderValues0x[i][1]; // takerTokenAmountTotal
            summations[1] += orderValues0x[i][0]; // makerTokenAmountTotal

            if (orderAddresses0x[i][4] != address(0) && // feeRecipient
                    orderValues0x[i][3] > 0 // takerFee
            ) {
                summations[2] += orderValues0x[i][3]; // zrxTokenAmount
            }
        }
        if (summations[2] > 0) {
            // The 0x TokenTransferProxy already has unlimited transfer allowance for ZRX from this contract (set during deployment of this contract)
            eip20TransferFrom(
                zrxTokenContract,
                trader,
                this,
                summations[2]);
        }

        (uint8[] memory v, bytes32[] memory r, bytes32[] memory s) = getSignatureParts(signature);

        // Increase the allowance for 0x Exchange Proxy to transfer the sourceToken needed for the 0x trade
        // orderAddresses0x[0][3] -> takerToken/sourceToken
        eip20Approve(
            orderAddresses0x[0][3],
            tokenTransferProxyContract,
            EIP20(orderAddresses0x[0][3]).allowance(this, tokenTransferProxyContract).add(sourceTokenAmountToUse));

        if (orderAddresses0x.length > 1) {
            sourceTokenUsedAmount = ExchangeInterface(exchangeContract).fillOrdersUpTo(
                orderAddresses0x,
                orderValues0x,
                sourceTokenAmountToUse,
                false, // shouldThrowOnInsufficientBalanceOrAllowance
                v,
                r,
                s);
        } else {
            sourceTokenUsedAmount = ExchangeInterface(exchangeContract).fillOrder(
                orderAddresses0x[0],
                orderValues0x[0],
                sourceTokenAmountToUse,
                false, // shouldThrowOnInsufficientBalanceOrAllowance
                v[0],
                r[0],
                s[0]);
        }

        destTokenAmount = getPartialAmount(
            sourceTokenUsedAmount,
            summations[0], // takerTokenAmountTotal (aka sourceTokenAmount)
            summations[1]  // makerTokenAmountTotal (aka destTokenAmount)
        );
    }
}
