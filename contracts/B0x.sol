
pragma solidity ^0.4.9;


import './Upgradeable.sol';
import './GasTracker.sol';
import './Helpers.sol';

import './B0xTypes.sol';
import './B0xVault.sol';

import './B0xOracle.sol';

// interfaces
import './interfaces/B0x_Oracle_Interface.sol';
import './interfaces/Exchange0x_Interface.sol';

// SIMULATIONS (TO BE REMOVED PRIOR TO MAINNET DEPLOYMENT)
//import './simulations/ERC20_AlwaysOwned.sol';

// to help prevent reentrancy attacks
import 'zeppelin-solidity/contracts/ReentrancyGuard.sol';


contract B0x is ReentrancyGuard, Upgradeable, GasTracker, Helpers, B0xTypes {
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

    uint constant PRECISION = (10**18);


    address public LOAN_TOKEN_CONTRACT;
    address public SUGAR_TOKEN_CONTRACT;
    address public VAULT_CONTRACT;
    address public ORACLE_CONTRACT;
    address public EXCHANGE0X_CONTRACT;
    address public ZRX_TOKEN_CONTRACT;


    mapping (bytes32 => uint) public filled; // mapping of orderHash to lendTokenAmount filled
    mapping (bytes32 => uint) public cancelled; // mapping of orderHash to lendTokenAmount cancelled
    mapping (bytes32 => LendOrder) public orders; // mapping of orderHash to taken lendOrders
    mapping (bytes32 => mapping (address => FilledOrder)) public orderFills; // mapping of orderHash to mapping of traders to lendOrder fills
    mapping (bytes32 => mapping (address => Trade)) public trades; // mapping of orderHash to mapping of traders to active trades

    mapping (bytes32 => mapping (address => uint)) public interestPaid; // mapping of orderHash to mapping of traders to amount of interest paid so far to a lender

    mapping (address => bytes32) public orderList;
    mapping (address => bytes32) public tradeList;

    /*event LogFill(
        address indexed trader,
        address indexed lender,
        address indexed feeRecipientAddress,
        address lendTokenAddress,
        address interestTokenAddress,
        address collateralTokenAddress,
        address oracleAddress,
        uint lendTokenAmountFilled,
        uint interestAmount,
        uint initialMarginAmount,
        uint liquidationMarginAmount,
        uint lenderRelayFee,
        uint traderRelayFee,
        uint expirationUnixTimestampSec,
        //bytes32 indexed tokens, // keccak256(makerToken, takerToken), allows subscribing to a token pair
        bytes32 orderHash
    );*/

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
        revert;
    }


    function B0x (
        address _loanToken, 
        address _sugarToken, 
        address _vault, 
        address _oracle, 
        address _exchange0x, 
        address _zrxToken) 
        public {

        LOAN_TOKEN_CONTRACT = _loanToken;
        SUGAR_TOKEN_CONTRACT = _sugarToken;
        VAULT_CONTRACT = _vault;
        ORACLE_CONTRACT = _oracle;
        EXCHANGE0X_CONTRACT = _exchange0x;
        ZRX_TOKEN_CONTRACT = _zrxToken;

        // for testing only!
        DEBUG_MODE = true;
    }


    /// @dev Takes the order as trader
    /// @param orderAddresses Array of order's maker, lendTokenAddress, interestTokenAddress collateralTokenAddress, and feeRecipientAddress.
    /// @param orderValues Array of order's lendTokenAmount, interestAmount, initialMarginAmount, liquidationMarginAmount, lenderRelayFee, traderRelayFee, expirationUnixTimestampSec, and salt
    /// @param collateralTokenAddressFilled Desired address of the collateralTokenAddress the trader wants to use.
    /// @param lendTokenAmountFilled Desired amount of lendToken the trader wants to borrow.
    /// @param v ECDSA signature parameter v.
    /// @param r ECDSA signature parameters r.
    /// @param s ECDSA signature parameters s.
    /// @return Total amount of lendToken borrowed (uint).
    /// @dev Traders can take a portion of the total coin being lended (lendTokenAmountFilled).
    /// @dev Traders also specifiy the token that will fill the margin requirement if they are taking the order.
    function takeLendOrderAsTrader(
        address[6] orderAddresses,
        uint[8] orderValues,
        address collateralTokenAddressFilled,
        uint lendTokenAmountFilled,
        uint8 v,
        bytes32 r,
        bytes32 s)
        external
        nonReentrant
        tracksGas
        returns (uint) {

        LendOrder memory lendOrder = _buildLendOrder(orderAddresses, orderValues, collateralTokenAddressFilled);

        if(! isValidSignature(
            lendOrder.maker,
            lendOrder.orderHash,
            v,
            r,
            s
        )) {
            LogErrorText("error: invalid signiture", 0, lendOrder.orderHash);
            return intOrRevert(0);
        }
        
        uint actualLendFill = _takeLendOrder(
            lendOrder,
            msg.sender, // trader
            lendOrder.maker, // lender
            lendTokenAmountFilled
        );

        /*LogFill(
            msg.sender, // trader
            lendOrder.maker, // lender
            lendOrder.feeRecipientAddress,
            lendOrder.lendTokenAddress,
            lendOrder.interestTokenAddress,
            collateralTokenAddressFilled,
            lendOrder.oracleAddress,
            actualLendFill,
            lendOrder.interestAmount,
            lendOrder.initialMarginAmount,
            lendOrder.liquidationMarginAmount,
            lendOrder.lenderRelayFee,
            lendOrder.traderRelayFee,
            lendOrder.expirationUnixTimestampSec,
            //keccak256(lendOrder.makerToken, lendOrder.takerToken),
            lendOrder.orderHash
        );*/

        if (actualLendFill > 0) {
            // allows for custom functionality
            B0x_Oracle_Interface(lendOrder.oracleAddress).orderIsTaken(
                lendOrder.orderHash,
                gasUsed // initial used gas, collected in modifier
            );
        }

        return actualLendFill;
    }

    /// @dev Takes the order as lender
    /// @param orderAddresses Array of order's maker, lendTokenAddress, interestTokenAddress collateralTokenAddress, and feeRecipientAddress.
    /// @param orderValues Array of order's lendTokenAmount, interestAmount, initialMarginAmount, liquidationMarginAmount, lenderRelayFee, traderRelayFee, expirationUnixTimestampSec, and salt
    /// @param v ECDSA signature parameter v.
    /// @param r ECDSA signature parameters r.
    /// @param s ECDSA signature parameters s.
    /// @return Total amount of lendToken borrowed (uint).
    /// @dev Lenders have to fill the entire desired amount the trader wants to borrow.
    /// @dev This makes lendTokenAmountFilled = lendOrder.lendTokenAmount.
    function takeLendOrderAsLender(
        address[6] orderAddresses,
        uint[8] orderValues,
        uint8 v,
        bytes32 r,
        bytes32 s)
        external
        nonReentrant
        tracksGas
        returns (uint) {

        LendOrder memory lendOrder = _buildLendOrder(orderAddresses, orderValues, orderAddresses[3]);

        if(! isValidSignature(
            lendOrder.maker,
            lendOrder.orderHash,
            v,
            r,
            s
        )) {
            LogErrorText("error: invalid signiture", 0, lendOrder.orderHash);
            return intOrRevert(0);
        }
        
        uint actualLendFill = _takeLendOrder(
            lendOrder,
            lendOrder.maker, // trader
            msg.sender, // lender
            lendOrder.lendTokenAmount
        );

        /*LogFill(
            lendOrder.maker, // trader
            msg.sender, // lender
            lendOrder.feeRecipientAddress,
            lendOrder.lendTokenAddress,
            lendOrder.interestTokenAddress,
            lendOrder.collateralTokenAddress,
            lendOrder.oracleAddress,
            actualLendFill,
            lendOrder.interestAmount,
            lendOrder.initialMarginAmount,
            lendOrder.liquidationMarginAmount,
            lendOrder.lenderRelayFee,
            lendOrder.traderRelayFee,
            lendOrder.expirationUnixTimestampSec,
            //keccak256(lendOrder.makerToken, lendOrder.takerToken),
            lendOrder.orderHash
        );*/

        if (actualLendFill > 0) {
            // allows for custom functionality
            B0x_Oracle_Interface(lendOrder.oracleAddress).orderIsTaken(
                lendOrder.orderHash,
                gasUsed // initial used gas, collected in modifier
            );
        }

        return actualLendFill;
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
        external
        nonReentrant
        tracksGas
        returns (uint) {

        LendOrder memory lendOrder = orders[lendOrderHash];
        if (lendOrder.orderHash != lendOrderHash) {
            LogErrorText("error: invalid lend order", 0, lendOrderHash);
            return intOrRevert(0);
        }

        uint tradeTokenAmount = _open0xTrade(
            lendOrder,
            orderAddresses0x,
            orderValues0x,
            v,
            r,
            s);

        if (tradeTokenAmount > 0) {
            // allows for custom functionality
            B0x_Oracle_Interface(lendOrder.oracleAddress).tradeIsOpened(
                lendOrderHash,
                msg.sender, // trader
                orderAddresses0x[2], // makerToken (aka tradeTokenAddress)
                tradeTokenAmount,
                gasUsed // initial used gas, collected in modifier
            );
        }

        return tradeTokenAmount;
    }
    
    function payInterest(
        bytes32 lendOrderHash,
        address trader)
        external
        nonReentrant
        tracksGas
        returns (uint)
    {
        LendOrder memory lendOrder = orders[lendOrderHash];
        if (lendOrder.orderHash != lendOrderHash) {
            //LogErrorText("error: invalid lend order", 0, lendOrderHash);
            voidOrRevert(); return;
        }
        
        InterestData memory interestData = _getInterest(lendOrder,trader);

        if (interestData.interestPaidSoFar >= interestData.totalAmountAccrued) {
            LogErrorText("warning: nothing left to pay for this lendOrderHash and trader", 0, lendOrderHash);
            return intOrRevert(0);
        }

        uint amountOwed = interestData.totalAmountAccrued.sub(interestData.interestPaidSoFar);
        interestPaid[lendOrderHash][trader] = interestData.totalAmountAccrued; // since this function will pay all remaining accured interest
        
        if (! B0xVault(VAULT_CONTRACT).sendInterestToOracle(
            trader,
            interestData.interestTokenAddress,
            orders[lendOrderHash].oracleAddress,
            amountOwed
        )) {
            LogErrorText("error: unable to pay interest!!", amountOwed, lendOrderHash);
            return intOrRevert(0);
        }

        // calls the oracle to signal processing of the interest (ie: paying the lender, retaining fees)
        B0x_Oracle_Interface(lendOrder.oracleAddress).interestIsPaid(
            lendOrderHash,
            trader, // trader
            interestData.interestTokenAddress,
            amountOwed,
            gasUsed // initial used gas, collected in modifier
        );

        return amountOwed;
    }

    /*
    * Constant public functions
    */

    /// @dev Calculates Keccak-256 hash of order with specified parameters.
    /// @param orderAddresses Array of order's maker, lendTokenAddress, interestTokenAddress collateralTokenAddress, and feeRecipientAddress.
    /// @param orderValues Array of order's lendTokenAmount, interestAmount, initialMarginAmount, liquidationMarginAmount, lenderRelayFee, traderRelayFee, expirationUnixTimestampSec, and salt
    /// @return Keccak-256 hash of lendOrder.
    function getLendOrderHash(
        address[6] orderAddresses, 
        uint[8] orderValues)
        public
        view
        returns (bytes32)
    {
        return(keccak256(
            address(this),
            orderAddresses,
            orderValues
        ));
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

   
    function getLendOrder (
        bytes32 lendOrderHash
    )
        public
        view
        returns (address[6],uint[7])
    {
        LendOrder memory lendOrder = orders[lendOrderHash];
        if (lendOrder.orderHash != lendOrderHash) {
            //LogErrorText("error: invalid lend order", 0, lendOrderHash);
            voidOrRevert();
        }

        return (
            [
                lendOrder.maker,
                lendOrder.lendTokenAddress,
                lendOrder.interestTokenAddress,
                lendOrder.collateralTokenAddress,
                lendOrder.feeRecipientAddress,
                lendOrder.oracleAddress
            ],
            [
                lendOrder.lendTokenAmount,
                lendOrder.interestAmount,
                lendOrder.initialMarginAmount,
                lendOrder.liquidationMarginAmount,
                lendOrder.lenderRelayFee,
                lendOrder.traderRelayFee,
                lendOrder.expirationUnixTimestampSec
            ]
        );
    }

    function getInterest(
        bytes32 lendOrderHash,
        address trader)
        public
        view
        returns (address lender, address interestTokenAddress, uint totalAmountAccrued, uint interestPaidSoFar) {

        LendOrder memory lendOrder = orders[lendOrderHash];
        if (lendOrder.orderHash != lendOrderHash) {
            //LogErrorText("error: invalid lend order", 0, lendOrderHash);
            voidOrRevert(); return;
        }

        InterestData memory interestData = _getInterest(lendOrder,trader);
        return (
            interestData.lender,
            interestData.interestTokenAddress,
            interestData.totalAmountAccrued,
            interestData.interestPaidSoFar
        );
    }

    /*
    * Pure functions
    */

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

    /*
    * Constant Internal functions
    */

    function _buildLendOrder(
        address[6] orderAddresses,
        uint[8] orderValues,
        address collateralTokenAddressFilled) 
        internal
        view
        returns (LendOrder) {

        return LendOrder({
            maker: orderAddresses[0],
            lendTokenAddress: orderAddresses[1],
            interestTokenAddress: orderAddresses[2],
            collateralTokenAddress: collateralTokenAddressFilled,
            feeRecipientAddress: orderAddresses[4],
            oracleAddress: orderAddresses[5],
            lendTokenAmount: orderValues[0],
            interestAmount: orderValues[1],
            initialMarginAmount: orderValues[2],
            liquidationMarginAmount: orderValues[3],
            lenderRelayFee: orderValues[4],
            traderRelayFee: orderValues[5],
            expirationUnixTimestampSec: orderValues[6],
            orderHash: getLendOrderHash(orderAddresses, orderValues)
        });
    }

    function _getInterest(
        LendOrder lendOrder,
        address trader)
        internal
        view
        returns (InterestData interestData)
    {
        FilledOrder memory filledOrder = orderFills[lendOrder.orderHash][trader];
        if (filledOrder.lendTokenAmountFilled == 0) {
            //LogErrorText("error: filled order not found for specified lendOrder and trader", 0, lendOrder.orderHash);
            voidOrRevert(); return;
        }
        
        uint interestTime = block.timestamp;
        if (interestTime > lendOrder.expirationUnixTimestampSec) {
            //LogErrorText("notice: lendOrder has expired", 0, lendOrder.orderHash);
            interestTime = lendOrder.expirationUnixTimestampSec;
        }

        interestData = InterestData({
            lender: filledOrder.lender,
            interestTokenAddress: lendOrder.interestTokenAddress,
            totalAmountAccrued: interestTime.sub(filledOrder.filledUnixTimestampSec) / 86400 * lendOrder.interestAmount * filledOrder.lendTokenAmountFilled / lendOrder.lendTokenAmount,
            interestPaidSoFar: interestPaid[lendOrder.orderHash][trader]
        });
    }

    /*
    * Public Internal functions
    */

    function _verifyLendOrder(
        LendOrder lendOrder,
        uint lendTokenAmountFilled)
        internal
        returns (bool)
    {
        if (lendOrder.maker == msg.sender) {
            LogErrorText("error: invalid taker", 0, lendOrder.orderHash);
            return boolOrRevert(false);
        }
        if (lendOrder.lendTokenAddress == address(0) 
            || lendOrder.interestTokenAddress == address(0)
            || lendOrder.collateralTokenAddress == address(0)) {
            LogErrorText("error: one or more token addresses are missing from the order", 0, lendOrder.orderHash);
            return boolOrRevert(false);
        }
        if (lendOrder.oracleAddress == address(0)) {
            LogErrorText("error: must include an oracleAddress", 0, lendOrder.orderHash);
            return boolOrRevert(false);
        }
        if (block.timestamp >= lendOrder.expirationUnixTimestampSec) {
            //LogError(uint8(Errors.ORDER_EXPIRED), 0, lendOrder.orderHash);
            LogErrorText("error: lendOrder has expired", 0, lendOrder.orderHash);
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
        returns (uint) {

        if (!_verifyLendOrder(lendOrder, lendTokenAmountFilled)) {
            LogErrorText("error: lendOrder did not pass validation!", 0, lendOrder.orderHash);
            return intOrRevert(0);
        }
        
        // a trader can only fill a portion or all of a lendOrder once
        // todo: explain reason in the whitepaper:
        //      - avoids complex interest payments for parts of an order filled at different times by the same trader
        //      - avoids potentially large loops when calculating margin reqirements and interest payments
        FilledOrder storage filledOrder = orderFills[lendOrder.orderHash][trader];
        if (filledOrder.lendTokenAmountFilled != 0) {
            LogErrorText("error: lendOrder already filled for this trader", 0, lendOrder.orderHash);
            return intOrRevert(0);
        }

        var (marginToLendRate,) = B0x_Oracle_Interface(lendOrder.oracleAddress).getRateData(
            lendOrder.lendTokenAddress,
            lendOrder.collateralTokenAddress,
            0
        );
        if (marginToLendRate == 0) {
            LogErrorText("error: conversion rate from collateralTokenAddress to lendToken is 0 or not found", 0, lendOrder.orderHash);
            return intOrRevert(0);
        }

        uint collateralTokenAddressAmountFilled = _initialMargin(lendOrder.initialMarginAmount, marginToLendRate, lendTokenAmountFilled);

        uint paidTraderFee;
        uint paidLenderFee;
        orders[lendOrder.orderHash] = lendOrder;
        filled[lendOrder.orderHash] = filled[lendOrder.orderHash].add(lendTokenAmountFilled);

        filledOrder.lender = lender;
        filledOrder.collateralTokenAddressAmountFilled = collateralTokenAddressAmountFilled;
        filledOrder.lendTokenAmountFilled = lendTokenAmountFilled;
        filledOrder.filledUnixTimestampSec = block.timestamp;

        if (! B0xVault(VAULT_CONTRACT).storeMargin(
            lendOrder.collateralTokenAddress,
            trader,
            collateralTokenAddressAmountFilled
        )) {
            LogErrorText("error: unable to transfer enough collateralTokenAddress", 0, lendOrder.orderHash);
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

    function _open0xTrade(
        LendOrder lendOrder,
        address[5] orderAddresses0x,
        uint[6] orderValues0x,
        uint8 v,
        bytes32 r,
        bytes32 s)
        internal
        returns (uint) {

        FilledOrder memory filledOrder = orderFills[lendOrder.orderHash][msg.sender];
        if (filledOrder.lendTokenAmountFilled == 0) {
            LogErrorText("error: filled order not found", 0, lendOrder.orderHash);
            return intOrRevert(0);
        }

        uint marginRatio = B0x_Oracle_Interface(lendOrder.oracleAddress).getMarginRatio(lendOrder.orderHash, msg.sender);
        if (marginRatio <= 100) {
            // todo: trigger order liquidation!
            LogErrorText("error: lendOrder has been liquidated!", 0, lendOrder.orderHash);
            return intOrRevert(0);
        } else if (marginRatio < 110) {
            LogErrorText("error: marginRatiomarginRatio too low!", 0, lendOrder.orderHash);
            return intOrRevert(0);
        }

        if (orderAddresses0x[4] != address(0) && // feeRecipient
                orderValues0x[1] > 0 // takerTokenAmount
        ) {
            if (!EIP20(ZRX_TOKEN_CONTRACT).transferFrom(msg.sender, this, orderValues0x[1])) {
                LogErrorText("error: b0x can't transfer ZRX from trader", 0, lendOrder.orderHash);
                return intOrRevert(0);
            }
        }

        // 0x order will fail if filledOrder.lendTokenAmountFilled is too high
        uint lenderTokenAmountFilledByTrade = Exchange0x_Interface(EXCHANGE0X_CONTRACT).fillOrder(
            orderAddresses0x,
            orderValues0x,
            filledOrder.lendTokenAmountFilled,
            true,
            v,
            r,
            s);
        if (lenderTokenAmountFilledByTrade == 0) {
            LogErrorText("error: 0x order failed!", 0, lendOrder.orderHash);
            return intOrRevert(0);
        }

        uint tradeTokenAmount = getPartialAmount(
            lenderTokenAmountFilledByTrade,
            orderValues0x[1], // takerTokenAmount (aka lendTokenAmount)
            orderValues0x[0] // makerTokenAmount (aka tradeTokenAmount)
        );

        // deposit traded token in vault
        if (!EIP20(orderAddresses0x[2]).transfer(VAULT_CONTRACT, tradeTokenAmount))
            revert();

        // record trade in b0x
        Trade storage openTrade = trades[lendOrder.orderHash][msg.sender];
        openTrade.tradeTokenAddress = orderAddresses0x[2]; // makerToken (aka tradeTokenAddress)
        openTrade.tradeTokenAmount = tradeTokenAmount;
        openTrade.lendTokenUsedAmount = lenderTokenAmountFilledByTrade;
        openTrade.filledUnixTimestampSec = block.timestamp;
        openTrade.active = true;


        LogErrorText("0x order: lenderTokenAmountFilledByTrade", lenderTokenAmountFilledByTrade, lendOrder.orderHash);
        LogErrorText("0x order: tradeTokenAmount", tradeTokenAmount, lendOrder.orderHash);
        LogErrorText("success taking 0x trade!", 0, lendOrder.orderHash);

        return tradeTokenAmount;
    }



    function _initialMargin(
        uint initialMarginAmount,
        uint marginToLendRate,
        uint lendTokenAmountFilled)
        internal
        pure
        returns (uint collateralTokenAddressAmountFilled)
    {
        collateralTokenAddressAmountFilled = (lendTokenAmountFilled * marginToLendRate * initialMarginAmount / 100);// / PRECISION;
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



    /*
     * Owner only functions
     */

    function set0xExchange (
        address _exchange0x)
        public
        onlyOwner {
        EXCHANGE0X_CONTRACT = _exchange0x;
    }

    function setZRXToken (
        address _zrxToken)
        public
        onlyOwner {
        ZRX_TOKEN_CONTRACT = _zrxToken;
    }

    /**
    * @dev Reclaim all EIP20 compatible tokens
    * @param tokens List of addresses of EIP20 token contracts.
    */    
    function reclaimTokens (
        EIP20[] tokens
    ) 
        external 
        nonReentrant 
        onlyOwner
    {
        _reclaimTokens(tokens, msg.sender);
    }

    /**
    * @dev Reclaim any Ether in this contract.
    * @dev This contract does not accept ether directly, but it is impossible to prevent receiving ether
    * @dev in all situations.
    */    
    function reclaimEther()
        external
        onlyOwner
    {
        require(msg.sender.send(this.balance));
    }
    
    /**
    * @dev Upgrade to a new version of the b0x contract
    * @param newContract Address of new b0x contract.
    */   
    function upgrade (
        address newContract
    )
        external
        nonReentrant
        onlyOwner
        wasNotUpgraded
    {
        B0xVault(VAULT_CONTRACT).transferOwnership(newContract);
        B0xOracle(ORACLE_CONTRACT).transferOwnership(newContract);

        setUpgraded(newContract);
    }
    
    function destroy (
        EIP20[] tokens
    )
        external
        nonReentrant
        onlyOwner
    {
        _destroyAndSend(tokens, msg.sender);
    }
    function destroyAndSend (
        EIP20[] tokens,
        address recipient
    ) 
        external
        nonReentrant
        onlyOwner
    {
        _destroyAndSend(tokens, recipient);
    }

    // private function to reclaim tokens
    function _reclaimTokens (
        EIP20[] tokens,
        address recipient
    ) 
        private
    {
        for(uint256 i = 0; i < tokens.length; i++) {
            uint256 balance = tokens[i].balanceOf(this);
            tokens[i].transfer(recipient, balance);
        }
    }

    // private function to destroy contract
    function _destroyAndSend (
        EIP20[] tokens,
        address recipient
    ) 
        private
        wasUpgraded
    {
        _reclaimTokens(tokens, recipient);
        selfdestruct(recipient);
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
    