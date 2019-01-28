/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
 
pragma solidity 0.5.3;

import "../tokens/EIP20.sol";
import "../tokens/EIP20Wrapper.sol";
import "../modifiers/BZxOwnable.sol";

import "./ExchangeInterface.sol";
import "./BZxTo0xShared.sol";


contract BZxTo0x is BZxTo0xShared, EIP20Wrapper, BZxOwnable {
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
        external {
        revert();
    }

   function take0xTrade(
        address trader,
        address vaultAddress,
        uint256 sourceTokenAmountToUse,
        bytes memory orderData0x, // 0x order arguments, converted to hex, padded to 32 bytes and concatenated
        bytes memory signature0x) // ECDSA of the 0x order
        public
        onlyBZx
        returns (
            address destTokenAddress,
            uint256 destTokenAmount,
            uint256 sourceTokenUsedAmount)
    {
        (address[5][] memory orderAddresses0x, uint256[6][] memory orderValues0x) = getOrderValuesFromData(orderData0x);

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
        bytes memory orderData0x)
        public
        pure
        returns (
            address[5][] memory orderAddresses,
            uint256[6][] memory orderValues)
    {
        address maker;
        address taker;
        address makerToken;
        address takerToken;
        address feeRecipient;
        uint256 makerTokenAmount;
        uint256 takerTokenAmount;
        uint256 makerFee;
        uint256 takerFee;
        uint256 expirationTimestampInSec;
        uint256 salt;
        orderAddresses = new address[5][](orderData0x.length/352);
        orderValues = new uint256[6][](orderData0x.length/352);
        for (uint256 i = 0; i < orderData0x.length/352; i++) {
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
        bytes memory signatures)
        public
        pure
        returns (
            uint8[] memory vs,
            bytes32[] memory rs,
            bytes32[] memory ss)
    {
        vs = new uint8[](signatures.length/65);
        rs = new bytes32[](signatures.length/65);
        ss = new bytes32[](signatures.length/65);
        for (uint256 i = 0; i < signatures.length/65; i++) {
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
        uint256 value)
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
        uint256 sourceTokenAmountToUse,
        address[5][] memory orderAddresses0x,
        uint256[6][] memory orderValues0x,
        bytes memory signature)
        internal
        returns (uint256 sourceTokenUsedAmount, uint256 destTokenAmount)
    {
        uint256[4] memory summations; // takerTokenAmountTotal, makerTokenAmountTotal, zrxTokenAmount, takerTokenRemaining
        summations[3] = sourceTokenAmountToUse; // takerTokenRemaining

        for (uint256 i = 0; i < orderAddresses0x.length; i++) {
            // Note: takerToken is confirmed to be the same in 0x for batch orders
            require(orderAddresses0x[i][2] == orderAddresses0x[0][2], "makerToken must be the same for each order"); // // makerToken (aka destTokenAddress) must be the same for each order

            summations[0] = summations[0].add(orderValues0x[i][1]); // takerTokenAmountTotal
            summations[1] = summations[1].add(orderValues0x[i][0]); // makerTokenAmountTotal

            // calculate required takerFee
            if (summations[3] > 0 && orderAddresses0x[i][4] != address(0) && // feeRecipient
                    orderValues0x[i][3] > 0 // takerFee
            ) {
                if (summations[3] >= orderValues0x[i][1]) {
                    summations[2] = summations[2].add(orderValues0x[i][3]); // takerFee
                    summations[3] = summations[3].sub(orderValues0x[i][1]); // takerTokenAmount
                } else {
                    summations[2] = summations[2].add(_safeGetPartialAmountFloor(
                        summations[3],
                        orderValues0x[i][1], // takerTokenAmount
                        orderValues0x[i][3] // takerFee
                    ));
                    summations[3] = 0;
                }
            }
        }

        if (summations[2] > 0) {
            // The 0x TokenTransferProxy already has unlimited transfer allowance for ZRX from this contract (set during deployment of this contract)
            eip20TransferFrom(
                zrxTokenContract,
                trader,
                address(this),
                summations[2]);
        }

        (uint8[] memory v, bytes32[] memory r, bytes32[] memory s) = getSignatureParts(signature);

        // Make sure there is enough allowance for 0x Exchange Proxy to transfer the sourceToken needed for the 0x trade
        // orderAddresses0x[0][3] -> takerToken/sourceToken
        uint256 tempAllowance = EIP20(orderAddresses0x[0][3]).allowance(address(this), tokenTransferProxyContract);
        if (tempAllowance < sourceTokenAmountToUse) {
            if (tempAllowance > 0) {
                // reset approval to 0
                eip20Approve(
                    orderAddresses0x[0][3],
                    tokenTransferProxyContract,
                    0);
            }

            eip20Approve(
                orderAddresses0x[0][3],
                tokenTransferProxyContract,
                sourceTokenAmountToUse);
        }

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

        destTokenAmount = _safeGetPartialAmountFloor(
            sourceTokenUsedAmount,
            summations[0], // takerTokenAmountTotal (aka sourceTokenAmount)
            summations[1]  // makerTokenAmountTotal (aka destTokenAmount)
        );
    }
}
