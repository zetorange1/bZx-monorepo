/*

  Copyright 2017 Tom Bean
  Parts copyright 2017 ZeroEx Intl.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.

*/

pragma solidity ^0.4.9;

// helpers
import './helpers/Ownable.sol';

import './B0xVault.sol';
import './interfaces/Exchange0x_Interface.sol';

// SIMULATIONS (TO BE REMOVED PRIOR TO MAINNET DEPLOYMENT)
import './simulations/ERC20_AlwaysOwned.sol';
import './simulations/KyberWrapper.sol';

contract B0x is Ownable {
    using SafeMath for uint256;

    // Error Codes
    /*enum Errors {
        ORDER_EXPIRED,                    // Order has already expired
        ORDER_FULLY_FILLED_OR_CANCELLED,  // Order has already been fully filled or cancelled
        ROUNDING_ERROR_TOO_LARGE,         // Rounding error too large
        INSUFFICIENT_BALANCE_OR_ALLOWANCE // Insufficient balance or allowance for token transfer
    }*/

    string constant public VERSION = "1.0.0";
    uint16 constant public EXTERNAL_QUERY_GAS_LIMIT = 4999; // Changes to state require at least 5000 gas

    //uint constant PRECISION = (10**18);

    address public LOAN_TOKEN_CONTRACT;
    address public VAULT_CONTRACT;
    address public KYBER_CONTRACT;
    address public EXCHANGE0X_CONTRACT;
    address public ZRX_TOKEN_CONTRACT;

    struct LendOrder {
        address maker;
        address lendTokenAddress;
        address interestTokenAddress;
        address marginTokenAddress;
        address feeRecipientAddress;
        uint lendTokenAmount;
        uint interestAmount;
        uint initialMarginAmount;
        uint liquidationMarginAmount;
        uint lenderRelayFee;
        uint traderRelayFee;
        uint expirationUnixTimestampSec;
        bytes32 orderHash;
    }

    struct FilledOrder {
        address lender;
        uint marginTokenAmountFilled;
        uint lendTokenAmountFilled;
        uint filledUnixTimestampSec;
    }

    struct Trade {
        address tradeTokenAddress;
        uint tradeTokenAmountFilled;
        uint filledUnixTimestampSec;
        bool active;
    }

    struct RateData {
        uint marginToLendRate;
        uint tradeToMarginRate;
    }

    mapping (bytes32 => uint) public filled; // mapping of orderHash to lendTokenAmount filled
    mapping (bytes32 => uint) public cancelled; // mapping of orderHash to lendTokenAmount cancelled
    mapping (bytes32 => LendOrder) public orders; // mapping of orderHash to taken lendOrders
    mapping (bytes32 => mapping (address => FilledOrder)) public orderFills; // mapping of orderHash to mapping of traders to lendOrder fills
    mapping (bytes32 => mapping (address => Trade)) public trades; // mapping of orderHash to mapping of traders to active trades

    mapping (bytes32 => mapping (address => uint)) public interestPaid; // mapping of orderHash to mapping of traders to amount of interest paid so far to a lender

    mapping (address => bytes32) public orderList;
    mapping (address => bytes32) public tradeList;

    bool DEBUG = true;

    event LogFill(
        address indexed trader,
        address indexed lender,
        address indexed feeRecipientAddress,
        address lendTokenAddress,
        address interestTokenAddress,
        address marginTokenAddress,
        uint lendTokenAmountFilled,
        uint interestAmount,
        uint initialMarginAmount,
        uint liquidationMarginAmount,
        uint lenderRelayFee,
        uint traderRelayFee,
        uint expirationUnixTimestampSec,
        //bytes32 indexed tokens, // keccak256(makerToken, takerToken), allows subscribing to a token pair
        bytes32 orderHash
    );

    /*event LogCancel(
        address indexed maker,
        address indexed feeRecipient,
        address makerToken,
        address takerToken,
        uint cancelledMakerTokenAmount,
        uint cancelledLendTokenAmount,
        bytes32 indexed tokens,
        bytes32 orderHash
    );*/

    //event LogError(uint8 indexed errorId, bytes32 indexed orderHash);
    event LogErrorText(string errorTxt, uint errorValue, bytes32 indexed orderHash);


    function() public {
        revert();
    }

    function B0x(address _loanToken, address _vault, address _kyber, address _0xExchange, address _zrxToken) public {
        LOAN_TOKEN_CONTRACT = _loanToken;
        VAULT_CONTRACT = _vault;
        KYBER_CONTRACT = _kyber;
        EXCHANGE0X_CONTRACT = _0xExchange;
        ZRX_TOKEN_CONTRACT = _zrxToken;
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

    function getLiquidationLevel(
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

    function set0xExchange(
        address _0xExchange)
        public
        onlyOwner
    {
        EXCHANGE0X_CONTRACT = _0xExchange;
    }

    function setZRXToken(
        address _zrxToken)
        public
        onlyOwner
    {
        ZRX_TOKEN_CONTRACT = _zrxToken;
    }

/*
    /// @param orderAddresses Array of order's maker, taker, makerToken, takerToken, and feeRecipient.
    /// @param orderValues Array of order's makerTokenAmount, takerTokenAmount, makerFee, takerFee, expirationTimestampInSec, and salt.
    /// @param fillTakerTokenAmount Desired amount of takerToken to fill.
    /// @param shouldThrowOnInsufficientBalanceOrAllowance Test if transfer will fail before attempting.
    /// @param v ECDSA signature parameter v.
    /// @param r ECDSA signature parameters r.
    /// @param s ECDSA signature parameters s.
*/
    function open0xTrade(
        bytes32 lendOrderHash,
        address[5] orderAddresses0x,
        uint[6] orderValues0x,
        uint8 v,
        bytes32 r,
        bytes32 s)
        public
        returns (uint)
    {
        LendOrder memory lendOrder = orders[lendOrderHash];
        if (lendOrder.orderHash != lendOrderHash) {
            LogErrorText("error: invalid lend order", 0, lendOrderHash);
            return intOrRevert(0);
        }

        FilledOrder memory filledOrder = orderFills[lendOrderHash][msg.sender];
        if (filledOrder.lendTokenAmountFilled == 0) {
            LogErrorText("error: filled order not found", 0, lendOrderHash);
            return intOrRevert(0);
        }

        uint liquidationLevel = getLiquidationLevel(lendOrderHash, msg.sender);
        if (liquidationLevel <= 100) {
            // todo: trigger order liquidation!
            LogErrorText("error: lendOrder has been liquidated!", 0, lendOrderHash);
            return intOrRevert(0);
        } else if (liquidationLevel < 110) {
            LogErrorText("error: liquidation Level too low!", 0, lendOrderHash);
            return intOrRevert(0);
        }

        if (orderAddresses0x[4] != address(0) && // feeRecipient
                orderValues0x[1] > 0 // takerTokenAmount
        ) {
            if (!ERC20(ZRX_TOKEN_CONTRACT).transferFrom(msg.sender, this, orderValues0x[1])) {
                LogErrorText("error: b0x can't transfer ZRX from trader", 0, lendOrderHash);
                return intOrRevert(0);
            }
        }

        // 0x order will fail if filledOrder.lendTokenAmountFilled is too high
        uint filledTakerTokenAmount = Exchange0x_Interface(EXCHANGE0X_CONTRACT).fillOrder(
            orderAddresses0x,
            orderValues0x,
            filledOrder.lendTokenAmountFilled,
            true,
            v,
            r,
            s);
        if (filledTakerTokenAmount == 0) {
            LogErrorText("error: 0x order failed!", 0, lendOrderHash);
            return intOrRevert(0);
        }

        uint filledMakerTokenAmount = getPartialAmount(
            filledTakerTokenAmount,
            orderValues0x[1], // takerTokenAmount
            orderValues0x[0] // makerTokenAmount
        );

/*trades

    struct Trade {
        address tradeTokenAddress;
        uint tradeTokenAmountFilled;
        uint filledUnixTimestampSec;
        bool active;
    }

    
        Trade storage filledOrder = trades[lendOrder.orderHash][trader];
        filledOrder.lender = lender;
        filledOrder.marginTokenAmountFilled = marginTokenAmountFilled;
        filledOrder.lendTokenAmountFilled = lendTokenAmountFilled;
        filledOrder.filledUnixTimestampSec = block.timestamp;

        trades[lendOrder.orderHash][trader] = Trade({
            
        })
*/
        LogErrorText("0x order: filledTakerTokenAmount", filledTakerTokenAmount, lendOrderHash);
        LogErrorText("0x order: filledMakerTokenAmount", filledMakerTokenAmount, lendOrderHash);
        LogErrorText("success taking 0x trade!", 0, lendOrderHash);

        return filledMakerTokenAmount;
    }

    function getInterest(
        bytes32 lendOrderHash,
        address trader)
        public
        view
        returns (address lender, address interestTokenAddress, uint totalAmountAccrued, uint interestPaidSoFar)
    {
        LendOrder memory lendOrder = orders[lendOrderHash];
        if (lendOrder.orderHash != lendOrderHash) {
            //LogErrorText("error: invalid lend order", 0, lendOrderHash);
            voidOrRevert(); return;
        }

        FilledOrder memory filledOrder = orderFills[lendOrderHash][trader];
        if (filledOrder.lendTokenAmountFilled == 0) {
            //LogErrorText("error: filled order not found for specified lendOrder and trader", 0, lendOrderHash);
            voidOrRevert(); return;
        }
        
        uint interestTime = block.timestamp;
        if (interestTime > lendOrder.expirationUnixTimestampSec) {
            //LogErrorText("notice: lendOrder has expired", 0, lendOrderHash);
            interestTime = lendOrder.expirationUnixTimestampSec;
        }
        
        lender = filledOrder.lender;
        interestTokenAddress = lendOrder.interestTokenAddress;

        totalAmountAccrued = interestTime.sub(filledOrder.filledUnixTimestampSec) / 86400 * lendOrder.interestAmount * filledOrder.lendTokenAmountFilled / lendOrder.lendTokenAmount;

        interestPaidSoFar = interestPaid[lendOrderHash][trader];
    }

    function payInterest(
        bytes32 lendOrderHash,
        address trader)
        public
        returns (uint)
    {
        address lender;
        address interestTokenAddress;
        uint totalAmountAccrued;
        uint interestPaidSoFar;

        (lender, interestTokenAddress, totalAmountAccrued, interestPaidSoFar) = getInterest(lendOrderHash, trader);

        if (interestPaidSoFar >= totalAmountAccrued) {
            LogErrorText("warning: nothing left to pay for this lendOrderHash and trader", 0, lendOrderHash);
            return intOrRevert(0);
        }

        uint amountToPay = totalAmountAccrued.sub(interestPaidSoFar);
        interestPaid[lendOrderHash][trader] = totalAmountAccrued; // since this function will pay all remaining accured interest
        
        if (! B0xVault(VAULT_CONTRACT).sendInterest(
            interestTokenAddress,
            trader,
            lender,
            amountToPay
        )) {
            LogErrorText("error: unable to pay interest!!", amountToPay, lendOrderHash);
            return intOrRevert(0);
        }

        return amountToPay;
    }

    // traders can take a portion of the total coin being lended (lendTokenAmountFilled)
    // traders also specifiy the token that will fill the margin requirement if they are taking the order
    function takeLendOrderAsTrader(
        address[5] orderAddresses,
        uint[8] orderValues,
        address marginTokenAddressFilled,
        uint lendTokenAmountFilled,
        uint8 v,
        bytes32 r,
        bytes32 s)
        public
        returns (uint)
    {
        LendOrder memory lendOrder = LendOrder({
            maker: orderAddresses[0],
            lendTokenAddress: orderAddresses[1],
            interestTokenAddress: orderAddresses[2],
            marginTokenAddress: marginTokenAddressFilled,
            feeRecipientAddress: orderAddresses[4],
            lendTokenAmount: orderValues[0],
            interestAmount: orderValues[1],
            initialMarginAmount: orderValues[2],
            liquidationMarginAmount: orderValues[3],
            lenderRelayFee: orderValues[4],
            traderRelayFee: orderValues[5],
            expirationUnixTimestampSec: orderValues[6],
            orderHash: getLendOrderHash(orderAddresses, orderValues)
        });

        if (_verifyLendOrder(
            lendOrder,
            lendTokenAmountFilled,
            v,
            r,
            s
        )) {
            lendTokenAmountFilled = _takeLendOrder(
                lendOrder,
                msg.sender,
                lendOrder.maker,
                lendTokenAmountFilled
            );
            
            LogFill(
                msg.sender,
                lendOrder.maker,
                lendOrder.feeRecipientAddress,
                lendOrder.lendTokenAddress,
                lendOrder.interestTokenAddress,
                marginTokenAddressFilled,
                lendTokenAmountFilled,
                lendOrder.interestAmount,
                lendOrder.initialMarginAmount,
                lendOrder.liquidationMarginAmount,
                lendOrder.lenderRelayFee,
                lendOrder.traderRelayFee,
                lendOrder.expirationUnixTimestampSec,
                //keccak256(lendOrder.makerToken, lendOrder.takerToken),
                lendOrder.orderHash
            );

            return lendTokenAmountFilled;
        }
        else {
            return 0;
        }
    }

    // lenders have to fill the entire desired amount the trader wants to borrow
    // this make lendTokenAmountFilled = lendOrder.lendTokenAmount
    function takeLendOrderAsLender(
        address[5] orderAddresses,
        uint[8] orderValues,
        uint8 v,
        bytes32 r,
        bytes32 s)
        public
        returns (uint)
    {
        LendOrder memory lendOrder = LendOrder({
            maker: orderAddresses[0],
            lendTokenAddress: orderAddresses[1],
            interestTokenAddress: orderAddresses[2],
            marginTokenAddress: orderAddresses[3],
            feeRecipientAddress: orderAddresses[4],
            lendTokenAmount: orderValues[0],
            interestAmount: orderValues[1],
            initialMarginAmount: orderValues[2],
            liquidationMarginAmount: orderValues[3],
            lenderRelayFee: orderValues[4],
            traderRelayFee: orderValues[5],
            expirationUnixTimestampSec: orderValues[6],
            orderHash: getLendOrderHash(orderAddresses, orderValues)
        });

        if (_verifyLendOrder(
            lendOrder,
            lendOrder.lendTokenAmount,
            v,
            r,
            s
        )) {
            uint lendTokenAmountFilled = _takeLendOrder(
                lendOrder,
                lendOrder.maker,
                msg.sender,
                lendOrder.lendTokenAmount
            );
            
            LogFill(
                lendOrder.maker,
                msg.sender,
                lendOrder.feeRecipientAddress,
                lendOrder.lendTokenAddress,
                lendOrder.interestTokenAddress,
                lendOrder.marginTokenAddress,
                lendTokenAmountFilled,
                lendOrder.interestAmount,
                lendOrder.initialMarginAmount,
                lendOrder.liquidationMarginAmount,
                lendOrder.lenderRelayFee,
                lendOrder.traderRelayFee,
                lendOrder.expirationUnixTimestampSec,
                //keccak256(lendOrder.makerToken, lendOrder.takerToken),
                lendOrder.orderHash
            );

            return lendTokenAmountFilled;
        }
        else {
            return 0;
        }
    }

    
    /*
    * Constant public functions
    */

    /// @dev Calculates Keccak-256 hash of order with specified parameters.
    /// @param orderAddresses Array of order's maker, lendTokenAddress, interestTokenAddress marginTokenAddress, and feeRecipientAddress.
    /// @param orderValues Array of order's lendTokenAmount, interestAmount, initialMarginAmount, liquidationMarginAmount, lenderRelayFee, traderRelayFee, expirationUnixTimestampSec, and salt
    /// @return Keccak-256 hash of lendOrder.
    function getLendOrderHash(
        address[5] orderAddresses, 
        uint[8] orderValues)
        public
        view
        returns (bytes32)
    {
        return(keccak256(
            address(this),
            orderAddresses[0],  // maker
            orderAddresses[1],  // lendTokenAddress
            orderAddresses[2],  // interestTokenAddress
            orderAddresses[3],  // marginTokenAddress
            orderAddresses[4],  // feeRecipientAddress
            orderValues[0],    // lendTokenAmount
            orderValues[1],    // interestAmount
            orderValues[2],    // initialMarginAmount
            orderValues[3],    // liquidationMarginAmount
            orderValues[4],    // lenderRelayFee
            orderValues[5],    // traderRelayFee
            orderValues[6],    // expirationUnixTimestampSec
            orderValues[7]     // salt
        ));
    }

    /// @dev Verifies that an order signature is valid.
    /// @param signer address of signer.
    /// @param hash Signed Keccak-256 hash.
    /// @param v ECDSA signature parameter v.
    /// @param r ECDSA signature parameters r.
    /// @param s ECDSA signature parameters s.
    /// @return Validity of order signature.
    function isValidSignature(
        address signer,
        bytes32 hash,
        uint8 v,
        bytes32 r,
        bytes32 s)
        public
        pure
        returns (bool)
    {
        return signer == ecrecover(
            keccak256("\x19Ethereum Signed Message:\n32", hash),
            v,
            r,
            s
        );
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

    /// @dev Calculates the sum of values already filled and cancelled for a given lendOrder.
    /// @param orderHash The Keccak-256 hash of the given lendOrder.
    /// @return Sum of values already filled and cancelled.
    function getUnavailableLendTokenAmount(bytes32 orderHash)
        public
        view
        returns (uint)
    {
        return filled[orderHash].add(cancelled[orderHash]);
    }


    /*
    * Internal functions
    */
   

    function _getRateData(
        address lendTokenAddress,
        address marginTokenAddress,
        address tradeTokenAddress)
        internal 
        view 
        returns (RateData)
    {   
        uint lendTokenDecimals = getDecimals(ERC20_AlwaysOwned(lendTokenAddress));
        uint marginTokenDecimals = getDecimals(ERC20_AlwaysOwned(marginTokenAddress));
        uint tradeTokenDecimals;

        if (tradeTokenAddress != address(0)) {
            tradeTokenDecimals = getDecimals(ERC20_AlwaysOwned(tradeTokenAddress));

            return (RateData({
                marginToLendRate: (KyberWrapper(KYBER_CONTRACT).getKyberPrice(marginTokenAddress, lendTokenAddress)
                                     * (10**lendTokenDecimals)) / (10**marginTokenDecimals),
                tradeToMarginRate: (KyberWrapper(KYBER_CONTRACT).getKyberPrice(tradeTokenAddress, marginTokenAddress)
                                     * (10**marginTokenDecimals)) / (10**tradeTokenDecimals)
            }));
        } else {
            return (RateData({
                marginToLendRate: (KyberWrapper(KYBER_CONTRACT).getKyberPrice(marginTokenAddress, lendTokenAddress)
                                     * (10**lendTokenDecimals)) / (10**marginTokenDecimals),
                tradeToMarginRate: 0
            }));
        }
    }

    function _verifyLendOrder(
        LendOrder lendOrder,
        uint lendTokenAmountFilled,
        uint8 v,
        bytes32 r,
        bytes32 s)
        internal
        returns (bool)
    {
        if (lendOrder.maker == msg.sender) {
            LogErrorText("error: invalid taker", 0, lendOrder.orderHash);
            return boolOrRevert(false);
        }
        if (! (lendOrder.lendTokenAddress > 0 && lendOrder.lendTokenAmount > 0)) {
            LogErrorText("error: invalid token params", 0, lendOrder.orderHash);
            return boolOrRevert(false);
        }
        if (block.timestamp >= lendOrder.expirationUnixTimestampSec) {
            //LogError(uint8(Errors.ORDER_EXPIRED), 0, lendOrder.orderHash);
            LogErrorText("error: lendOrder has expired", 0, lendOrder.orderHash);
            return boolOrRevert(false);
        }
        if(! isValidSignature(
            lendOrder.maker,
            lendOrder.orderHash,
            v,
            r,
            s
        )) {
            LogErrorText("error: invalid signiture", 0, lendOrder.orderHash);
            return boolOrRevert(false);
        }

        if(! (lendOrder.liquidationMarginAmount >= 0 && lendOrder.liquidationMarginAmount < lendOrder.initialMarginAmount && lendOrder.initialMarginAmount <= 100)) {
            LogErrorText("error: valid margin parameters", 0, lendOrder.orderHash);
            return boolOrRevert(false);
        }

        uint remainingLendTokenAmount = lendOrder.lendTokenAmount.sub(getUnavailableLendTokenAmount(lendOrder.orderHash));
        if (remainingLendTokenAmount < lendTokenAmountFilled) {
            LogErrorText("error: not enough lendToken still available in thie order", 0, lendOrder.orderHash);
            return boolOrRevert(false);
        }
        /*uint remainingLendTokenAmount = safeSub(lendOrder.lendTokenAmount, getUnavailableLendTokenAmount(lendOrder.orderHash));
        uint filledLendTokenAmount = min256(lendTokenAmountFilled, remainingLendTokenAmount);
        if (filledLendTokenAmount == 0) {
            //LogError(uint8(Errors.ORDER_FULLY_FILLED_OR_CANCELLED), 0, lendOrder.orderHash);
            LogErrorText("error: order is fully filled or cancelled", 0, lendOrder.orderHash);
            return boolOrRevert(false);
        }*/

        /*if (isRoundingError(filledLendTokenAmount, lendOrder.lendTokenAmount)) {
            //LogError(uint8(Errors.ROUNDING_ERROR_TOO_LARGE), 0, lendOrder.orderHash);
            LogErrorText("error: rounding error to large", 0, lendOrder.orderHash);
            return boolOrRevert(false);
        }*/

        return true;
    }

    function _takeLendOrder(
        LendOrder lendOrder,
        address trader,
        address lender,
        uint lendTokenAmountFilled)
        internal
        returns (uint)
    {
        // a trader can only fill a portion or all of a lendOrder once
        // todo: explain reason in the whitepaper:
        //      - avoids complex interest payments for parts of an order filled at different times by the same trader
        //      - avoids potentially large loops when calculating margin reqirements and interest payments
        FilledOrder storage filledOrder = orderFills[lendOrder.orderHash][trader];
        if (filledOrder.lendTokenAmountFilled != 0) {
            LogErrorText("error: lendOrder already filled for this trader", 0, lendOrder.orderHash);
            return intOrRevert(0);
        }

        RateData memory rateData = _getRateData(
            lendOrder.lendTokenAddress,
            lendOrder.marginTokenAddress,
            0
        );
        if (rateData.marginToLendRate == 0) {
            LogErrorText("error: conversion rate from marginToken to lendToken is 0 or not found", 0, lendOrder.orderHash);
            return intOrRevert(0);
        }

        uint marginTokenAmountFilled = _initialMargin(lendOrder.initialMarginAmount, rateData.marginToLendRate, lendTokenAmountFilled);

        uint paidTraderFee;
        uint paidLenderFee;
        orders[lendOrder.orderHash] = lendOrder;
        filled[lendOrder.orderHash] = filled[lendOrder.orderHash].add(lendTokenAmountFilled);

        filledOrder.lender = lender;
        filledOrder.marginTokenAmountFilled = marginTokenAmountFilled;
        filledOrder.lendTokenAmountFilled = lendTokenAmountFilled;
        filledOrder.filledUnixTimestampSec = block.timestamp;

        if (! B0xVault(VAULT_CONTRACT).storeMargin(
            lendOrder.marginTokenAddress,
            trader,
            marginTokenAmountFilled
        )) {
            LogErrorText("error: unable to transfer enough marginToken", 0, lendOrder.orderHash);
            return intOrRevert(lendTokenAmountFilled);
        }

        // total interest required if loan is kept until order expiration
        uint totalInterestRequired = _totalInterestRequired(lendOrder, lendTokenAmountFilled);
        if (! B0xVault(VAULT_CONTRACT).storeInterest(
            lendOrder.interestTokenAddress,
            trader,
            totalInterestRequired
        )) {
            LogErrorText("error: unable to transfer enough interestToken", 0, lendOrder.orderHash);
            return intOrRevert(lendTokenAmountFilled);
        }

        if (! B0xVault(VAULT_CONTRACT).storeFunding(
            lendOrder.lendTokenAddress,
            lender,
            lendTokenAmountFilled
        )) {
            LogErrorText("error: unable to transfer enough lendToken", 0, lendOrder.orderHash);
            return intOrRevert(lendTokenAmountFilled);
        }

        if (lendOrder.feeRecipientAddress != address(0)) {
            if (lendOrder.traderRelayFee > 0) {
                paidTraderFee = getPartialAmount(lendTokenAmountFilled, lendOrder.lendTokenAmount, lendOrder.traderRelayFee);
                
                if (! B0xVault(VAULT_CONTRACT).ensureTokenAndPayValue(
                    LOAN_TOKEN_CONTRACT, 
                    trader,
                    lendOrder.feeRecipientAddress,
                    paidTraderFee
                )) {
                    LogErrorText("error: unable to pay traderRelayFee", 0, lendOrder.orderHash);
                    return intOrRevert(lendTokenAmountFilled);
                }
            }
            if (lendOrder.lenderRelayFee > 0) {
                paidLenderFee = getPartialAmount(lendTokenAmountFilled, lendOrder.lendTokenAmount, lendOrder.lenderRelayFee);
                
                if (! B0xVault(VAULT_CONTRACT).ensureTokenAndPayValue(
                    LOAN_TOKEN_CONTRACT, 
                    lender,
                    lendOrder.feeRecipientAddress,
                    paidLenderFee
                )) {
                    LogErrorText("error: unable to pay lenderRelayFee", 0, lendOrder.orderHash);
                    return intOrRevert(0);
                }
            }
        }

        LogErrorText("success!", 0, lendOrder.orderHash);

        return lendTokenAmountFilled;
    }

    function _initialMargin(
        uint initialMarginAmount,
        uint marginToLendRate,
        uint lendTokenAmountFilled)
        internal
        pure
        returns (uint marginTokenAmountFilled)
    {
        marginTokenAmountFilled = (lendTokenAmountFilled * marginToLendRate * initialMarginAmount / 100);// / PRECISION;

        /*marginTokenAmountFilled = (
                                     (lendTokenAmountFilled * rateData.lendTokenPrice * lendOrder.initialMarginAmount / 100) // initial margin required
                                   + (lendOrder.expirationUnixTimestampSec.sub(block.timestamp) / 86400 * lendOrder.interestAmount * lendTokenAmountFilled / lendOrder.lendTokenAmount) // total interest required if loan is kept until order expiration
        ) / rateData.marginTokenPrice;*/
    }
    
    function _totalInterestRequired(
        LendOrder lendOrder,
        uint lendTokenAmountFilled)
        internal
        view
        returns (uint totalInterestRequired)
    {
        totalInterestRequired = getPartialAmount(lendTokenAmountFilled, lendOrder.lendTokenAmount, (lendOrder.expirationUnixTimestampSec.sub(block.timestamp) / 86400).mul(lendOrder.interestAmount));
    }

    function getDecimals(ERC20_AlwaysOwned token) 
        internal
        view 
        returns(uint)
    {
        return token.decimals();
    }

    function voidOrRevert() 
        internal
        view
    {
        if (!DEBUG) {
            revert();
        }

        return;
    }
    
    function intOrRevert(uint retVal) 
        internal
        view 
        returns (uint)
    {
        if (!DEBUG) {
            revert();
        }

        return retVal;
    }
    function boolOrRevert(bool retVal) 
        internal
        view 
        returns (bool)
    {
        if (!DEBUG) {
            revert();
        }

        return retVal;
    }

}




    /*
 
   /// @dev Cancels the input lendOrder.
    /// @param orderAddresses Array of order's maker, taker, makerToken, takerToken, and feeRecipient.
    /// @param orderValues Array of order's makerTokenAmount, lendTokenAmount, makerFee, takerFee, expirationUnixTimestampSec, and salt.
    /// @param cancelLendTokenAmount Desired amount of takerToken to cancel in lendOrder.
    /// @return Amount of takerToken cancelled.
    function cancelOrder(
        address[5] orderAddresses,
        uint[6] orderValues,
        uint cancelLendTokenAmount)
        public
        returns (uint)
    {
        Order memory order = Order({
            maker: orderAddresses[0],
            taker: orderAddresses[1],
            makerToken: orderAddresses[2],
            takerToken: orderAddresses[3],
            feeRecipient: orderAddresses[4],
            makerTokenAmount: orderValues[0],
            lendTokenAmount: orderValues[1],
            makerFee: orderValues[2],
            takerFee: orderValues[3],
            expirationUnixTimestampSec: orderValues[4],
            orderHash: getLendOrderHash(orderAddresses, orderValues)
        });

        require(lendOrder.maker == msg.sender);
        require(lendOrder.makerTokenAmount > 0 && lendOrder.lendTokenAmount > 0 && cancelLendTokenAmount > 0);

        if (block.timestamp >= lendOrder.expirationUnixTimestampSec) {
            LogError(uint8(Errors.ORDER_EXPIRED), 0, lendOrder.orderHash);
            return 0;
        }

        uint remainingLendTokenAmount = lendOrder.lendTokenAmount.sub(getUnavailableLendTokenAmount(lendOrder.orderHash));
        uint cancelledLendTokenAmount = SafeMath.min256(cancelLendTokenAmount, remainingLendTokenAmount);
        if (cancelledLendTokenAmount == 0) {
            LogError(uint8(Errors.ORDER_FULLY_FILLED_OR_CANCELLED), 0, lendOrder.orderHash);
            return 0;
        }

        cancelled[lendOrder.orderHash] = cancelled[lendOrder.orderHash].add(cancelledLendTokenAmount);

        LogCancel(
            lendOrder.maker,
            lendOrder.feeRecipient,
            lendOrder.makerToken,
            lendOrder.takerToken,
            getPartialAmount(cancelledLendTokenAmount, lendOrder.lendTokenAmount, lendOrder.makerTokenAmount),
            cancelledLendTokenAmount,
            keccak256(lendOrder.makerToken, lendOrder.takerToken),
            lendOrder.orderHash
        );
        return cancelledLendTokenAmount;
    }
    */
    