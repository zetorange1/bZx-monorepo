
pragma solidity 0.4.18;

import './modifiers/Upgradeable.sol';
import './modifiers/GasTracker.sol';
import './shared/Helpers.sol';

import './shared/B0xTypes.sol';
import './B0xVault.sol';

import './oracle/B0xOracle.sol';

// interfaces
import './interfaces/Oracle_Interface.sol';
import './interfaces/B0xTo0x_Interface.sol';

// SIMULATIONS (TO BE REMOVED PRIOR TO MAINNET DEPLOYMENT)
//import './simulations/ERC20_AlwaysOwned.sol';

// to help prevent reentrancy attacks
import 'zeppelin-solidity/contracts/ReentrancyGuard.sol';


contract B0x is ReentrancyGuard, Upgradeable, GasTracker, Helpers, B0xTypes {
    using SafeMath for uint256;
    //using ArrayUtils for *;

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


    address public B0X_TOKEN_CONTRACT;
    address public VAULT_CONTRACT;
    address public ORACLE_CONTRACT;
    address public B0XTO0X;


    mapping (bytes32 => uint) public filled; // mapping of orderHash to loanTokenAmount filled
    mapping (bytes32 => uint) public cancelled; // mapping of orderHash to loanTokenAmount cancelled
    
    mapping (bytes32 => LoanOrder) public orders; // mapping of orderHash to taken loanOrders
    
    mapping (bytes32 => mapping (address => Loan)) public loans; // mapping of orderHash to mapping of traders to loanOrder fills
    mapping (bytes32 => mapping (address => Trade)) public trades; // mapping of orderHash to mapping of traders to active trades
    mapping (bytes32 => mapping (address => uint)) public interestPaid; // mapping of orderHash to mapping of traders to amount of interest paid so far to a lender

    mapping (address => bytes32[]) public orderList; // mapping of traders to array of orderHashes for Loans
    mapping (address => bytes32[]) public tradeList; // mapping of traders to array of orderHashes for Trades (only active trades)



    event LoanOrderTakenAddresses(
        bytes32 loanOrderHash,
        address indexed trader,
        address indexed lender,
        address indexed feeRecipientAddress,
        address loanTokenAddress,
        address interestTokenAddress,
        address collateralTokenAddress,
        address oracleAddress
    );

    event LoanOrderTakenAmounts(
        bytes32 loanOrderHash,
        uint loanTokenAmountFilled,
        uint interestAmount,
        uint initialMarginAmount,
        uint liquidationMarginAmount,
        uint lenderRelayFee,
        uint traderRelayFee,
        uint expirationUnixTimestampSec
    );

    /*event LogCancel(
        address indexed maker,
        address indexed feeRecipient,
        address makerToken,
        address takerToken,
        uint cancelledMakerTokenAmount,
        uint cancelledLoanTokenAmount,
        bytes32 loanOrderHash
    );*/

    event TradeOpenedOn0x(
        bytes32 loanOrderHash,
        address trader,
        address tradeTokenAddress,
        uint tradeTokenAmount,
        uint loanTokenUsedAmount
    );

    //event LogError(uint8 indexed errorId, bytes32 indexed orderHash);
    event LogErrorText(string errorTxt, uint errorValue, bytes32 indexed orderHash);


    function() public
    {
        revert;
    }


    function B0x(
        address _b0xToken,
        address _vault,
        address _exchange0xWrapper) 
        public
    {

        B0X_TOKEN_CONTRACT = _b0xToken;
        VAULT_CONTRACT = _vault;
        B0XTO0X = _exchange0xWrapper;

        // for testing only!
        DEBUG_MODE = true;
    }


    /// @dev Takes the order as trader
    /// @param orderAddresses Array of order's maker, loanTokenAddress, interestTokenAddress collateralTokenAddress, and feeRecipientAddress.
    /// @param orderValues Array of order's loanTokenAmount, interestAmount, initialMarginAmount, liquidationMarginAmount, lenderRelayFee, traderRelayFee, expirationUnixTimestampSec, and salt
    /// @param collateralTokenFilled Desired address of the collateralTokenAddress the trader wants to use.
    /// @param loanTokenAmountFilled Desired amount of loanToken the trader wants to borrow.
    /// @param signature ECDSA signature in raw bytes (rsv).
    /// @return Total amount of loanToken borrowed (uint).
    /// @dev Traders can take a portion of the total coin being lended (loanTokenAmountFilled).
    /// @dev Traders also specifiy the token that will fill the margin requirement if they are taking the order.
    function takeLoanOrderAsTrader(
        address[6] orderAddresses,
        uint[8] orderValues,
        address collateralTokenFilled,
        uint loanTokenAmountFilled,
        bytes signature)
        external
        nonReentrant
        tracksGas
        returns (uint) {

        LoanOrder memory loanOrder = _buildLoanOrder(orderAddresses, orderValues, collateralTokenFilled);

        if(! isValidSignature(
            loanOrder.maker,
            loanOrder.orderHash,
            signature
        )) {
            LogErrorText("error: invalid signiture", 0, loanOrder.orderHash);
            return intOrRevert(0);
        }

        uint actualLendFill = _takeLoanOrder(
            loanOrder,
            msg.sender, // trader
            loanOrder.maker, // lender
            loanTokenAmountFilled
        );

        LoanOrderTakenAddresses(
            loanOrder.orderHash,
            msg.sender, // trader
            loanOrder.maker, // lender
            loanOrder.feeRecipientAddress,
            loanOrder.loanTokenAddress,
            loanOrder.interestTokenAddress,
            collateralTokenFilled,
            loanOrder.oracleAddress
        );
        LoanOrderTakenAmounts(
            loanOrder.orderHash,
            actualLendFill,
            loanOrder.interestAmount,
            loanOrder.initialMarginAmount,
            loanOrder.liquidationMarginAmount,
            loanOrder.lenderRelayFee,
            loanOrder.traderRelayFee,
            loanOrder.expirationUnixTimestampSec
        );

        if (actualLendFill > 0) {
            Oracle_Interface(loanOrder.oracleAddress).orderIsTaken(
                msg.sender,
                loanOrder.orderHash,
                gasUsed // initial used gas, collected in modifier
            );
        }

        return actualLendFill;
    }

    /// @dev Takes the order as lender
    /// @param orderAddresses Array of order's maker, loanTokenAddress, interestTokenAddress collateralTokenAddress, and feeRecipientAddress.
    /// @param orderValues Array of order's loanTokenAmount, interestAmount, initialMarginAmount, liquidationMarginAmount, lenderRelayFee, traderRelayFee, expirationUnixTimestampSec, and salt
    /// @param signature ECDSA signature in raw bytes (rsv).
    /// @return Total amount of loanToken borrowed (uint).
    /// @dev Lenders have to fill the entire desired amount the trader wants to borrow.
    /// @dev This makes loanTokenAmountFilled = loanOrder.loanTokenAmount.
    function takeLoanOrderAsLender(
        address[6] orderAddresses,
        uint[8] orderValues,
        bytes signature)
        external
        nonReentrant
        tracksGas
        returns (uint) {

        LoanOrder memory loanOrder = _buildLoanOrder(orderAddresses, orderValues, orderAddresses[3]);

        if(! isValidSignature(
            loanOrder.maker,
            loanOrder.orderHash,
            signature
        )) {
            LogErrorText("error: invalid signiture", 0, loanOrder.orderHash);
            return intOrRevert(0);
        }
        
        uint actualLendFill = _takeLoanOrder(
            loanOrder,
            loanOrder.maker, // trader
            msg.sender, // lender
            loanOrder.loanTokenAmount
        );

        LoanOrderTakenAddresses(
            loanOrder.orderHash,
            loanOrder.maker, // trader
            msg.sender, // lender
            loanOrder.feeRecipientAddress,
            loanOrder.loanTokenAddress,
            loanOrder.interestTokenAddress,
            loanOrder.collateralTokenAddress,
            loanOrder.oracleAddress
        );
        LoanOrderTakenAmounts(
            loanOrder.orderHash,
            actualLendFill,
            loanOrder.interestAmount,
            loanOrder.initialMarginAmount,
            loanOrder.liquidationMarginAmount,
            loanOrder.lenderRelayFee,
            loanOrder.traderRelayFee,
            loanOrder.expirationUnixTimestampSec
        );

        if (actualLendFill > 0) {
            Oracle_Interface(loanOrder.oracleAddress).orderIsTaken(
                msg.sender,
                loanOrder.orderHash,
                gasUsed // initial used gas, collected in modifier
            );
        }

        return actualLendFill;
    }

   function open0xTrade(
        bytes32 loanOrderHash,
        bytes orderData0x, // 0x order arguments converted to hex, padded to 32 bytes, and concatenated
        bytes signature)
        external
        nonReentrant
        tracksGas
        returns (uint)
    {
        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.orderHash != loanOrderHash) {
            LogErrorText("error: invalid lend order", 0, loanOrderHash);
            return intOrRevert(0);
        }

        Loan memory loan = loans[loanOrderHash][msg.sender];
        if (loan.loanTokenAmountFilled == 0) {
            LogErrorText("error: loan not found", 0, loanOrderHash);
            return intOrRevert(0);
        }

        if (Oracle_Interface(loanOrder.oracleAddress).getMarginRatio(loanOrderHash, msg.sender) < 110) {
            LogErrorText("error: marginRatiomarginRatio too low!", 0, loanOrderHash);
            return intOrRevert(0);
        }

        // transfer the loanToken to the Exchange0x_Wrapper contract
        if (! B0xVault(VAULT_CONTRACT).transferFrom(
            loanOrder.loanTokenAddress,
            loan.lender,
            B0XTO0X,
            loan.loanTokenAmountFilled))
            revert();

        var (tradeTokenAddress, tradeTokenAmount, loanTokenUsedAmount) = B0xTo0x_Interface(B0XTO0X).take0xTrade(
            loanOrderHash,
            loanOrder.oracleAddress,
            loan.loanTokenAmountFilled,
            orderData0x,
            signature);

/*
orderAddresses0x[4] // feeRecipient
orderValues0x[3] // takerFee
orderAddresses0x[2]; // makerToken (aka tradeTokenAddress)
orderValues0x[1], // takerTokenAmount (aka loanTokenAmount)
orderValues0x[0] // makerTokenAmount (aka tradeTokenAmount)
*/

        if (tradeTokenAmount == 0) {
            LogErrorText("error: 0x trade did not fill!", 0, loanOrderHash);
            return intOrRevert(0);
        }

        // record trade in b0x
        tradeList[msg.sender].push(loanOrder.orderHash);

        Trade storage openTrade = trades[loanOrder.orderHash][msg.sender];
        openTrade.tradeTokenAddress = tradeTokenAddress;
        openTrade.tradeTokenAmount = tradeTokenAmount;
        openTrade.loanTokenUsedAmount = loanTokenUsedAmount;
        openTrade.filledUnixTimestampSec = block.timestamp;
        openTrade.listPosition = tradeList[msg.sender].length-1;
        openTrade.active = true;

        TradeOpenedOn0x(
            loanOrderHash,
            msg.sender,
            tradeTokenAddress,
            tradeTokenAmount,
            loanTokenUsedAmount
        );

        Oracle_Interface(loanOrder.oracleAddress).tradeIsOpened(
            loanOrderHash,
            msg.sender, // trader
            tradeTokenAddress,
            tradeTokenAmount,
            gasUsed // initial used gas, collected in modifier
        );

        return tradeTokenAmount;
    }
    
    function payInterest(
        bytes32 loanOrderHash,
        address trader)
        external
        nonReentrant
        tracksGas
        returns (uint) {
    
        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.orderHash != loanOrderHash) {
            //LogErrorText("error: invalid lend order", 0, loanOrderHash);
            voidOrRevert(); return;
        }
        
        InterestData memory interestData = _getInterest(loanOrder,trader);

        if (interestData.interestPaidSoFar >= interestData.totalAmountAccrued) {
            LogErrorText("warning: nothing left to pay for this loanOrderHash and trader", 0, loanOrderHash);
            return intOrRevert(0);
        }

        uint amountOwed = interestData.totalAmountAccrued.sub(interestData.interestPaidSoFar);
        interestPaid[loanOrderHash][trader] = interestData.totalAmountAccrued; // since this function will pay all remaining accured interest
        
        // send the interest to the oracle for further processing
        if (! B0xVault(VAULT_CONTRACT).sendInterestToOracle(
            trader,
            interestData.interestTokenAddress,
            orders[loanOrderHash].oracleAddress,
            amountOwed
        )) {
            LogErrorText("error: unable to pay interest!!", amountOwed, loanOrderHash);
            return intOrRevert(0);
        }

        // calls the oracle to signal processing of the interest (ie: paying the lender, retaining fees)
        /*Oracle_Interface(loanOrder.oracleAddress).interestIsPaid(
            loanOrderHash,
            trader, // trader
            interestData.interestTokenAddress,
            amountOwed,
            gasUsed // initial used gas, collected in modifier
        );*/

        return amountOwed;
    }

    function closeTrade(
        bytes32 loanOrderHash)
        external
        nonReentrant
        tracksGas
        returns (bool tradeSuccess) {

        Trade memory activeTrade = trades[loanOrderHash][msg.sender];
        if (!activeTrade.active) {
            LogErrorText("error: trade not found or not active", 0, loanOrderHash);
            return boolOrRevert(false);
        }

        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.orderHash != loanOrderHash) {
            //LogErrorText("error: invalid lend order", 0, loanOrderHash);
            voidOrRevert(); return;
        }

        /*tradeSuccess = _closeOrLiquidate(
            loanOrderHash,
            msg.sender
        );*/

        /*if (tradeSuccess) {
            Oracle_Interface(loanOrder.oracleAddress).tradeIsClosed(
                loanOrderHash,
                msg.sender, // trader
                gasUsed // initial used gas, collected in modifier
            );
        }*/
    }

    function liquidateTrade(
        bytes32 loanOrderHash,
        address trader)
        external
        nonReentrant
        tracksGas
        returns (bool tradeSuccess) {

        // traders should call closeTrade to close their own trades
        require(trader != msg.sender);
        
        Trade memory activeTrade = trades[loanOrderHash][trader];
        if (!activeTrade.active) {
            LogErrorText("error: trade not found or not active", 0, loanOrderHash);
            return boolOrRevert(false);
        }

        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.orderHash != loanOrderHash) {
            //LogErrorText("error: invalid lend order", 0, loanOrderHash);
            voidOrRevert(); return;
        }

        /*tradeSuccess = _closeOrLiquidate(
            loanOrderHash,
            trader
        );*/

        /*if (tradeSuccess) {
            Oracle_Interface(loanOrder.oracleAddress).tradeIsClosed(
                loanOrderHash,
                msg.sender, // trader
                gasUsed // initial used gas, collected in modifier
            );
        }*/
 
    }

    /*function _closeOrLiquidate() {
        Trade memory activeTrade = trades[loanOrderHash][trader];
        if (!activeTrade.active) {
            LogErrorText("error: trade not found or not active", 0, loanOrderHash);
            return boolOrRevert(false);
        }
        
        if (trader != msg.sender) {
            uint liquidationLevel = getLiquidationLevel(loanOrderHash, trader);
            if (liquidationLevel > 100) {
                LogErrorText("error: margin above liquidation level", liquidationLevel, loanOrderHash);
                return boolOrRevert(false);
            }
        }

        
        
        */  /*
        OrderAddresses memory orderAddresses = openTradeAddresses[orderHash];
        OrderValues memory orderValues = openTradeValues[orderHash];
        
        uint tradeAmount = openTrades[orderHash];

        //closedOrders[orderHash] = true;
*//*
        return true;
    }*/


    /*
    * Constant public functions
    */

    /// @dev Calculates Keccak-256 hash of order with specified parameters.
    /// @param orderAddresses Array of order's maker, loanTokenAddress, interestTokenAddress collateralTokenAddress, and feeRecipientAddress.
    /// @param orderValues Array of order's loanTokenAmount, interestAmount, initialMarginAmount, liquidationMarginAmount, lenderRelayFee, traderRelayFee, expirationUnixTimestampSec, and salt
    /// @return Keccak-256 hash of loanOrder.
    function getLoanOrderHash(
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

    /// @dev Calculates the sum of values already filled and cancelled for a given loanOrder.
    /// @param orderHash The Keccak-256 hash of the given loanOrder.
    /// @return Sum of values already filled and cancelled.
    function getUnavailableLoanTokenAmount(bytes32 orderHash)
        public
        view
        returns (uint)
    {
        return filled[orderHash].add(cancelled[orderHash]);
    }

   
    function getLoanOrder (
        bytes32 loanOrderHash
    )
        public
        view
        returns (address[6],uint[7])
    {
        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.orderHash != loanOrderHash) {
            //LogErrorText("error: invalid lend order", 0, loanOrderHash);
            voidOrRevert();
        }

        return (
            [
                loanOrder.maker,
                loanOrder.loanTokenAddress,
                loanOrder.interestTokenAddress,
                loanOrder.collateralTokenAddress,
                loanOrder.feeRecipientAddress,
                loanOrder.oracleAddress
            ],
            [
                loanOrder.loanTokenAmount,
                loanOrder.interestAmount,
                loanOrder.initialMarginAmount,
                loanOrder.liquidationMarginAmount,
                loanOrder.lenderRelayFee,
                loanOrder.traderRelayFee,
                loanOrder.expirationUnixTimestampSec
            ]
        );
    }

    function getInterest(
        bytes32 loanOrderHash,
        address trader)
        public
        view
        returns (address lender, address interestTokenAddress, uint totalAmountAccrued, uint interestPaidSoFar) {

        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.orderHash != loanOrderHash) {
            //LogErrorText("error: invalid lend order", 0, loanOrderHash);
            voidOrRevert(); return;
        }

        InterestData memory interestData = _getInterest(loanOrder,trader);
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
    /// @param signature ECDSA signature in raw bytes (rsv).
    /// @return Validity of order signature.
    function isValidSignature(
        address signer,
        bytes32 hash,
        bytes signature)
        public
        pure
        returns (bool)
    {
        var (v, r, s) = getSignatureParts(signature);
        return signer == ecrecover(
            keccak256("\x19Ethereum Signed Message:\n32", hash),
            v,
            r,
            s
        );
    }

    /// @param signature ECDSA signature in raw bytes (rsv).
    function getSignatureParts(
        bytes signature)
        public
        pure
        returns (
            uint8 v,
            bytes32 r,
            bytes32 s)
    {
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := mload(add(signature, 65))
        }
        if (v < 27) {
            v = v + 27;
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

    /*
    * Constant Internal functions
    */

    function _buildLoanOrder(
        address[6] orderAddresses,
        uint[8] orderValues,
        address collateralTokenFilled) 
        internal
        view
        returns (LoanOrder) {

        return LoanOrder({
            maker: orderAddresses[0],
            loanTokenAddress: orderAddresses[1],
            interestTokenAddress: orderAddresses[2],
            collateralTokenAddress: collateralTokenFilled,
            feeRecipientAddress: orderAddresses[4],
            oracleAddress: orderAddresses[5],
            loanTokenAmount: orderValues[0],
            interestAmount: orderValues[1],
            initialMarginAmount: orderValues[2],
            liquidationMarginAmount: orderValues[3],
            lenderRelayFee: orderValues[4],
            traderRelayFee: orderValues[5],
            expirationUnixTimestampSec: orderValues[6],
            orderHash: getLoanOrderHash(orderAddresses, orderValues)
        });
    }

    function _getInterest(
        LoanOrder loanOrder,
        address trader)
        internal
        view
        returns (InterestData interestData)
    {
        Loan memory loan = loans[loanOrder.orderHash][trader];
        if (loan.loanTokenAmountFilled == 0) {
            //LogErrorText("error: loan not found for specified loanOrder and trader", 0, loanOrder.orderHash);
            voidOrRevert(); return;
        }
        
        uint interestTime = block.timestamp;
        if (interestTime > loanOrder.expirationUnixTimestampSec) {
            //LogErrorText("notice: loanOrder has expired", 0, loanOrder.orderHash);
            interestTime = loanOrder.expirationUnixTimestampSec;
        }

        interestData = InterestData({
            lender: loan.lender,
            interestTokenAddress: loanOrder.interestTokenAddress,
            totalAmountAccrued: interestTime.sub(loan.filledUnixTimestampSec) / 86400 * loanOrder.interestAmount * loan.loanTokenAmountFilled / loanOrder.loanTokenAmount,
            interestPaidSoFar: interestPaid[loanOrder.orderHash][trader]
        });
    }

    /*
    * Public Internal functions
    */

    function _verifyLoanOrder(
        LoanOrder loanOrder,
        uint loanTokenAmountFilled)
        internal
        returns (bool)
    {
        if (loanOrder.maker == msg.sender) {
            LogErrorText("error: invalid taker", 0, loanOrder.orderHash);
            return boolOrRevert(false);
        }
        if (loanOrder.loanTokenAddress == address(0) 
            || loanOrder.interestTokenAddress == address(0)
            || loanOrder.collateralTokenAddress == address(0)) {
            LogErrorText("error: one or more token addresses are missing from the order", 0, loanOrder.orderHash);
            return boolOrRevert(false);
        }

        if (loanOrder.oracleAddress == address(0)) {
            LogErrorText("error: must include an oracleAddress", 0, loanOrder.orderHash);
            return boolOrRevert(false);
        }

        if (block.timestamp >= loanOrder.expirationUnixTimestampSec) {
            //LogError(uint8(Errors.ORDER_EXPIRED), 0, loanOrder.orderHash);
            LogErrorText("error: loanOrder has expired", 0, loanOrder.orderHash);
            return boolOrRevert(false);
        }

        if(! (loanOrder.liquidationMarginAmount >= 0 && loanOrder.liquidationMarginAmount < loanOrder.initialMarginAmount && loanOrder.initialMarginAmount <= 100)) {
            LogErrorText("error: valid margin parameters", 0, loanOrder.orderHash);
            return boolOrRevert(false);
        }

        uint remainingLoanTokenAmount = loanOrder.loanTokenAmount.sub(getUnavailableLoanTokenAmount(loanOrder.orderHash));
        if (remainingLoanTokenAmount < loanTokenAmountFilled) {
            LogErrorText("error: not enough loanToken still available in thie order", 0, loanOrder.orderHash);
            return boolOrRevert(false);
        }

        return true;
    }

    function _takeLoanOrder(
        LoanOrder loanOrder,
        address trader,
        address lender,
        uint loanTokenAmountFilled)
        private
        returns (uint) {

        if (!_verifyLoanOrder(loanOrder, loanTokenAmountFilled)) {
            LogErrorText("error: loanOrder did not pass validation!", 0, loanOrder.orderHash);
            return intOrRevert(0);
        }

        // A trader can only fill a portion or all of a loanOrder once:
        //  - this avoids complex interest payments for parts of an order filled at different times by the same trader
        //  - this avoids potentially large loops when calculating margin reqirements and interest payments
        Loan storage loan = loans[loanOrder.orderHash][trader];
        if (loan.loanTokenAmountFilled != 0) {
            LogErrorText("error: loanOrder already filled for this trader", 0, loanOrder.orderHash);
            return intOrRevert(0);
        }

        var (collateralToLendRate,) = Oracle_Interface(loanOrder.oracleAddress).getRateData(
            loanOrder.loanTokenAddress,
            loanOrder.collateralTokenAddress,
            0
        );
        if (collateralToLendRate == 0) {
            LogErrorText("error: conversion rate from collateralTokenAddress to loanToken is 0 or not found", 0, loanOrder.orderHash);
            return intOrRevert(0);
        }

        uint collateralTokenAmountFilled = _initialMargin(loanOrder.initialMarginAmount, collateralToLendRate, loanTokenAmountFilled);

        uint paidTraderFee;
        uint paidLenderFee;
        orders[loanOrder.orderHash] = loanOrder;
        filled[loanOrder.orderHash] = filled[loanOrder.orderHash].add(loanTokenAmountFilled);

        orderList[trader].push(loanOrder.orderHash);

        loan.lender = lender;
        loan.collateralTokenAmountFilled = collateralTokenAmountFilled;
        loan.loanTokenAmountFilled = loanTokenAmountFilled;
        loan.filledUnixTimestampSec = block.timestamp;
        loan.listPosition = orderList[trader].length-1;
        loan.active = true;


        if (! B0xVault(VAULT_CONTRACT).storeMargin(
            loanOrder.collateralTokenAddress,
            trader,
            collateralTokenAmountFilled
        )) {
            LogErrorText("error: unable to transfer enough collateralTokenAddress", 0, loanOrder.orderHash);
            return intOrRevert(loanTokenAmountFilled);
        }

        // total interest required if loan is kept until order expiration
        // unused interest at the end of a loan is refunded to the trader
        uint totalInterestRequired = _totalInterestRequired(loanOrder, loanTokenAmountFilled);
        if (! B0xVault(VAULT_CONTRACT).storeInterest(
            loanOrder.interestTokenAddress,
            trader,
            totalInterestRequired
        )) {
            LogErrorText("error: unable to transfer enough interestToken", 0, loanOrder.orderHash);
            return intOrRevert(loanTokenAmountFilled);
        }

        if (! B0xVault(VAULT_CONTRACT).storeFunding(
            loanOrder.loanTokenAddress,
            lender,
            loanTokenAmountFilled
        )) {
            LogErrorText("error: unable to transfer enough loanToken", 0, loanOrder.orderHash);
            return intOrRevert(loanTokenAmountFilled);
        }

        if (loanOrder.feeRecipientAddress != address(0)) {
            if (loanOrder.traderRelayFee > 0) {
                paidTraderFee = getPartialAmount(loanTokenAmountFilled, loanOrder.loanTokenAmount, loanOrder.traderRelayFee);
                
                if (! B0xVault(VAULT_CONTRACT).transferFrom(
                    B0X_TOKEN_CONTRACT, 
                    trader,
                    loanOrder.feeRecipientAddress,
                    paidTraderFee
                )) {
                    LogErrorText("error: unable to pay traderRelayFee", 0, loanOrder.orderHash);
                    return intOrRevert(loanTokenAmountFilled);
                }
            }
            if (loanOrder.lenderRelayFee > 0) {
                paidLenderFee = getPartialAmount(loanTokenAmountFilled, loanOrder.loanTokenAmount, loanOrder.lenderRelayFee);
                
                if (! B0xVault(VAULT_CONTRACT).transferFrom(
                    B0X_TOKEN_CONTRACT, 
                    lender,
                    loanOrder.feeRecipientAddress,
                    paidLenderFee
                )) {
                    LogErrorText("error: unable to pay lenderRelayFee", 0, loanOrder.orderHash);
                    return intOrRevert(0);
                }
            }
        }
        
        return loanTokenAmountFilled;
    }

    /*function _open0xTrade(
        LoanOrder loanOrder,
        address[5] orderAddresses0x,
        uint[6] orderValues0x,
        uint8 v,
        bytes32 r,
        bytes32 s)
        private
        returns (uint) {

        Loan memory loan = loans[loanOrder.orderHash][msg.sender];
        if (loan.loanTokenAmountFilled == 0) {
            LogErrorText("error: loan not found", 0, loanOrder.orderHash);
            return intOrRevert(0);
        }

        uint marginRatio = Oracle_Interface(loanOrder.oracleAddress).getMarginRatio(loanOrder.orderHash, msg.sender);
        if (marginRatio < 110) {
            LogErrorText("error: marginRatiomarginRatio too low!", 0, loanOrder.orderHash);
            return intOrRevert(0);
        }

        if (orderAddresses0x[4] != address(0) && // feeRecipient
                orderValues0x[3] > 0 // takerFee
        ) {
            if (!EIP20(ZRX_TOKEN_CONTRACT).transferFrom(msg.sender, this, orderValues0x[3])) {
                LogErrorText("error: b0x can't transfer ZRX from trader", 0, loanOrder.orderHash);
                return intOrRevert(0);
            }
        }

        // 0x order will fail if loan.loanTokenAmountFilled is too high
        uint lenderTokenAmountFilledByTrade = Exchange0x_Interface(EXCHANGE0X_CONTRACT).fillOrder(
            orderAddresses0x,
            orderValues0x,
            loan.loanTokenAmountFilled,
            true,
            v,
            r,
            s);
        if (lenderTokenAmountFilledByTrade == 0) {
            LogErrorText("error: 0x order failed!", 0, loanOrder.orderHash);
            return intOrRevert(0);
        }

        uint tradeTokenAmount = getPartialAmount(
            lenderTokenAmountFilledByTrade,
            orderValues0x[1], // takerTokenAmount (aka loanTokenAmount)
            orderValues0x[0] // makerTokenAmount (aka tradeTokenAmount)
        );

        // transfer ownership of the tradeToken over to the oracle
        if (!EIP20(orderAddresses0x[2]).transfer(loanOrder.oracleAddress, tradeTokenAmount))
            revert();

        // record trade in b0x
        tradeList[msg.sender].push(loanOrder.orderHash);

        Trade storage openTrade = trades[loanOrder.orderHash][msg.sender];
        openTrade.tradeTokenAddress = orderAddresses0x[2]; // makerToken (aka tradeTokenAddress)
        openTrade.tradeTokenAmount = tradeTokenAmount;
        openTrade.loanTokenUsedAmount = lenderTokenAmountFilledByTrade;
        openTrade.filledUnixTimestampSec = block.timestamp;
        openTrade.listPosition = tradeList[msg.sender].length-1;
        openTrade.active = true;

        //##here -> TODO: when trades close mark active = false and remove orderHas from tradeList

        LogErrorText("0x order: lenderTokenAmountFilledByTrade", lenderTokenAmountFilledByTrade, loanOrder.orderHash);
        LogErrorText("0x order: tradeTokenAmount", tradeTokenAmount, loanOrder.orderHash);
        LogErrorText("success taking 0x trade!", 0, loanOrder.orderHash);

        return tradeTokenAmount;
    }*/



    function _initialMargin(
        uint initialMarginAmount,
        uint collateralToLendRate,
        uint loanTokenAmountFilled)
        internal
        pure
        returns (uint collateralTokenAmountFilled)
    {
        collateralTokenAmountFilled = (loanTokenAmountFilled * collateralToLendRate * initialMarginAmount / 100);// / PRECISION;
    }
    
    function _totalInterestRequired(
        LoanOrder loanOrder,
        uint loanTokenAmountFilled)
        internal
        view
        returns (uint totalInterestRequired)
    {
        totalInterestRequired = getPartialAmount(loanTokenAmountFilled, loanOrder.loanTokenAmount, (loanOrder.expirationUnixTimestampSec.sub(block.timestamp) / 86400).mul(loanOrder.interestAmount));
    }



    /*
     * Owner only functions
     */

    function set0xExchangeWrapper (
        address _exchange0xWrapper)
        public
        onlyOwner {
        B0XTO0X = _exchange0xWrapper;
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
        if (ORACLE_CONTRACT != address(0)) {
            B0xOracle(ORACLE_CONTRACT).transferOwnership(newContract);
        }

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
 
   /// @dev Cancels the input loanOrder.
    /// @param orderAddresses Array of order's maker, taker, makerToken, takerToken, and feeRecipient.
    /// @param orderValues Array of order's makerTokenAmount, loanTokenAmount, makerFee, takerFee, expirationUnixTimestampSec, and salt.
    /// @param cancelLoanTokenAmount Desired amount of takerToken to cancel in loanOrder.
    /// @return Amount of takerToken cancelled.
    function cancelOrder(
        address[5] orderAddresses,
        uint[6] orderValues,
        uint cancelLoanTokenAmount)
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
            loanTokenAmount: orderValues[1],
            makerFee: orderValues[2],
            takerFee: orderValues[3],
            expirationUnixTimestampSec: orderValues[4],
            orderHash: getLoanOrderHash(orderAddresses, orderValues)
        });

        require(loanOrder.maker == msg.sender);
        require(loanOrder.makerTokenAmount > 0 && loanOrder.loanTokenAmount > 0 && cancelLoanTokenAmount > 0);

        if (block.timestamp >= loanOrder.expirationUnixTimestampSec) {
            LogError(uint8(Errors.ORDER_EXPIRED), 0, loanOrder.orderHash);
            return 0;
        }

        uint remainingLoanTokenAmount = loanOrder.loanTokenAmount.sub(getUnavailableLoanTokenAmount(loanOrder.orderHash));
        uint cancelledLoanTokenAmount = SafeMath.min256(cancelLoanTokenAmount, remainingLoanTokenAmount);
        if (cancelledLoanTokenAmount == 0) {
            LogError(uint8(Errors.ORDER_FULLY_FILLED_OR_CANCELLED), 0, loanOrder.orderHash);
            return 0;
        }

        cancelled[loanOrder.orderHash] = cancelled[loanOrder.orderHash].add(cancelledLoanTokenAmount);

        LogCancel(
            loanOrder.maker,
            loanOrder.feeRecipient,
            loanOrder.makerToken,
            loanOrder.takerToken,
            getPartialAmount(cancelledLoanTokenAmount, loanOrder.loanTokenAmount, loanOrder.makerTokenAmount),
            cancelledLoanTokenAmount,
            keccak256(loanOrder.makerToken, loanOrder.takerToken),
            loanOrder.orderHash
        );
        return cancelledLoanTokenAmount;
    }
    */
    