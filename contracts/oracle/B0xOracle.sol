
pragma solidity 0.4.18;

import 'zeppelin-solidity/contracts/math/SafeMath.sol';

import '../modifiers/B0xOwnable.sol';

import '../modifiers/EMACollector.sol';
import '../modifiers/GasRefunder.sol';
import '../B0xVault.sol';
import '../shared/B0xTypes.sol';
import '../shared/Helpers.sol';

import '../tokens/EIP20.sol';
import '../interfaces/Oracle_Interface.sol';

import './B0xToKyber.sol';


/*
TODO:
B0xOracle liquidation should be called from B0x
(B0xOracle must be B0xOwned)

 for when B0x does need to be called, use non-ABI call solution

 also: fix GasRefunder.. from solidity doc:
 Symbols introduced in the modifier are not visible in the function (as they might change by overriding).!!!
*/
//import './B0x_Interface.sol';/// <--- maybe get rid of this

contract B0xOracle is Oracle_Interface, EMACollector, GasRefunder, B0xTypes, Helpers, B0xOwnable {
    using SafeMath for uint256;
    
    // Percentage of interest retained as fee
    // Must be between 0 and 100
    uint8 public interestFeeRate = 10;

    // The max percentage amount above the liquidation level that will trigger a liquidation of positions
    uint8 liquidationThreshold = 10;

    address public VAULT_CONTRACT;
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


    function didTakeOrder(
        address taker,
        bytes32 loanOrderHash,
        uint gasUsed)
        public
        onlyB0x
        refundsGas(taker, emaValue, gasUsed) // refunds based on collected gas price EMA
        updatesEMA(tx.gasprice) {}

    function didOpenTrade(
        bytes32 loanOrderHash,
        address trader,
        address tradeTokenAddress,
        uint tradeTokenAmount,
        uint gasUsed)
        public
        onlyB0x
        updatesEMA(tx.gasprice) {}

    function didPayInterest(
        bytes32 loanOrderHash,
        address trader,
        address lender,
        address interestTokenAddress,
        uint amountOwed,
        uint gasUsed)
        public
        onlyB0x
        updatesEMA(tx.gasprice) {

        // interestFeeRate is only editable by ower
        uint interestFee = amountOwed * interestFeeRate / 100;

        // Transfers the interest to the lender, less the interest fee.
        // The fee is retained by the oracle.
        if (!EIP20(interestTokenAddress).transfer(lender, amountOwed.sub(interestFee)))
            revert();
    }

    function didCloseTrade(
        bytes32 loanOrderHash,
        address trader,
        bool isLiquidation,
        uint gasUsed)
        public
        onlyB0x
        updatesEMA(tx.gasprice) {}

    function didDepositCollateral(
        address taker,
        bytes32 loanOrderHash,
        uint gasUsed)
        public
        onlyB0x
        updatesEMA(tx.gasprice) {}

    function didChangeCollateral(
        address taker,
        bytes32 loanOrderHash,
        uint gasUsed)
        public
        onlyB0x
        updatesEMA(tx.gasprice) {}




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

        
        uint marginRatio = getMarginRatio(loanOrderHash, trader);
        if (marginRatio > 100) {
            //LogErrorText("error: margin above liquidation level", marginRatio, loanOrderHash);
            //return boolOrRevert(false);
            return false;
        }
        /*
        function _sellTradeToken()
            internal
            returns (bool tradeSuccess)
        {
            
        
        // record trade in b0x
        tradeList[msg.sender].push(loanOrder.orderHash);

        Trade storage openTrade = trades[loanOrder.orderHash][msg.sender];
        openTrade.tradeTokenAddress = tradeTokenAddress;
        openTrade.tradeTokenAmount = tradeTokenAmount;
        openTrade.loanTokenUsedAmount = loanTokenUsedAmount;
        openTrade.filledUnixTimestampSec = block.timestamp;
        openTrade.listPosition = tradeList[msg.sender].length-1;
        openTrade.active = true;

        //##here -> TODO: when trades close mark active = false and remove orderHas from tradeList


        }

*/
        /*
        OrderAddresses memory orderAddresses = openTradeAddresses[orderHash];
        OrderValues memory orderValues = openTradeValues[orderHash];
        
        uint tradeAmount = openTrades[orderHash];

        //closedOrders[orderHash] = true;
*/
        return true;
    }


    // Should return a ratio of currentMarginAmount / liquidationMarginAmount
    function getMarginRatio(
        bytes32 loanOrderHash,
        address trader)
        public
        view
        returns (uint level)
    {
        return 200;

        /*LoanOrder memory loanOrder = getLoanOrder(loanOrderHash);
        if (loanOrder.orderHash != loanOrderHash) {
            //LogErrorText("error: invalid loan order", 0, loanOrderHash);
            //return intOrRevert(999);
            return 999;
        }*/
        /*
        TODO: convert the strunct fuction to build from the raw bytes
        
        LoanOrder memory loanOrder = LoanOrderStruct(loanOrderHash);
        if (loanOrder.orderHash != loanOrderHash) {
            //LogErrorText("error: invalid loan order", 0, loanOrderHash);
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

        uint collateralToLendRate = getTokenPrice(
            activeTrade.tradeTokenAddress,//loanOrder.loanTokenAddress,
            activeTrade.tradeTokenAddress,//loanOrder.collateralTokenAddress
        );
        var (collateralToLendRate, tradeToCollateralRate) = getTokenPrice(
            activeTrade.tradeTokenAddress,//loanOrder.loanTokenAddress,
            activeTrade.tradeTokenAddress,//loanOrder.collateralTokenAddress,
            activeTrade.tradeTokenAddress
        );
        if (collateralToLendRate == 0) {
            //LogErrorText("error: conversion rate from collateralTokenAddress to loanToken is 0 or not found", 0, loanOrderHash);
            //return intOrRevert(999);
            return 999;
        }
        if (tradeToCollateralRate == 0) {
            //LogErrorText("error: conversion rate from tradeToken to collateralTokenAddress is 0 or not found", 0, loanOrderHash);
            //return intOrRevert(999);
            return 999;
        }

        uint currentMarginPercent = (activeTrade.tradeTokenAmountFilled / 
                        //(B0xVault(VAULT_CONTRACT).marginBalanceOf(loanOrder.collateralTokenAddress, trader) * tradeToCollateralRate)) * 100;
                        (B0xVault(VAULT_CONTRACT).marginBalanceOf(activeTrade.tradeTokenAddress, trader) * tradeToCollateralRate)) * 100;
        
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
        return (getMarginRatio(loanOrderHash, trader) <= (100+uint(liquidationThreshold)));
    }

    function getTokenPrice(
        address sourceTokenAddress,
        address destTokenAddress)
        public
        view 
        returns (uint rate)
    {   
        /*uint sourceTokenDecimals = getDecimals(EIP20(sourceTokenAddress));
        uint destTokenDecimals = getDecimals(EIP20(destTokenAddress));*/
        
        rate = B0xToKyber(KYBER_CONTRACT).getKyberRate(sourceTokenAddress, destTokenAddress);
                                // * (10**destTokenDecimals)) / (10**sourceTokenDecimals);
    }

    // helpers

    function getLoanOrderBytes (
        bytes32 loanOrderHash
    )
        internal
        view
        returns (LoanOrder)
    {
        return;

        //todo: get rid of this, instead pass in loan order bytes

        //B0x_Interface(B0X_CONTRACT).getLoanOrder(loanOrderHash);
    }


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

    /*function getDecimals(EIP20 token) 
        internal
        view 
        returns(uint)
    {
        return token.decimals();
    }*/

    function setInterestFeeRate(
        uint8 newRate) 
        public
        onlyOwner
    {
        require(newRate != interestFeeRate && newRate >= 0 && newRate <= 100);
        interestFeeRate = newRate;
    }

    function setLiquidationThreshold(
        uint8 newValue) 
        public
        onlyOwner
    {
        require(newValue != liquidationThreshold);
        liquidationThreshold = newValue;
    }

    /*function setB0xContractAddress(
        address newAddress) 
        public
        onlyOwner
    {
        require(newAddress != B0X_CONTRACT && newAddress != address(0));
        B0X_CONTRACT = newAddress;
    }*/

    function setVaultContractAddress(
        address newAddress) 
        public
        onlyOwner
    {
        require(newAddress != VAULT_CONTRACT && newAddress != address(0));
        VAULT_CONTRACT = newAddress;
    }

    function setEMAPeriods (
        uint8 _newEMAPeriods)
        public
        onlyOwner {
        require(_newEMAPeriods > 1 && _newEMAPeriods != emaPeriods);
        emaPeriods = _newEMAPeriods;
    }
}
