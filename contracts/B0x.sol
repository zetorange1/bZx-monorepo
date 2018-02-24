
pragma solidity ^0.4.19;

import './modifiers/Upgradeable.sol';
import './modifiers/GasTracker.sol';
import './shared/Debugger.sol';

import './shared/B0xTypes.sol';
import './B0xVault.sol';

import './oracle/B0xOracle.sol';

// interfaces
import './interfaces/Oracle_Interface.sol';
import './interfaces/B0xTo0x_Interface.sol';

// to help prevent reentrancy attacks
import 'zeppelin-solidity/contracts/ReentrancyGuard.sol';

/*
TODO:
    function closeTradeWith0x(..)
    function closeLoan(..)
    function cancelLoanOrder(..)
*/

contract B0x is ReentrancyGuard, Upgradeable, GasTracker, Debugger, B0xTypes {
    using SafeMath for uint256;

    string constant public VERSION = "1.0.0";
    uint16 constant public EXTERNAL_QUERY_GAS_LIMIT = 4999; // Changes to state require at least 5000 gas

    //uint constant PRECISION = (10**18);

    address public B0X_TOKEN_CONTRACT;
    address public VAULT_CONTRACT;
    address public ORACLE_CONTRACT;
    address public B0XTO0X_CONTRACT;


    mapping (bytes32 => uint) public filled; // mapping of loanOrderHash to loanTokenAmount filled
    mapping (bytes32 => uint) public cancelled; // mapping of loanOrderHash to loanTokenAmount cancelled
    
    mapping (bytes32 => LoanOrder) public orders; // mapping of loanOrderHash to taken loanOrders
    mapping (bytes32 => uint) public orderFilledAmounts; // mapping of loanOrderHash to loanTokenAmount filled
    mapping (bytes32 => uint) public orderCancelledAmounts; // mapping of loanOrderHash to loanTokenAmount cancelled
    
    mapping (bytes32 => mapping (address => Loan)) public loans; // mapping of loanOrderHash to mapping of traders to loanOrder fills
    mapping (bytes32 => mapping (address => Trade)) public trades; // mapping of loanOrderHash to mapping of traders to active trades
    mapping (bytes32 => mapping (address => uint)) public interestPaid; // mapping of loanOrderHash to mapping of traders to amount of interest paid so far to a lender

    mapping (address => bytes32[]) public orderList; // mapping of traders to array of loanOrderHashes for Loans
    mapping (address => bytes32[]) public tradeList; // mapping of traders to array of loanOrderHashes for Trades (only active trades)


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
        uint maintenanceMarginAmount,
        uint lenderRelayFee,
        uint traderRelayFee,
        uint expirationUnixTimestampSec
    );

    event TradeOpenedOn0x(
        bytes32 loanOrderHash,
        address trader,
        address tradeTokenAddress,
        uint tradeTokenAmount,
        uint loanTokenUsedAmount
    );


    function() public {}

    function B0x(
        address _b0xToken,
        address _vault,
        address _exchange0xWrapper) 
        public
    {

        B0X_TOKEN_CONTRACT = _b0xToken;
        VAULT_CONTRACT = _vault;
        B0XTO0X_CONTRACT = _exchange0xWrapper;

        // for testing only!
        DEBUG_MODE = true;
    }


    /// @dev Takes the order as trader
    /// @param orderAddresses Array of order's maker, loanTokenAddress, interestTokenAddress collateralTokenAddress, and feeRecipientAddress.
    /// @param orderValues Array of order's loanTokenAmount, interestAmount, initialMarginAmount, maintenanceMarginAmount, lenderRelayFee, traderRelayFee, expirationUnixTimestampSec, and salt
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
        returns (uint)
    {
        bytes32 loanOrderHash = getLoanOrderHash(orderAddresses, orderValues);
        LoanOrder memory loanOrder = buildLoanOrderStruct(loanOrderHash, orderAddresses, orderValues);
        loanOrder.collateralTokenAddress = collateralTokenFilled;

        if(!isValidSignature(
            loanOrder.maker,
            loanOrder.loanOrderHash,
            signature
        )) {
            //debugLog("error: invalid signiture (loanOrderHash)", loanOrder.loanOrderHash);
            return intOrRevert(0,135);
        }

        uint actualLendFill = takeLoanOrder(
            loanOrder,
            msg.sender, // trader
            loanOrder.maker, // lender
            loanTokenAmountFilled
        );

        LoanOrderTakenAddresses(
            loanOrder.loanOrderHash,
            msg.sender, // trader
            loanOrder.maker, // lender
            loanOrder.feeRecipientAddress,
            loanOrder.loanTokenAddress,
            loanOrder.interestTokenAddress,
            collateralTokenFilled,
            loanOrder.oracleAddress
        );
        LoanOrderTakenAmounts(
            loanOrder.loanOrderHash,
            actualLendFill,
            loanOrder.interestAmount,
            loanOrder.initialMarginAmount,
            loanOrder.maintenanceMarginAmount,
            loanOrder.lenderRelayFee,
            loanOrder.traderRelayFee,
            loanOrder.expirationUnixTimestampSec
        );

        if (actualLendFill > 0) {
            if(! Oracle_Interface(loanOrder.oracleAddress).didTakeOrder(
                loanOrder.loanOrderHash,
                msg.sender,
                gasUsed // initial used gas, collected in modifier
            )) {
                //debugLog("error: didTakeOrder oracle call failed! (loanOrderHash)", loanOrder.loanOrderHash);
                return intOrRevert(0,173);
            }
        }

        return actualLendFill;
    }



    /// @dev Takes the order as lender
    /// @param orderAddresses Array of order's maker, loanTokenAddress, interestTokenAddress collateralTokenAddress, and feeRecipientAddress.
    /// @param orderValues Array of order's loanTokenAmount, interestAmount, initialMarginAmount, maintenanceMarginAmount, lenderRelayFee, traderRelayFee, expirationUnixTimestampSec, and salt
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
        returns (uint)
    {
        bytes32 loanOrderHash = getLoanOrderHash(orderAddresses, orderValues);
        LoanOrder memory loanOrder = buildLoanOrderStruct(loanOrderHash, orderAddresses, orderValues);

        if(!isValidSignature(
            loanOrder.maker,
            loanOrder.loanOrderHash,
            signature
        )) {
            //debugLog("error: invalid signiture (loanOrderHash)", loanOrder.loanOrderHash);
            return intOrRevert(0,207);
        }
        
        uint actualLendFill = takeLoanOrder(
            loanOrder,
            loanOrder.maker, // trader
            msg.sender, // lender
            loanOrder.loanTokenAmount
        );

        LoanOrderTakenAddresses(
            loanOrder.loanOrderHash,
            loanOrder.maker, // trader
            msg.sender, // lender
            loanOrder.feeRecipientAddress,
            loanOrder.loanTokenAddress,
            loanOrder.interestTokenAddress,
            loanOrder.collateralTokenAddress,
            loanOrder.oracleAddress
        );
        LoanOrderTakenAmounts(
            loanOrder.loanOrderHash,
            actualLendFill,
            loanOrder.interestAmount,
            loanOrder.initialMarginAmount,
            loanOrder.maintenanceMarginAmount,
            loanOrder.lenderRelayFee,
            loanOrder.traderRelayFee,
            loanOrder.expirationUnixTimestampSec
        );

        if (actualLendFill > 0) {
            if(! Oracle_Interface(loanOrder.oracleAddress).didTakeOrder(
                loanOrder.loanOrderHash,
                msg.sender,
                gasUsed // initial used gas, collected in modifier
            )) {
                //debugLog("error: didTakeOrder oracle call failed! (loanOrderHash)", loanOrder.loanOrderHash);
                return intOrRevert(0,245);
            }
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
        if (loanOrder.loanOrderHash != loanOrderHash) {
            //debugLog("error: invalid loan order (loanOrderHash)", loanOrderHash);
            return intOrRevert(0,264);
        }

        Loan memory loan = loans[loanOrderHash][msg.sender];
        if (loan.loanTokenAmountFilled == 0 || !loan.active) {
            //debugLog("error: loan not found or not active (loanOrderHash)", loanOrderHash);
            return intOrRevert(0,270);
        }

        Trade storage openTrade = trades[loanOrderHash][msg.sender];
        if (openTrade.active) {
            //debugLog("error: a trade is already opened for this loan (loanOrderHash)", loanOrderHash);
            return intOrRevert(0,276);
        }

        if (Oracle_Interface(loanOrder.oracleAddress).shouldLiquidate(loanOrderHash, msg.sender)) {
            // TODO: should we trigger liquidation automatically here?
            
            //debugLog("error: margin too low! (loanOrderHash)", loanOrderHash);
            return intOrRevert(0,283);
        }

        // transfer the loanToken to the B0xTo0x contract
        if (!B0xVault(VAULT_CONTRACT).transferFrom(
            loanOrder.loanTokenAddress,
            loan.lender,
            B0XTO0X_CONTRACT,
            loan.loanTokenAmountFilled))
            revert();

        var (tradeTokenAddress, tradeTokenAmount, loanTokenUsedAmount) = B0xTo0x_Interface(B0XTO0X_CONTRACT).take0xTrade(
            loanOrderHash,
            loanOrder.oracleAddress, // the Oracle receives the tradeToken 
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
            //debugLog("error: 0x trade did not fill! (loanOrderHash)", loanOrderHash);
            return intOrRevert(0,311);
        }

        // record trade in b0x
        tradeList[msg.sender].push(loanOrderHash);

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

        if(! Oracle_Interface(loanOrder.oracleAddress).didOpenTrade(
            loanOrderHash,
            msg.sender, // trader
            tradeTokenAddress,
            tradeTokenAmount,
            gasUsed // initial used gas, collected in modifier
        )) {
            //debugLog("error: didOpenTrade oracle call failed! (loanOrderHash)", loanOrderHash);
            return intOrRevert(0,340);
        }

        return tradeTokenAmount;
    }
    
    function payInterest(
        bytes32 loanOrderHash,
        address trader)
        external
        nonReentrant
        tracksGas
        returns (uint)
    {
        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.loanOrderHash != loanOrderHash) {
            //debugLog("payInterest error: invalid loan order (loanOrderHash)", loanOrderHash);
            return intOrRevert(0,357);
        }

        Loan storage loan = loans[loanOrderHash][trader];
        if (loan.loanTokenAmountFilled == 0 || !loan.active) {
            //debugLog("payInterest error: loan not found or not active (loanOrderHash)", loanOrderHash);
            return intOrRevert(0,363);
        }
        
        InterestData memory interestData = getInterest(loanOrder,trader);

        if (interestData.interestPaidSoFar >= interestData.totalAmountAccrued) {
            //debugLog("warning: nothing left to pay for this loanOrderHash and trader (loanOrderHash)", loanOrderHash);
            return intOrRevert(0,370);
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
            //debugLog("error: unable to pay interest!! (amountOwed, trader, loanOrderHash)", amountOwed, trader, loanOrderHash);
            return intOrRevert(0,384);
        }

        // calls the oracle to signal processing of the interest (ie: paying the lender, retaining fees)
        if(! Oracle_Interface(loanOrder.oracleAddress).didPayInterest(
            loanOrderHash,
            trader,
            loan.lender,
            interestData.interestTokenAddress,
            amountOwed,
            gasUsed // initial used gas, collected in modifier
        )) {
            //debugLog("error: didPayInterest oracle call failed! (loanOrderHash)", loanOrder.loanOrderHash);
            return intOrRevert(0,397);
        }

        return amountOwed;
    }

    // Allows the trader to increase the collateral for an open loan
    function depositCollateral(
        bytes32 loanOrderHash,
        uint depositAmount)
        external
        nonReentrant
        tracksGas
        returns (bool)
    {
        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.loanOrderHash != loanOrderHash) {
            //debugLog("depositCollateral error: invalid loan order (loanOrderHash)", loanOrderHash);
            return boolOrRevert(false,415);
        }

        Loan storage loan = loans[loanOrderHash][msg.sender];
        if (loan.loanTokenAmountFilled == 0 || !loan.active) {
            //debugLog("depositCollateral error: loan not found or not active (loanOrderHash)", loanOrderHash);
            return boolOrRevert(false,421);
        }

        if (! B0xVault(VAULT_CONTRACT).depositCollateral(
            loanOrder.collateralTokenAddress,
            msg.sender,
            depositAmount
        )) {
            //debugLog("depositCollateral error: unable to transfer enough collateralToken (depositAmount, loanOrderHash)", depositAmount, loanOrder.loanOrderHash);
            return boolOrRevert(false,430);
        }

        loan.collateralTokenAmountFilled = loan.collateralTokenAmountFilled.add(depositAmount);

        if(! Oracle_Interface(loanOrder.oracleAddress).didDepositCollateral(
            loanOrder.loanOrderHash,
            msg.sender,
            gasUsed // initial used gas, collected in modifier
        )) {
            //debugLog("error: didDepositCollateral oracle call failed! (loanOrderHash)", loanOrder.loanOrderHash);
            return boolOrRevert(false,441);
        }

        return true;
    }

    // Allows the trader to change the collateral token being used for an open loan.
    // This function will transfer in the initial margin requirement of the new token.
    // The old token will be refunded to the trader.
    function changeCollateral(
        bytes32 loanOrderHash,
        address collateralTokenAddress)
        external
        nonReentrant
        tracksGas
        returns (bool)
    {
        LoanOrder storage loanOrder = orders[loanOrderHash];
        if (loanOrder.loanOrderHash != loanOrderHash) {
            //debugLog("changeCollateral error: invalid loan order (loanOrderHash)", loanOrderHash);
            return boolOrRevert(false,461);
        }

        if (collateralTokenAddress == address(0) || collateralTokenAddress == loanOrder.collateralTokenAddress) {
            //debugLog("changeCollateral error: invalid collateralTokenAddress (loanOrderHash)", loanOrderHash);
            return boolOrRevert(false,466);
        }

        Loan storage loan = loans[loanOrderHash][msg.sender];
        if (loan.loanTokenAmountFilled == 0 || !loan.active) {
            //debugLog("changeCollateral error: loan not found or not active (loanOrderHash)", loanOrderHash);
            return boolOrRevert(false,472);
        }

        if (! Oracle_Interface(loanOrder.oracleAddress).isTradeSupported(
            collateralTokenAddress,
            loanOrder.loanTokenAddress)) {
            //debugLog("changeCollateral error: collateralToken to loanToken trade not supported by oracle (loanOrderHash)", loanOrderHash);
            return boolOrRevert(false,479);
        }

        uint collateralTokenAmountFilled = getInitialMarginRequired(
            loanOrder.loanTokenAddress,
            collateralTokenAddress,
            loanOrder.oracleAddress,
            loanOrder.initialMarginAmount,
            loan.loanTokenAmountFilled
        );

        // transfer the new collateral token from the trader to the vault
        if (! B0xVault(VAULT_CONTRACT).depositCollateral(
            collateralTokenAddress,
            msg.sender,
            collateralTokenAmountFilled
        )) {
            //debugLog("changeCollateral error: unable to transfer enough collateralToken to vault (collateralTokenAmountFilled, loanOrderHash)", collateralTokenAmountFilled, loanOrder.loanOrderHash);
            return boolOrRevert(false,497);
        }

        // transfer the old collateral token from the vault to the trader
        if (! B0xVault(VAULT_CONTRACT).withdrawCollateral(
            loanOrder.collateralTokenAddress,
            msg.sender,
            loan.collateralTokenAmountFilled
        )) {
            //debugLog("changeCollateral error: unable to transfer enough collateralToken to trader (collateralTokenAmountFilled, loanOrderHash)", loan.collateralTokenAmountFilled, loanOrder.loanOrderHash);
            return boolOrRevert(false,507);
        }

        loanOrder.collateralTokenAddress = collateralTokenAddress;
        loan.collateralTokenAmountFilled = collateralTokenAmountFilled;

        if(! Oracle_Interface(loanOrder.oracleAddress).didChangeCollateral(
            loanOrder.loanOrderHash,
            msg.sender,
            gasUsed // initial used gas, collected in modifier
        )) {
            //debugLog("error: didChangeCollateral oracle call failed! (loanOrderHash)", loanOrder.loanOrderHash);
            return boolOrRevert(false,519);
        }

        return true;
    }

    function closeTrade(
        bytes32 loanOrderHash)
        external
        nonReentrant
        tracksGas
        returns (bool tradeSuccess)
    {
        Trade storage activeTrade = trades[loanOrderHash][msg.sender];
        if (!activeTrade.active) {
            //debugLog("error: trade not found or not active (loanOrderHash)", loanOrderHash);
            return boolOrRevert(false,535);
        }

        tradeSuccess = closeOrLiquidate(
            loanOrderHash,
            msg.sender,
            activeTrade,
            false // isLiquidation
        );
    }

    function liquidateTrade(
        bytes32 loanOrderHash,
        address trader)
        external
        nonReentrant
        tracksGas
        returns (bool tradeSuccess)
    {
        // traders should call closeTrade to close their own trades
        if (trader == msg.sender) {
            //debugLog("error: traders should call closeTrade to close their own trades (loanOrderHash)", loanOrderHash);
            return boolOrRevert(false,557);
        }
        
        Trade storage activeTrade = trades[loanOrderHash][trader];
        if (!activeTrade.active) {
            //debugLog("error: trade not found or not active (loanOrderHash)", loanOrderHash);
            return boolOrRevert(false,563);
        }

        tradeSuccess = closeOrLiquidate(
            loanOrderHash,
            trader,
            activeTrade,
            true // isLiquidation
        );

        if (tradeSuccess) {
            // TODO: move to a closeLoan function
            loans[loanOrderHash][trader].active = false;
        }
    }

    /*
    * Constant public functions
    */

    /// @dev Calculates Keccak-256 hash of order with specified parameters.
    /// @param orderAddresses Array of order's maker, loanTokenAddress, interestTokenAddress collateralTokenAddress, and feeRecipientAddress.
    /// @param orderValues Array of order's loanTokenAmount, interestAmount, initialMarginAmount, maintenanceMarginAmount, lenderRelayFee, traderRelayFee, expirationUnixTimestampSec, and salt
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
    /// @param loanOrderHash The Keccak-256 hash of the given loanOrder.
    /// @return Sum of values already filled and cancelled.
    function getUnavailableLoanTokenAmount(bytes32 loanOrderHash)
        public
        view
        returns (uint)
    {
        return orderFilledAmounts[loanOrderHash].add(orderCancelledAmounts[loanOrderHash]);
    }

    function getLoanOrderByteData (
        bytes32 loanOrderHash)
        public
        view
        returns (bytes)
    {
        var (addrs,uints) = getLoanOrderParts(loanOrderHash);
        if (addrs[0] == address(0)) {
            //debugLog("error: invalid loan order (loanOrderHash)", loanOrderHash);
            voidOrRevert(621); return;
        }

        return getLoanOrderBytes(loanOrderHash, addrs, uints);
    }
    function getLoanOrderParts (
        bytes32 loanOrderHash)
        public
        view
        returns (address[6],uint[8])
    {
        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.loanOrderHash != loanOrderHash) {
            //debugLog("error: invalid loan order (loanOrderHash)", loanOrderHash);
            voidOrRevert(635); return;
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
                loanOrder.maintenanceMarginAmount,
                loanOrder.lenderRelayFee,
                loanOrder.traderRelayFee,
                loanOrder.expirationUnixTimestampSec,
                0
            ]
        );
    }

    function getLoanByteData (
        bytes32 loanOrderHash,
        address trader)
        public
        view
        returns (bytes)
    {
        var (lender,uints,active) = getLoanParts(loanOrderHash, trader);
        if (lender == address(0)) {
            //debugLog("error: loan not found (loanOrderHash)", loanOrderHash);
            voidOrRevert(670); return;
        }

        return getLoanBytes(lender, uints, active);
    }
    function getLoanParts (
        bytes32 loanOrderHash,
        address trader)
        public
        view
        returns (address,uint[4],bool)
    {
        Loan memory loan = loans[loanOrderHash][trader];
        if (loan.loanTokenAmountFilled == 0) {
            //debugLog("error: loan not found (loanOrderHash)", loanOrderHash);
            voidOrRevert(685); return;
        }

        return (
            loan.lender,
            [
                loan.collateralTokenAmountFilled,
                loan.loanTokenAmountFilled,
                loan.filledUnixTimestampSec,
                loan.listPosition
            ],
            loan.active
        );
    }

    function getTradeByteData (
        bytes32 loanOrderHash,
        address trader)
        public
        view
        returns (bytes)
    {
        var (tradeTokenAddress,uints,active) = getTradeParts(loanOrderHash, trader);
        if (tradeTokenAddress == address(0)) {
            //debugLog("error: loan not found (loanOrderHash)", loanOrderHash);
            voidOrRevert(710); return;
        }

        return getTradeBytes(tradeTokenAddress, uints, active);
    }
    function getTradeParts (
        bytes32 loanOrderHash,
        address trader)
        public
        view
        returns (address,uint[4],bool)
    {
        Trade memory trade = trades[loanOrderHash][trader];
        if (trade.tradeTokenAmount == 0) {
            //debugLog("error: trade not found (loanOrderHash)", loanOrderHash);
            voidOrRevert(725); return;
        }

        return (
            trade.tradeTokenAddress,
            [
                trade.tradeTokenAmount,
                trade.loanTokenUsedAmount,
                trade.filledUnixTimestampSec,
                trade.listPosition
            ],
            trade.active
        );
    }
    
    function getLoanOrderLog(
        bytes loanOrderData)
        public
    {
        LoanOrder memory loanOrder = getLoanOrderFromBytes(loanOrderData);

        LogLoanOrder(
            loanOrder.maker,
            loanOrder.loanTokenAddress,
            loanOrder.interestTokenAddress,
            loanOrder.collateralTokenAddress,
            loanOrder.feeRecipientAddress,
            loanOrder.oracleAddress,
            loanOrder.loanTokenAmount,
            loanOrder.interestAmount,
            loanOrder.initialMarginAmount,
            loanOrder.maintenanceMarginAmount,
            loanOrder.lenderRelayFee,
            loanOrder.traderRelayFee,
            loanOrder.expirationUnixTimestampSec,
            loanOrder.loanOrderHash
        );
    }
    function getLoanLog(
        bytes loanData)
        public
    {
        Loan memory loan = getLoanFromBytes(loanData);

        LogLoanOrTrade(
            loan.lender,
            loan.collateralTokenAmountFilled,
            loan.loanTokenAmountFilled,
            loan.filledUnixTimestampSec,
            loan.listPosition,
            loan.active
        );
    }
    function getTradeLog(
        bytes tradeData)
        public
    {
        Trade memory trade = getTradeFromBytes(tradeData);

        LogLoanOrTrade(
            trade.tradeTokenAddress,
            trade.tradeTokenAmount,
            trade.loanTokenUsedAmount,
            trade.filledUnixTimestampSec,
            trade.listPosition,
            trade.active
        );
    }

    function getInterest(
        bytes32 loanOrderHash,
        address trader)
        public
        view
        returns (address lender, address interestTokenAddress, uint totalAmountAccrued, uint interestPaidSoFar) {

        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.loanOrderHash != loanOrderHash) {
            //debugLog("error: invalid loan order (loanOrderHash)", loanOrderHash);
            voidOrRevert(804); return;
        }

        InterestData memory interestData = getInterest(loanOrder,trader);
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

    function getInterest(
        LoanOrder loanOrder,
        address trader)
        internal
        view
        returns (InterestData interestData)
    {
        Loan memory loan = loans[loanOrder.loanOrderHash][trader];
        if (loan.loanTokenAmountFilled == 0 || !loan.active) {
            //debugLog("error: loan not found or not active (loanOrderHash)", loanOrder.loanOrderHash);
            voidOrRevert(889); return;
        }
        
        uint interestTime = block.timestamp;
        if (interestTime > loanOrder.expirationUnixTimestampSec) {
            //debugLog("notice: loanOrder has expired (loanOrderHash)", loanOrder.loanOrderHash);
            interestTime = loanOrder.expirationUnixTimestampSec;
        }

        interestData = InterestData({
            lender: loan.lender,
            interestTokenAddress: loanOrder.interestTokenAddress,
            totalAmountAccrued: interestTime.sub(loan.filledUnixTimestampSec) / 86400 * loanOrder.interestAmount * loan.loanTokenAmountFilled / loanOrder.loanTokenAmount,
            interestPaidSoFar: interestPaid[loanOrder.loanOrderHash][trader]
        });
    }

    /*
    * Public Internal functions
    */

    function verifyLoanOrder(
        LoanOrder loanOrder,
        uint loanTokenAmountFilled)
        internal
        returns (bool)
    {
        if (loanOrder.maker == msg.sender) {
            //debugLog("error: invalid taker (loanOrderHash)", loanOrder.loanOrderHash);
            return boolOrRevert(false,918);
        }
        if (loanOrder.loanTokenAddress == address(0) 
            || loanOrder.interestTokenAddress == address(0)
            || loanOrder.collateralTokenAddress == address(0)) {
            //debugLog("error: one or more token addresses are missing from the order (loanOrderHash)", loanOrder.loanOrderHash);
            return boolOrRevert(false,924);
        }

        if (loanOrder.oracleAddress == address(0)) {
            //debugLog("error: must include an oracleAddress (loanOrderHash)", loanOrder.loanOrderHash);
            return boolOrRevert(false,929);
        }

        if (block.timestamp >= loanOrder.expirationUnixTimestampSec) {
            //LogError(uint8(Errors.ORDER_EXPIRED), 0, loanOrder.loanOrderHash);
            //debugLog("error: loanOrder has expired (loanOrderHash)", loanOrder.loanOrderHash);
            return boolOrRevert(false,935);
        }

        if(! (loanOrder.maintenanceMarginAmount >= 0 && loanOrder.maintenanceMarginAmount < loanOrder.initialMarginAmount && loanOrder.initialMarginAmount <= 100)) {
            //debugLog("error: valid margin parameters (loanOrderHash)", loanOrder.loanOrderHash);
            return boolOrRevert(false,940);
        }

        uint remainingLoanTokenAmount = loanOrder.loanTokenAmount.sub(getUnavailableLoanTokenAmount(loanOrder.loanOrderHash));
        if (remainingLoanTokenAmount < loanTokenAmountFilled) {
            //debugLog("error: not enough loanToken still available in thie order (loanOrderHash)", loanOrder.loanOrderHash);
            return boolOrRevert(false,946);
        }

        return true;
    }

    function takeLoanOrder(
        LoanOrder loanOrder,
        address trader,
        address lender,
        uint loanTokenAmountFilled)
        private
        returns (uint)
    {
        if (!verifyLoanOrder(loanOrder, loanTokenAmountFilled)) {
            //debugLog("error: loanOrder did not pass validation! (loanOrderHash)", loanOrder.loanOrderHash);
            return intOrRevert(0,962);
        }

        // A trader can only fill a portion or all of a loanOrder once:
        //  - this avoids complex interest payments for parts of an order filled at different times by the same trader
        //  - this avoids potentially large loops when calculating margin reqirements and interest payments
        Loan storage loan = loans[loanOrder.loanOrderHash][trader];
        if (loan.loanTokenAmountFilled != 0) {
            //debugLog("error: loanOrder already filled for this trader (loanOrderHash)", loanOrder.loanOrderHash);
            return intOrRevert(0,971);
        }

        if (! Oracle_Interface(loanOrder.oracleAddress).isTradeSupported(
            loanOrder.collateralTokenAddress,
            loanOrder.loanTokenAddress)) {
            //debugLog("changeCollateral error: collateralToken to loanToken trade not supported by oracle (loanOrderHash)", loanOrder.loanOrderHash);
            return intOrRevert(0,978);
        }

        uint collateralTokenAmountFilled = getInitialMarginRequired(
            loanOrder.loanTokenAddress,
            loanOrder.collateralTokenAddress,
            loanOrder.oracleAddress,
            loanOrder.initialMarginAmount,
            loanTokenAmountFilled
        );

        uint paidTraderFee;
        uint paidLenderFee;
        orders[loanOrder.loanOrderHash] = loanOrder;
        orderFilledAmounts[loanOrder.loanOrderHash] = orderFilledAmounts[loanOrder.loanOrderHash].add(loanTokenAmountFilled);

        orderList[trader].push(loanOrder.loanOrderHash);

        loan.lender = lender;
        loan.collateralTokenAmountFilled = collateralTokenAmountFilled;
        loan.loanTokenAmountFilled = loanTokenAmountFilled;
        loan.filledUnixTimestampSec = block.timestamp;
        loan.listPosition = orderList[trader].length-1;
        loan.active = true;

        // temp: good for testing
        // may change this later
        LogLoanOrTrade (
            loan.lender,
            loan.collateralTokenAmountFilled,
            loan.loanTokenAmountFilled,
            loan.filledUnixTimestampSec,
            loan.listPosition,
            loan.active
        );

        if (! B0xVault(VAULT_CONTRACT).depositCollateral(
            loanOrder.collateralTokenAddress,
            trader,
            collateralTokenAmountFilled
        )) {
            //debugLog("error: unable to transfer enough collateralToken (collateralTokenAmountFilled, loanOrderHash)", collateralTokenAmountFilled, loanOrder.loanOrderHash);
            return intOrRevert(loanTokenAmountFilled,55);
        }

        // total interest required if loan is kept until order expiration
        // unused interest at the end of a loan is refunded to the trader
        uint totalInterestRequired = getTotalInterestRequired(loanOrder, loanTokenAmountFilled);
        if (! B0xVault(VAULT_CONTRACT).depositInterest(
            loanOrder.interestTokenAddress,
            trader,
            totalInterestRequired
        )) {
            //debugLog("error: unable to transfer enough interestToken (totalInterestRequired, loanOrderHash)", totalInterestRequired, loanOrder.loanOrderHash);
            return intOrRevert(loanTokenAmountFilled,55);
        }

        if (! B0xVault(VAULT_CONTRACT).depositFunding(
            loanOrder.loanTokenAddress,
            lender,
            loanTokenAmountFilled
        )) {
            //debugLog("error: unable to transfer enough loanToken (loanTokenAmountFilled, loanOrderHash)", loanTokenAmountFilled, loanOrder.loanOrderHash);
            return intOrRevert(loanTokenAmountFilled,55);
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
                    //debugLog("error: unable to pay traderRelayFee (loanOrderHash)", loanOrder.loanOrderHash);
                    return intOrRevert(loanTokenAmountFilled,55);
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
                    //debugLog("error: unable to pay lenderRelayFee (loanOrderHash)", loanOrder.loanOrderHash);
                    return intOrRevert(0,1068);
                }
            }
        }
        
        return loanTokenAmountFilled;
    }

    function closeOrLiquidate(
        bytes32 loanOrderHash,
        address trader,
        Trade storage activeTrade,
        bool isLiquidation)
        internal
        returns (bool tradeSuccess)
    {
        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.loanOrderHash != loanOrderHash) {
            //debugLog("error: invalid loan order (loanOrderHash)", loanOrderHash);
            return boolOrRevert(false,1087);
        }

        uint loanTokenAmountReceived = Oracle_Interface(loanOrder.oracleAddress).verifyAndDoTrade(
            loanOrderHash,
            trader,
            activeTrade.tradeTokenAddress,
            loanOrder.loanTokenAddress,
            activeTrade.tradeTokenAmount,
            isLiquidation
        );

        // TODO: Checks to make sure all of the tradeToken was sold

        if (loanTokenAmountReceived == 0) {
            //debugLog("error: trade failed in the Oracle! (loanOrderHash)", loanOrderHash);
            return boolOrRevert(false,1103);
        }

        if(! Oracle_Interface(loanOrder.oracleAddress).didCloseTrade(
            loanOrderHash,
            msg.sender,
            isLiquidation,
            gasUsed // initial used gas, collected in modifier
        )) {
            //debugLog("error: didCloseTrade oracle call failed! (loanOrderHash)", loanOrder.loanOrderHash);
            return boolOrRevert(false,1113);
        }

        activeTrade.active = false;

        return true;
    }

    function getInitialMarginRequired(
        address loanTokenAddress,
        address collateralTokenAddress,
        address oracleAddress,
        uint initialMarginAmount,
        uint loanTokenAmountFilled)
        public
        returns (uint collateralTokenAmountFilled)
    {
        uint collateralToLendRate = Oracle_Interface(oracleAddress).getTradeRate(
            collateralTokenAddress,
            loanTokenAddress
        );
        if (collateralToLendRate == 0) {
            //debugLog("error: conversion rate from collateralToken to loanToken is 0 or not found");
            return intOrRevert(0,1136);
        }
        
        collateralTokenAmountFilled = loanTokenAmountFilled.mul(collateralToLendRate).mul(initialMarginAmount).div(100);//.div(PRECISION);
    }

    function getTotalInterestRequired(
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
        onlyOwner
    {
        B0XTO0X_CONTRACT = _exchange0xWrapper;
    }

    function upgradeContract (
        address newContract)
        public
        onlyOwner
    {
        require(newContract != address(0) && newContract != address(this));
        upgrade(newContract);
        B0xVault(VAULT_CONTRACT).transferOwnership(newContract);
        if (ORACLE_CONTRACT != address(0)) {
            B0xOracle(ORACLE_CONTRACT).transferOwnership(newContract);
        }
    }
}

