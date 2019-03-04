/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
 
pragma solidity 0.5.3;
pragma experimental ABIEncoderV2;

import "../tokens/EIP20.sol";
import "../tokens/EIP20Wrapper.sol";
import "../modifiers/BZxOwnable.sol";

import "./ExchangeV2Interface.sol";
import "./BZxTo0xShared.sol";


contract BZxTo0xV2 is BZxTo0xShared, EIP20Wrapper, BZxOwnable {
    using SafeMath for uint256;

    event LogFillResults(
        uint256 makerAssetFilledAmount,
        uint256 takerAssetFilledAmount,
        uint256 makerFeePaid,
        uint256 takerFeePaid
    );

    bool public DEBUG = false;

    address public exchangeV2Contract;
    address public zrxTokenContract;
    address public erc20ProxyContract;

    constructor(
        address _exchangeV2,
        address _zrxToken,
        address _proxy)
        public
    {
        exchangeV2Contract = _exchangeV2;
        zrxTokenContract = _zrxToken;
        erc20ProxyContract = _proxy;
    }

    function()
        external {
        revert();
    }

    // 0xc78429c4 == "take0xV2Trade(address,address,uint256,(address,address,address,address,uint256,uint256,uint256,uint256,uint256,uint256,bytes,bytes)[],bytes[])"
    function take0xV2Trade(
        address trader,
        address vaultAddress,
        uint256 sourceTokenAmountToUse,
        ExchangeV2Interface.OrderV2[] memory orders0x, // Array of 0x V2 order structs
        bytes[] memory signatures0x) // Array of signatures for each of the V2 orders
        public
        onlyBZx
        returns (
            address destTokenAddress,
            uint256 destTokenAmount,
            uint256 sourceTokenUsedAmount)
    {
        address sourceTokenAddress;

        //destTokenAddress==makerToken, sourceTokenAddress==takerToken
        (destTokenAddress, sourceTokenAddress) = getV2Tokens(orders0x[0]);

        (sourceTokenUsedAmount, destTokenAmount) = _take0xV2Trade(
            trader,
            sourceTokenAddress,
            sourceTokenAmountToUse,
            orders0x,
            signatures0x);

        if (sourceTokenUsedAmount < sourceTokenAmountToUse) {
            // all sourceToken has to be traded
            revert("BZxTo0xV2::take0xTrade: sourceTokenUsedAmount < sourceTokenAmountToUse");
        }

        // transfer the destToken to the vault
        eip20Transfer(
            destTokenAddress,
            vaultAddress,
            destTokenAmount);
    }

    /// @dev Calculates partial value given a numerator and denominator.
    /// @param numerator Numerator.
    /// @param denominator Denominator.
    /// @param target Value to calculate partial of.
    /// @return Partial value of target.
    function getPartialAmount(uint256 numerator, uint256 denominator, uint256 target)
        public
        pure
        returns (uint256)
    {
        return SafeMath.div(SafeMath.mul(numerator, target), denominator);
    }

    /// @dev Extracts the maker and taker token addresses from the 0x V2 order object.
    /// @param order 0x V2 order object.
    /// @return makerTokenAddress and takerTokenAddress.
    function getV2Tokens(
        ExchangeV2Interface.OrderV2 memory order)
        public
        pure
        returns (
            address makerTokenAddress,
            address takerTokenAddress)
    {
        bytes memory makerAssetData = order.makerAssetData;
        bytes memory takerAssetData = order.takerAssetData;
        bytes4 makerProxyID;
        bytes4 takerProxyID;

        // example data: 0xf47261b00000000000000000000000001dc4c1cefef38a777b15aa20260a54e584b16c48
        assembly {
            makerProxyID := mload(add(makerAssetData, 32))
            takerProxyID := mload(add(takerAssetData, 32))

            makerTokenAddress := mload(add(makerAssetData, 36))
            takerTokenAddress := mload(add(takerAssetData, 36))
        }

        // ERC20 Proxy ID -> bytes4(keccak256("ERC20Token(address)")) = 0xf47261b0
        require(makerProxyID == 0xf47261b0 && takerProxyID == 0xf47261b0, "BZxTo0xV2::getV2Tokens: 0x V2 orders must use ERC20 tokens");
    }

    function set0xV2Exchange (
        address _exchange)
        public
        onlyOwner
    {
        exchangeV2Contract = _exchange;
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
        erc20ProxyContract = _proxy;
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

    function toggleDebug (
        bool isDebug)
        public
        onlyOwner
    {
        DEBUG = isDebug;
    }

    function _take0xV2Trade(
        address trader,
        address sourceTokenAddress,
        uint256 sourceTokenAmountToUse,
        ExchangeV2Interface.OrderV2[] memory orders0x, // Array of 0x V2 order structs
        bytes[] memory signatures0x)
        internal
        returns (uint256 sourceTokenUsedAmount, uint256 destTokenAmount)
    {
        uint256 zrxTokenAmount = 0;
        uint256 takerAssetRemaining = sourceTokenAmountToUse;
        for (uint256 i = 0; i < orders0x.length; i++) {
            // Note: takerAssetData (sourceToken) is confirmed to be the same in 0x for batch orders
            // To confirm makerAssetData is the same for each order, rather than doing a more expensive per order bytes
            // comparison, we will simply set makerAssetData the same in each order to the first value observed. The 0x
            // trade will fail for invalid orders.
            if (i > 0)
                orders0x[i].makerAssetData = orders0x[0].makerAssetData;

            // calculate required takerFee
            if (takerAssetRemaining > 0 && orders0x[i].takerFee > 0) { // takerFee
                if (takerAssetRemaining >= orders0x[i].takerAssetAmount) {
                    zrxTokenAmount = zrxTokenAmount.add(orders0x[i].takerFee);
                    takerAssetRemaining = takerAssetRemaining.sub(orders0x[i].takerAssetAmount);
                } else {
                    zrxTokenAmount = zrxTokenAmount.add(_safeGetPartialAmountFloor(
                        takerAssetRemaining,
                        orders0x[i].takerAssetAmount,
                        orders0x[i].takerFee
                    ));
                    takerAssetRemaining = 0;
                }
            }
        }

        if (zrxTokenAmount > 0) {
            // The 0x erc20ProxyContract already has unlimited transfer allowance for ZRX from this contract (set during deployment of this contract)
            eip20TransferFrom(
                zrxTokenContract,
                trader,
                address(this),
                zrxTokenAmount);
        }

        // Make sure there is enough allowance for 0x Exchange Proxy to transfer the sourceToken needed for the 0x trade
        uint256 tempAllowance = EIP20(sourceTokenAddress).allowance(address(this), erc20ProxyContract);
        if (tempAllowance < sourceTokenAmountToUse) {
            if (tempAllowance > 0) {
                // reset approval to 0
                eip20Approve(
                    sourceTokenAddress,
                    erc20ProxyContract,
                    0);
            }

            eip20Approve(
                sourceTokenAddress,
                erc20ProxyContract,
                sourceTokenAmountToUse);
        }

        ExchangeV2Interface.FillResults memory fillResults;
        if (orders0x.length > 1) {
            fillResults = ExchangeV2Interface(exchangeV2Contract).marketSellOrdersNoThrow(
                orders0x,
                sourceTokenAmountToUse,
                signatures0x);
        } else {
            fillResults = ExchangeV2Interface(exchangeV2Contract).fillOrderNoThrow(
                orders0x[0],
                sourceTokenAmountToUse,
                signatures0x[0]);
        }

        if (zrxTokenAmount > 0 && fillResults.takerFeePaid < zrxTokenAmount) {
            // refund unused ZRX token (if any)
            eip20Transfer(
                zrxTokenContract,
                trader,
                zrxTokenAmount.sub(fillResults.takerFeePaid));
        }

        if (DEBUG) {
            emit LogFillResults(
                fillResults.makerAssetFilledAmount,
                fillResults.takerAssetFilledAmount,
                fillResults.makerFeePaid,
                fillResults.takerFeePaid
            );
        }

        sourceTokenUsedAmount = fillResults.takerAssetFilledAmount;
        destTokenAmount = fillResults.makerAssetFilledAmount;
    }
}
