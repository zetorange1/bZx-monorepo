pragma solidity ^0.4.9;
//pragma experimental ABIEncoderV2;

import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import 'zeppelin-solidity/contracts/ownership/Ownable.sol';

import './B0x.sol';
import './B0xVault.sol';

import './interfaces/Liquidation_Oracle_Interface.sol';
import './interfaces/EIP20.sol';

import './simulations/KyberWrapper.sol';

contract B0xOracle is Ownable, Liquidation_Oracle_Interface {
    using SafeMath for uint256;
    
    // Percentage of interest retained as fee
    // Must be between 0 and 100
    uint8 public interestFeeRate = 10;

    address public B0X_CONTRACT;

    address public VAULT_CONTRACT;
    address public KYBER_CONTRACT;

    /*
    TODO: tracking gas expenses for later refund:

    uint gas_remaining = msg.gas;
    //irrelevant code....
    uint refund = (gas_remaining - msg.gas) * tx.gasprice;

    */

    function B0xOracle (
        address _b0x_contract,
        address _vault_contract,
        address _kyber_contract
    ) 
        public
    {
        B0X_CONTRACT = _b0x_contract;
        VAULT_CONTRACT = _vault_contract;
        KYBER_CONTRACT = _kyber_contract;
    }

    function closeTrade(
        bytes32 lendOrderHash)
        public
        returns (bool tradeSuccess)
    {
        return liquidateTrade(lendOrderHash, msg.sender);
    }

    function liquidateTrade(
        bytes32 lendOrderHash,
        address trader)
        public
        returns (bool tradeSuccess)
    {
        Trade memory activeTrade = TradeStruct(lendOrderHash, trader);
        if (!activeTrade.active) {
            //LogErrorText("error: trade not found or not active", 0, lendOrderHash);
            //return boolOrRevert(false);
            return false;
        }
        
        if (trader != msg.sender) {
            uint liquidationLevel = getMarginRatio(lendOrderHash, trader);
            if (liquidationLevel > 100) {
                //LogErrorText("error: margin above liquidation level", liquidationLevel, lendOrderHash);
                //return boolOrRevert(false);
                return false;
            }
        }

        
        
        /*
        OrderAddresses memory orderAddresses = openTradeAddresses[orderHash];
        OrderValues memory orderValues = openTradeValues[orderHash];
        
        uint tradeAmount = openTrades[orderHash];

        //closedOrders[orderHash] = true;
*/
        return true;
    }

    function getMarginRatio(
        bytes32 lendOrderHash,
        address trader)
        public
        view
        returns (uint level)
    {
        /*LendOrder memory lendOrder = LendOrderStruct(lendOrderHash);
        if (lendOrder.orderHash != lendOrderHash) {
            //LogErrorText("error: invalid lend order", 0, lendOrderHash);
            //return intOrRevert(999);
            return 999;
        }*/

        FilledOrder memory filledOrder = FilledOrderStruct(lendOrderHash, trader);
        if (filledOrder.lendTokenAmountFilled == 0) {
            //LogErrorText("error: filled order not found for specified lendOrder and trader", 0, lendOrderHash);
            //return intOrRevert(999);
            return 999;
        }

        Trade memory activeTrade = TradeStruct(lendOrderHash, trader);
        if (!activeTrade.active) {
            //LogErrorText("error: trade not found or not active", 0, lendOrderHash);
            //return intOrRevert(999);
            return 999;
        }

        var (marginToLendRate, tradeToMarginRate) = getRateData(
            activeTrade.tradeTokenAddress,//lendOrder.lendTokenAddress,
            activeTrade.tradeTokenAddress,//lendOrder.marginTokenAddress,
            activeTrade.tradeTokenAddress
        );
        if (marginToLendRate == 0) {
            //LogErrorText("error: conversion rate from marginToken to lendToken is 0 or not found", 0, lendOrderHash);
            //return intOrRevert(999);
            return 999;
        }
        if (tradeToMarginRate == 0) {
            //LogErrorText("error: conversion rate from tradeToken to marginToken is 0 or not found", 0, lendOrderHash);
            //return intOrRevert(999);
            return 999;
        }

        uint currentMarginPercent = (activeTrade.tradeTokenAmountFilled / 
                        //(B0xVault(VAULT_CONTRACT).marginBalanceOf(lendOrder.marginTokenAddress, trader) * tradeToMarginRate)) * 100;
                        (B0xVault(VAULT_CONTRACT).marginBalanceOf(activeTrade.tradeTokenAddress, trader) * tradeToMarginRate)) * 100;
        
        // a level <= 100 means the order should be liquidated        
        //level = currentMarginPercent - lendOrder.liquidationMarginAmount + 100;
        level = currentMarginPercent - 5 + 100;
    }

    function shouldLiquidate(
        bytes32 lendOrderHash,
        address trader)
        public
        view
        returns (bool)
    {
        return (getMarginRatio(lendOrderHash, trader) <= 100);
    }

    function getRateData(
        address lendTokenAddress,
        address marginTokenAddress,
        address tradeTokenAddress)
        public 
        view 
        returns (uint marginToLendRate, uint tradeToMarginRate)
    {   
        uint lendTokenDecimals = getDecimals(EIP20(lendTokenAddress));
        uint marginTokenDecimals = getDecimals(EIP20(marginTokenAddress));
        uint tradeTokenDecimals;

        if (tradeTokenAddress != address(0)) {
            tradeTokenDecimals = getDecimals(EIP20(tradeTokenAddress));

            marginToLendRate = (KyberWrapper(KYBER_CONTRACT).getKyberPrice(marginTokenAddress, lendTokenAddress)
                                     * (10**lendTokenDecimals)) / (10**marginTokenDecimals);
            
            tradeToMarginRate = (KyberWrapper(KYBER_CONTRACT).getKyberPrice(tradeTokenAddress, marginTokenAddress)
                                     * (10**marginTokenDecimals)) / (10**tradeTokenDecimals);
        } else {
            marginToLendRate = (KyberWrapper(KYBER_CONTRACT).getKyberPrice(marginTokenAddress, lendTokenAddress)
                                     * (10**lendTokenDecimals)) / (10**marginTokenDecimals);

            tradeToMarginRate = 0;
        }
    }

    // helpers

    /*function LendOrderStruct (
        bytes32 lendOrderHash
    )
        internal
        view
        returns (LendOrder)
    {
        var (v1,v2,v3,v4,v5,v6,v7,v8,v9,) = B0x(B0X_CONTRACT).orders(lendOrderHash);
        
        return;
        return LendOrder({
            maker: addrs[0],
            lendTokenAddress: addrs[1],
            interestTokenAddress: addrs[2],
            marginTokenAddress: addrs[3],
            feeRecipientAddress: addrs[4],
            oracleAddress: addrs[5],
            lendTokenAmount: uints[0],
            interestAmount: uints[1],
            initialMarginAmount: uints[2],
            liquidationMarginAmount: uints[3],
            lenderRelayFee: uints[4],
            traderRelayFee: uints[5],
            expirationUnixTimestampSec: uints[6],
            orderHash: lendOrderHash
        });
    }*/
    
    function TradeStruct (
        bytes32 lendOrderHash,
        address trader
    )
        internal
        view
        returns (Trade)
    {
        var (v1,v2,v3,v4) = B0x(B0X_CONTRACT).trades(lendOrderHash, trader);
        return Trade(v1,v2,v3,v4);
    }
    
    function FilledOrderStruct (
        bytes32 lendOrderHash,
        address trader
    )
        internal
        view
        returns (FilledOrder)
    {
        var (v1,v2,v3,v4) = B0x(B0X_CONTRACT).orderFills(lendOrderHash, trader);
        return FilledOrder(v1,v2,v3,v4);
    }

    function getDecimals(EIP20 token) 
        internal
        view 
        returns(uint)
    {
        return token.decimals();
    }

    function setInterestFeeRate(
        uint8 newRate) 
        public
        onlyOwner
    {
        require(newRate >= 0 && newRate <= 100);
        interestFeeRate = newRate;
    }

    function setB0xContractAddress(
        address newAddress) 
        public
        onlyOwner
    {
        require(newAddress != B0X_CONTRACT && newAddress != address(0));
        B0X_CONTRACT = newAddress;
    }

    function setVaultContractAddress(
        address newAddress) 
        public
        onlyOwner
    {
        require(newAddress != VAULT_CONTRACT && newAddress != address(0));
        VAULT_CONTRACT = newAddress;
    }
}
