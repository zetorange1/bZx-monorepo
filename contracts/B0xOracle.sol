pragma solidity ^0.4.9;

import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import './B0xOwnable.sol';

import './B0xTypes.sol';

import './interfaces/Liquidation_Oracle_Interface.sol';

contract B0xOracle is B0xOwnable, Liquidation_Oracle_Interface, B0xTypes {
    using SafeMath for uint256;
    
    // Percentage of interest retained as fee
    // Must be between 0 and 100
    uint8 interestFeeRate = 10;

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
        Trade memory activeTrade = trades[lendOrderHash][trader];
        if (!activeTrade.active) {
            LogErrorText("error: trade not found or not active", 0, lendOrderHash);
            return boolOrRevert(false);
        }
        
        if (trader != msg.sender) {
            uint liquidationLevel = getLiquidationLevel(lendOrderHash, trader);
            if (liquidationLevel > 100) {
                LogErrorText("error: margin above liquidation level", liquidationLevel, lendOrderHash);
                return boolOrRevert(false);
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
        internal
        view
        returns (uint level)
    {
        LendOrder memory lendOrder = orders[lendOrderHash];
        if (lendOrder.orderHash != lendOrderHash) {
            //LogErrorText("error: invalid lend order", 0, lendOrderHash);
            return intOrRevert(999);
        }

        FilledOrder memory filledOrder = orderFills[lendOrderHash][trader];
        if (filledOrder.lendTokenAmountFilled == 0) {
            //LogErrorText("error: filled order not found for specified lendOrder and trader", 0, lendOrderHash);
            return intOrRevert(999);
        }

        Trade memory activeTrade = trades[lendOrderHash][trader];
        if (!activeTrade.active) {
            //LogErrorText("error: trade not found or not active", 0, lendOrderHash);
            return intOrRevert(999);
        }

        RateData memory rateData = _getRateData(
            lendOrder.lendTokenAddress,
            lendOrder.marginTokenAddress,
            activeTrade.tradeTokenAddress
        );
        if (rateData.marginToLendRate == 0) {
            //LogErrorText("error: conversion rate from marginToken to lendToken is 0 or not found", 0, lendOrderHash);
            return intOrRevert(999);
        }
        if (rateData.tradeToMarginRate == 0) {
            //LogErrorText("error: conversion rate from tradeToken to marginToken is 0 or not found", 0, lendOrderHash);
            return intOrRevert(999);
        }

        uint currentMarginPercent = (activeTrade.tradeTokenAmountFilled / 
                        (B0xVault(VAULT_CONTRACT).marginBalanceOf(lendOrder.marginTokenAddress, trader) * rateData.tradeToMarginRate)) * 100;
        
        // a level <= 100 means the order should be liquidated        
        level = currentMarginPercent - lendOrder.liquidationMarginAmount + 100;
    }
}
