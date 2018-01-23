pragma solidity ^0.4.9;
//pragma experimental ABIEncoderV2;

import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import './B0xOwnable.sol';

import './EMACollector.sol';
import './GasRefunder.sol';
import './B0xVault.sol';
import './B0xTypes.sol';
import './Helpers.sol';

import './interfaces/EIP20.sol';
import './interfaces/B0x_Oracle_Interface.sol';

import './simulations/KyberWrapper.sol';


/*
TODO:
B0xOracle liquidation should be called from B0x
(B0xOracle must be B0xOwned)

 for when B0x does need to be called, use non-ABI call solution

 also: fix GasRefunder.. from solidity doc:
 Symbols introduced in the modifier are not visible in the function (as they might change by overriding).!!!
*/
//import './B0x_Interface.sol';/// <--- maybe get rid of this

contract B0xOracle is B0x_Oracle_Interface, EMACollector, GasRefunder, B0xTypes, Helpers, B0xOwnable {
    using SafeMath for uint256;
    
    // Percentage of interest retained as fee
    // Must be between 0 and 100
    uint8 public interestFeeRate = 10;

    address public KYBER_CONTRACT;

    // Only the owner (b0x contract) can directly deposit ether
    function() public payable {}

    function B0xOracle(
        address _vault_contract,
        address _kyber_contract) 
        public
        payable
    {
        VAULT_CONTRACT = _vault_contract;
        KYBER_CONTRACT = _kyber_contract;


        // settings for EMACollector
        emaValue = 20 * 10**9 wei; // set an initial price average for gas (20 gwei)
        emaPeriods = 10; // set periods to use for EMA calculation
    }

    function orderIsTaken(
        address taker,
        bytes32 loanOrderHash,
        uint gasUsed)
        public
        onlyB0x
        refundsGas(taker, emaValue, gasUsed) // refunds based on collected gas price EMA
        updatesEMA(tx.gasprice) {

        return;
    }

    function tradeIsOpened(
        bytes32 loanOrderHash,
        address trader,
        address tradeTokenAddress,
        uint tradeTokenAmount,
        uint gasUsed)
        public
        onlyB0x
        updatesEMA(tx.gasprice) {

        return;
    }

    function interestIsPaid(
        bytes32 loanOrderHash,
        address trader,
        address interestTokenAddress,
        uint amountOwed,
        uint gasUsed)
        public
        onlyB0x
        updatesEMA(tx.gasprice) {

        // interestFeeRate is only editable by ower
        //uint interestFee = amountOwed * interestFeeRate / 100;


    }


    function closeTrade(
        bytes32 loanOrderHash)
        public
        onlyB0x
        returns (bool tradeSuccess)
    {
        Trade memory activeTrade = TradeStruct(loanOrderHash, msg.sender);
        if (!activeTrade.active) {
            //LogErrorText("error: trade not found or not active", 0, loanOrderHash);
            //return boolOrRevert(false);
            return false;
        }

        return true;
    }

    function liquidateTrade(
        bytes32 loanOrderHash,
        address trader)
        public
        onlyB0x
        //refundsGas(taker, emaValue, gasUsed) // refunds based on collected gas price EMA
        returns (bool tradeSuccess)
    {
        // traders should call closeTrade to close their own trades
        require(trader != msg.sender);
        
        Trade memory activeTrade = TradeStruct(loanOrderHash, trader);
        if (!activeTrade.active) {
            //LogErrorText("error: trade not found or not active", 0, loanOrderHash);
            //return boolOrRevert(false);
            return false;
        }

        uint liquidationLevel = getMarginRatio(loanOrderHash, trader);
        if (liquidationLevel > 100) {
            //LogErrorText("error: margin above liquidation level", liquidationLevel, loanOrderHash);
            //return boolOrRevert(false);
            return false;
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
        bytes32 loanOrderHash,
        address trader)
        public
        view
        returns (uint level)
    {
        level = 200;
        /*
        TODO: convert the strunct fuction to build from the raw bytes
        
        LoanOrder memory loanOrder = LoanOrderStruct(loanOrderHash);
        if (loanOrder.orderHash != loanOrderHash) {
            //LogErrorText("error: invalid lend order", 0, loanOrderHash);
            //return intOrRevert(999);
            return 999;
        }

        Loan memory loan = LoanStruct(loanOrderHash, trader);
        if (loan.loanTokenAmountFilled == 0) {
            //LogErrorText("error: loan not found for specified loanOrder and trader", 0, loanOrderHash);
            //return intOrRevert(999);
            return 999;
        }

        Trade memory activeTrade = TradeStruct(loanOrderHash, trader);
        if (!activeTrade.active) {
            //LogErrorText("error: trade not found or not active", 0, loanOrderHash);
            //return intOrRevert(999);
            return 999;
        }

        var (marginToLendRate, tradeToMarginRate) = getRateData(
            activeTrade.tradeTokenAddress,//loanOrder.loanTokenAddress,
            activeTrade.tradeTokenAddress,//loanOrder.collateralTokenAddress,
            activeTrade.tradeTokenAddress
        );
        if (marginToLendRate == 0) {
            //LogErrorText("error: conversion rate from collateralTokenAddress to loanToken is 0 or not found", 0, loanOrderHash);
            //return intOrRevert(999);
            return 999;
        }
        if (tradeToMarginRate == 0) {
            //LogErrorText("error: conversion rate from tradeToken to collateralTokenAddress is 0 or not found", 0, loanOrderHash);
            //return intOrRevert(999);
            return 999;
        }

        uint currentMarginPercent = (activeTrade.tradeTokenAmountFilled / 
                        //(B0xVault(VAULT_CONTRACT).marginBalanceOf(loanOrder.collateralTokenAddress, trader) * tradeToMarginRate)) * 100;
                        (B0xVault(VAULT_CONTRACT).marginBalanceOf(activeTrade.tradeTokenAddress, trader) * tradeToMarginRate)) * 100;
        
        // a level <= 100 means the order should be liquidated        
        //level = currentMarginPercent - loanOrder.liquidationMarginAmount + 100;
        level = currentMarginPercent - 5 + 100;
        */
    }

    function shouldLiquidate(
        bytes32 loanOrderHash,
        address trader)
        public
        view
        returns (bool)
    {
        return (getMarginRatio(loanOrderHash, trader) <= 100);
    }

    function getRateData(
        address loanTokenAddress,
        address collateralTokenAddress,
        address tradeTokenAddress)
        public 
        view 
        returns (uint marginToLendRate, uint tradeToMarginRate)
    {   
        uint loanTokenDecimals = getDecimals(EIP20(loanTokenAddress));
        uint collateralTokenAddressDecimals = getDecimals(EIP20(collateralTokenAddress));
        uint tradeTokenDecimals;

        if (tradeTokenAddress != address(0)) {
            tradeTokenDecimals = getDecimals(EIP20(tradeTokenAddress));

            marginToLendRate = (KyberWrapper(KYBER_CONTRACT).getKyberPrice(collateralTokenAddress, loanTokenAddress)
                                     * (10**loanTokenDecimals)) / (10**collateralTokenAddressDecimals);
            
            tradeToMarginRate = (KyberWrapper(KYBER_CONTRACT).getKyberPrice(tradeTokenAddress, collateralTokenAddress)
                                     * (10**collateralTokenAddressDecimals)) / (10**tradeTokenDecimals);
        } else {
            marginToLendRate = (KyberWrapper(KYBER_CONTRACT).getKyberPrice(collateralTokenAddress, loanTokenAddress)
                                     * (10**loanTokenDecimals)) / (10**collateralTokenAddressDecimals);

            tradeToMarginRate = 0;
        }
    }

    // helpers

    function LoanOrderStruct (
        bytes32 loanOrderHash
    )
        internal
        view
        returns (LoanOrder)
    {
        return;
        /*
        var (addrs,uints) = B0x_Interface(B0X_CONTRACT).getLoanOrder(loanOrderHash);
        
        return LoanOrder({
            maker: addrs[0],
            loanTokenAddress: addrs[1],
            interestTokenAddress: addrs[2],
            collateralTokenAddress: addrs[3],
            feeRecipientAddress: addrs[4],
            oracleAddress: addrs[5],
            loanTokenAmount: uints[0],
            interestAmount: uints[1],
            initialMarginAmount: uints[2],
            liquidationMarginAmount: uints[3],
            lenderRelayFee: uints[4],
            traderRelayFee: uints[5],
            expirationUnixTimestampSec: uints[6],
            orderHash: loanOrderHash
        });*/
    }
    
    function TradeStruct (
        bytes32 loanOrderHash,
        address trader
    )
        internal
        view
        returns (Trade)
    {
        return;
        /*
        var (v1,v2,v3,v4,v5,v6) = B0x_Interface(B0X_CONTRACT).trades(loanOrderHash, trader);
        return Trade(v1,v2,v3,v4,v5,v6);*/
    }
    
    function LoanStruct (
        bytes32 loanOrderHash,
        address trader
    )
        internal
        view
        returns (Loan)
    {
        return;
        /*var (v1,v2,v3,v4,v5,v6) = B0x_Interface(B0X_CONTRACT).loans(loanOrderHash, trader);
        return Loan(v1,v2,v3,v4,v5,v6);*/
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
        onlyB0x
    {
        require(newRate >= 0 && newRate <= 100);
        interestFeeRate = newRate;
    }

    /*function setB0xContractAddress(
        address newAddress) 
        public
        onlyB0x
    {
        require(newAddress != B0X_CONTRACT && newAddress != address(0));
        B0X_CONTRACT = newAddress;
    }*/

    function setVaultContractAddress(
        address newAddress) 
        public
        onlyB0x
    {
        require(newAddress != VAULT_CONTRACT && newAddress != address(0));
        VAULT_CONTRACT = newAddress;
    }

    function setEMAPeriods (
        uint8 _newEMAPeriods)
        public
        onlyB0x {
        require(_newEMAPeriods > 1 && _newEMAPeriods != emaPeriods);
        emaPeriods = _newEMAPeriods;
    }
}
