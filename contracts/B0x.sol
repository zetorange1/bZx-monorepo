
pragma solidity ^0.4.19;

import 'zeppelin-solidity/contracts/math/Math.sol';

import './modifiers/Upgradeable.sol';
import './modifiers/GasTracker.sol';
import './shared/Debugger.sol';

import './shared/B0xTypes.sol';
import './B0xVault.sol';

import './oracle/OracleRegistry.sol';

// interfaces
import './interfaces/Oracle_Interface.sol';
import './interfaces/B0xTo0x_Interface.sol';

// to help prevent reentrancy attacks
import 'zeppelin-solidity/contracts/ReentrancyGuard.sol';

/*
TODO:
    function closeTradeWith0x(..)
*/

contract B0x is ReentrancyGuard, Upgradeable, GasTracker, Debugger, B0xTypes {
    using SafeMath for uint256;

    string constant public VERSION = "1.0.0";
    uint16 constant public EXTERNAL_QUERY_GAS_LIMIT = 4999; // Changes to state require at least 5000 gas

    address public B0X_TOKEN_CONTRACT;
    address public VAULT_CONTRACT;
    address public B0XORACLE_CONTRACT;
    address public ORACLE_REGISTRY_CONTRACT;
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
        address _oracleregistry,
        address _exchange0xWrapper) 
        public
    {
        B0X_TOKEN_CONTRACT = _b0xToken;
        VAULT_CONTRACT = _vault;
        ORACLE_REGISTRY_CONTRACT = _oracleregistry;
        B0XTO0X_CONTRACT = _exchange0xWrapper;
    }


    /// @dev Takes the order as trader
    /// @param orderAddresses Array of order's makerAddress, loanTokenAddress, interestTokenAddress collateralTokenAddress, feeRecipientAddress, oracleAddress.
    /// @param orderValues Array of order's loanTokenAmount, interestAmount, initialMarginAmount, maintenanceMarginAmount, lenderRelayFee, traderRelayFee, expirationUnixTimestampSec, and salt.
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
            return intOrRevert(0,132);
        }

        uint actualLendFill = _takeLoanOrder(
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
                return intOrRevert(0,170);
            }
        }

        return actualLendFill;
    }



    /// @dev Takes the order as lender
    /// @param orderAddresses Array of order's makerAddress, loanTokenAddress, interestTokenAddress collateralTokenAddress, feeRecipientAddress, oracleAddress.
    /// @param orderValues Array of order's loanTokenAmount, interestAmount, initialMarginAmount, maintenanceMarginAmount, lenderRelayFee, traderRelayFee, expirationUnixTimestampSec, and salt.    /// @param signature ECDSA signature in raw bytes (rsv).
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
            return intOrRevert(0,203);
        }
        
        uint actualLendFill = _takeLoanOrder(
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
                return intOrRevert(0,241);
            }
        }

        return actualLendFill;
    }

    function open0xTrade(
        bytes32 loanOrderHash,
        bytes orderData0x) // 0x order arguments and converted to hex, padded to 32 bytes, concatenated, and appended to the ECDSA
        external
        nonReentrant
        tracksGas
        returns (uint)
    {
        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.maker == address(0)) {
            //debugLog("error: invalid loan order (loanOrderHash)", loanOrderHash);
            return intOrRevert(0,259);
        }

        if (block.timestamp >= loanOrder.expirationUnixTimestampSec) {
            //debugLog("error: loan order is expired (loanOrderHash)", loanOrderHash);
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

        if (Oracle_Interface(loanOrder.oracleAddress).shouldLiquidate(
                loanOrderHash,
                msg.sender,
                loanOrder.loanTokenAddress,
                loanOrder.collateralTokenAddress,
                loan.loanTokenAmountFilled,
                loan.collateralTokenAmountFilled,
                loanOrder.maintenanceMarginAmount)) {
            //debugLog("error: margin too low! (loanOrderHash)", loanOrderHash);
            return intOrRevert(0,288);
        }

        // transfer the loanToken to the B0xTo0x contract
        if (!B0xVault(VAULT_CONTRACT).transferFrom(
            loanOrder.loanTokenAddress,
            loan.lender,
            B0XTO0X_CONTRACT,
            loan.loanTokenAmountFilled))
            revert();

        var (tradeTokenAddress, tradeTokenAmount, loanTokenUsedAmount) = B0xTo0x_Interface(B0XTO0X_CONTRACT).take0xTrade(
            msg.sender, // trader
            loanOrder.oracleAddress, // the Oracle receives the tradeToken 
            loan.loanTokenAmountFilled,
            orderData0x);

        /*
        orderAddresses0x[4] // feeRecipient
        orderValues0x[3] // takerFee
        orderAddresses0x[2]; // makerToken (aka tradeTokenAddress)
        orderValues0x[1], // takerTokenAmount (aka loanTokenAmount)
        orderValues0x[0] // makerTokenAmount (aka tradeTokenAmount)
        */

        if (tradeTokenAmount == 0) {
            //debugLog("error: 0x trade did not fill! (loanOrderHash)", loanOrderHash);
            return intOrRevert(0,315);
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
            return intOrRevert(0,344);
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
        if (loanOrder.maker == address(0)) {
            //debugLog("payInterest error: invalid loan order (loanOrderHash)", loanOrderHash);
            return intOrRevert(0,361);
        }

        Loan storage loan = loans[loanOrderHash][trader];
        if (loan.loanTokenAmountFilled == 0 || !loan.active) {
            //debugLog("payInterest error: loan not found or not active (loanOrderHash)", loanOrderHash);
            return intOrRevert(0,367);
        }
        
        InterestData memory interestData = getInterest(loanOrder,trader);

        if (interestData.interestPaidSoFar >= interestData.totalAmountAccrued) {
            //debugLog("warning: nothing left to pay for this loanOrderHash and trader (loanOrderHash)", loanOrderHash);
            return intOrRevert(0,374);
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
            return intOrRevert(0,388);
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
            return intOrRevert(0,401);
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
        if (loanOrder.maker == address(0)) {
            //debugLog("depositCollateral error: invalid loan order (loanOrderHash)", loanOrderHash);
            return boolOrRevert(false,419);
        }

        if (block.timestamp >= loanOrder.expirationUnixTimestampSec) {
            //debugLog("error: loan order is expired (loanOrderHash)", loanOrderHash);
            return boolOrRevert(false,424);
        }

        Loan storage loan = loans[loanOrderHash][msg.sender];
        if (loan.loanTokenAmountFilled == 0 || !loan.active) {
            //debugLog("depositCollateral error: loan not found or not active (loanOrderHash)", loanOrderHash);
            return boolOrRevert(false,430);
        }

        if (! B0xVault(VAULT_CONTRACT).depositCollateral(
            loanOrder.collateralTokenAddress,
            msg.sender,
            depositAmount
        )) {
            //debugLog("depositCollateral error: unable to transfer enough collateralToken (depositAmount, loanOrderHash)", depositAmount, loanOrder.loanOrderHash);
            return boolOrRevert(false,439);
        }

        loan.collateralTokenAmountFilled = loan.collateralTokenAmountFilled.add(depositAmount);

        if(! Oracle_Interface(loanOrder.oracleAddress).didDepositCollateral(
            loanOrder.loanOrderHash,
            msg.sender,
            gasUsed // initial used gas, collected in modifier
        )) {
            //debugLog("error: didDepositCollateral oracle call failed! (loanOrderHash)", loanOrder.loanOrderHash);
            return boolOrRevert(false,450);
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
        if (loanOrder.maker == address(0)) {
            //debugLog("changeCollateral error: invalid loan order (loanOrderHash)", loanOrderHash);
            return boolOrRevert(false,470);
        }

        if (collateralTokenAddress == address(0) || collateralTokenAddress == loanOrder.collateralTokenAddress) {
            //debugLog("changeCollateral error: invalid collateralTokenAddress (loanOrderHash)", loanOrderHash);
            return boolOrRevert(false,475);
        }

        if (block.timestamp >= loanOrder.expirationUnixTimestampSec) {
            //debugLog("error: loan order is expired (loanOrderHash)", loanOrderHash);
            return boolOrRevert(false,480);
        }

        Loan storage loan = loans[loanOrderHash][msg.sender];
        if (loan.loanTokenAmountFilled == 0 || !loan.active) {
            //debugLog("changeCollateral error: loan not found or not active (loanOrderHash)", loanOrderHash);
            return boolOrRevert(false,486);
        }

        uint collateralTokenAmountFilled = getInitialMarginRequired(
            loanOrder.loanTokenAddress,
            collateralTokenAddress,
            loanOrder.oracleAddress,
            loan.loanTokenAmountFilled,
            loanOrder.initialMarginAmount
        );
        if (collateralTokenAmountFilled == 0) {
            //debugLog("changeCollateral error: loanToken to collateralToken combo not supported at this time by oracle (loanOrderHash)", loanOrderHash);
            return boolOrRevert(false,498);
        }

        // transfer the new collateral token from the trader to the vault
        if (! B0xVault(VAULT_CONTRACT).depositCollateral(
            collateralTokenAddress,
            msg.sender,
            collateralTokenAmountFilled
        )) {
            //debugLog("changeCollateral error: unable to transfer enough collateralToken to vault (collateralTokenAmountFilled, loanOrderHash)", collateralTokenAmountFilled, loanOrder.loanOrderHash);
            return boolOrRevert(false,508);
        }

        // transfer the old collateral token from the vault to the trader
        if (! B0xVault(VAULT_CONTRACT).withdrawCollateral(
            loanOrder.collateralTokenAddress,
            msg.sender,
            loan.collateralTokenAmountFilled
        )) {
            //debugLog("changeCollateral error: unable to transfer enough collateralToken to trader (collateralTokenAmountFilled, loanOrderHash)", loan.collateralTokenAmountFilled, loanOrder.loanOrderHash);
            return boolOrRevert(false,518);
        }

        loanOrder.collateralTokenAddress = collateralTokenAddress;
        loan.collateralTokenAmountFilled = collateralTokenAmountFilled;

        if(! Oracle_Interface(loanOrder.oracleAddress).didChangeCollateral(
            loanOrder.loanOrderHash,
            msg.sender,
            gasUsed // initial used gas, collected in modifier
        )) {
            //debugLog("error: didChangeCollateral oracle call failed! (loanOrderHash)", loanOrder.loanOrderHash);
            return boolOrRevert(false,530);
        }

        return true;
    }

    function closeTrade(
        bytes32 loanOrderHash)
        external
        nonReentrant
        tracksGas
        returns (bool)
    {
        Trade storage trade = trades[loanOrderHash][msg.sender];
        if (!trade.active) {
            //debugLog("error: trade not found or not active (loanOrderHash)", loanOrderHash);
            return boolOrRevert(false,546);
        }

        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.maker == address(0)) {
            //debugLog("error: invalid loan order (loanOrderHash)", loanOrderHash);
            return boolOrRevert(false,552);
        }

        return _closeTrade(
            loanOrder,
            trade,
            msg.sender,
            false // isLiquidation
        );
    }

    function liquidateTrade(
        bytes32 loanOrderHash,
        address trader)
        external
        nonReentrant
        tracksGas
        returns (bool)
    {
        // traders should call closeTrade to close their own trades
        if (trader == msg.sender) {
            //debugLog("error: traders should call closeTrade to close their own trades (loanOrderHash)", loanOrderHash);
            return boolOrRevert(false,574);
        }
        
        Trade storage trade = trades[loanOrderHash][trader];
        if (!trade.active) {
            //debugLog("error: trade not found or not active (loanOrderHash)", loanOrderHash);
            return boolOrRevert(false,580);
        }

        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.maker == address(0)) {
            //debugLog("error: invalid loan order (loanOrderHash)", loanOrderHash);
            return boolOrRevert(false,586);
        }

        // liqudation must succeed!
        require(_closeTrade(
            loanOrder,
            trade,
            trader,
            true // isLiquidation
        ));
        
        return _closeLoan(
            loanOrder,
            loans[loanOrderHash][trader], // needs to be storage
            gasUsed // initial used gas, collected in modifier
        );
    }

    function closeLoan(
        bytes32 loanOrderHash)
        external
        nonReentrant
        tracksGas
        returns (bool)
    {
        Trade memory trade = trades[loanOrderHash][msg.sender];
        if (trade.active) {
            //debugLog("error: loan cannot be closed while a trade is in progress (loanOrderHash)", loanOrderHash);
            return boolOrRevert(false,614);
        }

        Loan storage loan = loans[loanOrderHash][msg.sender];
        if (loan.loanTokenAmountFilled == 0 || !loan.active) {
            //debugLog("error: loan not found or not active (loanOrderHash)", loanOrderHash);
            return boolOrRevert(false,620);
        }

        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.maker == address(0)) {
            //debugLog("changeCollateral error: invalid loan order (loanOrderHash)", loanOrderHash);
            return boolOrRevert(false,626);
        }
        
        return _closeLoan(
            loanOrder,
            loan, // needs to be storage
            gasUsed // initial used gas, collected in modifier
        );
    }

    function cancelLoanOrder(
        address[6] orderAddresses,
        uint[8] orderValues,
        uint cancelLoanTokenAmount)
        external
        nonReentrant
        tracksGas
        returns (uint)
    {
        LoanOrder memory loanOrder = buildLoanOrderStruct(
            getLoanOrderHash(orderAddresses, orderValues),
            orderAddresses,
            orderValues
        );

        require(loanOrder.maker == msg.sender);

        return _cancelLoanOrder(loanOrder, cancelLoanTokenAmount);
    }

    function cancelLoanOrder(
        bytes32 loanOrderHash,
        uint cancelLoanTokenAmount)
        external
        nonReentrant
        tracksGas
        returns (uint)
    {
        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.maker == address(0)) {
            //debugLog("changeCollateral error: invalid loan order (loanOrderHash)", loanOrderHash);
            return intOrRevert(0,667);
        }

        require(loanOrder.maker == msg.sender);

        return _cancelLoanOrder(loanOrder, cancelLoanTokenAmount);
    }


    /*
    * Constant public functions
    */

    function shouldLiquidate(
        bytes32 loanOrderHash,
        address trader)
        public
        view
        returns (bool)
    {
        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.maker == address(0)) {
            return false;
        }

        Loan memory loan = loans[loanOrderHash][msg.sender];
        if (loan.loanTokenAmountFilled == 0 || !loan.active) {
            return false;
        }

        Trade storage trade = trades[loanOrderHash][msg.sender];

        if (trade.active) {
            if (block.timestamp >= loanOrder.expirationUnixTimestampSec) {
                return true; // expired loan
            }

            return Oracle_Interface(loanOrder.oracleAddress).shouldLiquidate(
                loanOrderHash,
                trader,
                trade.tradeTokenAddress,
                loanOrder.collateralTokenAddress,
                trade.tradeTokenAmount,
                loan.collateralTokenAmountFilled,
                loanOrder.maintenanceMarginAmount);
        }
        else {
            return Oracle_Interface(loanOrder.oracleAddress).shouldLiquidate(
                loanOrderHash,
                trader,
                loanOrder.loanTokenAddress,
                loanOrder.collateralTokenAddress,
                loan.loanTokenAmountFilled,
                loan.collateralTokenAmountFilled,
                loanOrder.maintenanceMarginAmount);
        }
    }

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
            return;
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
        if (loanOrder.maker == address(0)) {
            return;
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
            return;
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
            return;
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
            return;
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
            return;
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
        if (loanOrder.maker == address(0)) {
            return;
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

    /// @dev Checks if rounding error > 0.1%.
    /// @param numerator Numerator.
    /// @param denominator Denominator.
    /// @param target Value to multiply with numerator/denominator.
    /// @return Rounding error is present.
    function isRoundingError(uint numerator, uint denominator, uint target)
        public
        pure
        returns (bool)
    {
        uint remainder = mulmod(target, numerator, denominator);
        if (remainder == 0) return false; // No rounding error.

        uint errPercentageTimes1000000 = SafeMath.div(
            SafeMath.mul(remainder, 1000000),
            SafeMath.mul(numerator, target)
        );
        return errPercentageTimes1000000 > 1000;
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
        
        return numerator.mul(target).div(denominator);
    }

    function getPartialAmountNoError(uint numerator, uint denominator, uint target)
        public
        pure
        returns (uint)
    {
        
        require(!isRoundingError(numerator, denominator, target));
        return getPartialAmount(numerator, denominator, target);
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
            return;
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
    * Internal functions
    */

    function _verifyLoanOrder(
        LoanOrder loanOrder,
        uint loanTokenAmountFilled)
        internal
        returns (bool)
    {
        if (loanOrder.maker == msg.sender) {
            //debugLog("error: invalid taker (loanOrderHash)", loanOrder.loanOrderHash);
            return boolOrRevert(false,1083);
        }
        if (loanOrder.loanTokenAddress == address(0) 
            || loanOrder.interestTokenAddress == address(0)
            || loanOrder.collateralTokenAddress == address(0)) {
            //debugLog("error: one or more token addresses are missing from the order (loanOrderHash)", loanOrder.loanOrderHash);
            return boolOrRevert(false,1089);
        }

        if (loanTokenAmountFilled > loanOrder.loanTokenAmount) {
            //debugLog("error: loanTokenAmountFilled can't be greater than loanOrder.loanTokenAmount (loanOrderHash)", loanOrder.loanOrderHash);
            return boolOrRevert(false,1094);
        }

        if (! OracleRegistry(ORACLE_REGISTRY_CONTRACT).hasOracle(loanOrder.oracleAddress)) {
            //debugLog("error: oracle doesn't exist in OracleRegistry (loanOrderHash)", loanOrder.loanOrderHash);
            return boolOrRevert(false,1099);
        }

        if (block.timestamp >= loanOrder.expirationUnixTimestampSec) {
            //LogError(uint8(Errors.ORDER_EXPIRED), 0, loanOrder.loanOrderHash);
            //debugLog("error: loanOrder has expired (loanOrderHash)", loanOrder.loanOrderHash);
            return boolOrRevert(false,1105);
        }

        if(! (loanOrder.maintenanceMarginAmount >= 0 && loanOrder.maintenanceMarginAmount < loanOrder.initialMarginAmount && loanOrder.initialMarginAmount <= 100)) {
            //debugLog("error: valid margin parameters (loanOrderHash)", loanOrder.loanOrderHash);
            return boolOrRevert(false,1110);
        }

        uint remainingLoanTokenAmount = loanOrder.loanTokenAmount.sub(getUnavailableLoanTokenAmount(loanOrder.loanOrderHash));
        if (remainingLoanTokenAmount < loanTokenAmountFilled) {
            //debugLog("error: not enough loanToken still available in thie order (loanOrderHash)", loanOrder.loanOrderHash);
            return boolOrRevert(false,1116);
        }

        return true;
    }
    
    function _takeLoanOrder(
        LoanOrder loanOrder,
        address trader,
        address lender,
        uint loanTokenAmountFilled)
        private
        returns (uint)
    {
        if (!_verifyLoanOrder(loanOrder, loanTokenAmountFilled)) {
            //debugLog("error: loanOrder did not pass validation! (loanOrderHash)", loanOrder.loanOrderHash);
            return intOrRevert(0,1132);
        }

        // A trader can only fill a portion or all of a loanOrder once:
        //  - this avoids complex interest payments for parts of an order filled at different times by the same trader
        //  - this avoids potentially large loops when calculating margin reqirements and interest payments
        Loan storage loan = loans[loanOrder.loanOrderHash][trader];
        if (loan.loanTokenAmountFilled != 0) {
            //debugLog("error: loanOrder already filled for this trader (loanOrderHash)", loanOrder.loanOrderHash);
            return intOrRevert(0,1141);
        }

        uint collateralTokenAmountFilled = getInitialMarginRequired(
            loanOrder.loanTokenAddress,
            loanOrder.collateralTokenAddress,
            loanOrder.oracleAddress,
            loanTokenAmountFilled,
            loanOrder.initialMarginAmount
        );
        if (collateralTokenAmountFilled == 0) {
            //debugLog("changeCollateral error: loanToken to collateralToken combo not supported at this time by oracle (loanOrderHash)", loanOrderHash);
            return intOrRevert(0,1153);
        }

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
            return intOrRevert(loanTokenAmountFilled,1187);
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
            return intOrRevert(loanTokenAmountFilled,1199);
        }

        if (! B0xVault(VAULT_CONTRACT).depositFunding(
            loanOrder.loanTokenAddress,
            lender,
            loanTokenAmountFilled
        )) {
            //debugLog("error: unable to transfer enough loanToken (loanTokenAmountFilled, loanOrderHash)", loanTokenAmountFilled, loanOrder.loanOrderHash);
            return intOrRevert(loanTokenAmountFilled,1208);
        }

        if (loanOrder.feeRecipientAddress != address(0)) {
            if (loanOrder.traderRelayFee > 0) {
                paidTraderFee = getPartialAmountNoError(loanTokenAmountFilled, loanOrder.loanTokenAmount, loanOrder.traderRelayFee);
                
                if (! B0xVault(VAULT_CONTRACT).transferFrom(
                    B0X_TOKEN_CONTRACT, 
                    trader,
                    loanOrder.feeRecipientAddress,
                    paidTraderFee
                )) {
                    //debugLog("error: unable to pay traderRelayFee (loanOrderHash)", loanOrder.loanOrderHash);
                    return intOrRevert(loanTokenAmountFilled,1222);
                }
            }
            if (loanOrder.lenderRelayFee > 0) {
                paidLenderFee = getPartialAmountNoError(loanTokenAmountFilled, loanOrder.loanTokenAmount, loanOrder.lenderRelayFee);
                
                if (! B0xVault(VAULT_CONTRACT).transferFrom(
                    B0X_TOKEN_CONTRACT, 
                    lender,
                    loanOrder.feeRecipientAddress,
                    paidLenderFee
                )) {
                    //debugLog("error: unable to pay lenderRelayFee (loanOrderHash)", loanOrder.loanOrderHash);
                    return intOrRevert(0,1235);
                }
            }
        }

        return loanTokenAmountFilled;
    }

    // this cancels any reminaing un-loaned loanToken in the order
    function _cancelLoanOrder(
        LoanOrder loanOrder,
        uint cancelLoanTokenAmount)
        internal
        returns (uint)
    {
        require(loanOrder.loanTokenAmount > 0 && cancelLoanTokenAmount > 0);

        if (block.timestamp >= loanOrder.expirationUnixTimestampSec) {
            return 0;
        }

        uint remainingLoanTokenAmount = loanOrder.loanTokenAmount.sub(getUnavailableLoanTokenAmount(loanOrder.loanOrderHash));
        uint cancelledLoanTokenAmount = Math.min256(cancelLoanTokenAmount, remainingLoanTokenAmount);
        if (cancelledLoanTokenAmount == 0) {
            // none left to cancel
            return 0;
        }

        orderCancelledAmounts[loanOrder.loanOrderHash] = orderCancelledAmounts[loanOrder.loanOrderHash].add(cancelledLoanTokenAmount);

        // TODO: needs event
    
        return cancelledLoanTokenAmount;
    }

    // TODO: Not yet complete (need to refund collateralToken, loanToken, and remaining interestToken)
    function _closeLoan(
        LoanOrder loanOrder,
        Loan storage loan,
        uint gasUsed)
        internal
        returns (bool)
    {
        _cancelLoanOrder(loanOrder, MAX_UINT);

        loan.active = false;

        if(! Oracle_Interface(loanOrder.oracleAddress).didCloseLoan(
            loanOrder.loanOrderHash,
            gasUsed
        )) {
            //debugLog("error: didCloseLoan oracle call failed! (loanOrderHash)", loanOrder.loanOrderHash);
            return boolOrRevert(false,1287);
        }

        return true;
    }

    function _closeTrade(
        LoanOrder loanOrder,
        Trade storage trade,
        address trader,
        bool isLiquidation)
        internal
        returns (bool tradeSuccess)
    {
        uint loanTokenAmountReceived;
        if (isLiquidation) {
            loanTokenAmountReceived = Oracle_Interface(loanOrder.oracleAddress).verifyAndDoTrade(
                trade.tradeTokenAddress,
                loanOrder.loanTokenAddress,
                loanOrder.collateralTokenAddress,
                trade.tradeTokenAmount,
                loans[loanOrder.loanOrderHash][trader].collateralTokenAmountFilled, // loan already confirmed to be open, since trade is open
                loanOrder.maintenanceMarginAmount);
        }
        else {
            loanTokenAmountReceived = Oracle_Interface(loanOrder.oracleAddress).doTrade(
                trade.tradeTokenAddress,
                loanOrder.loanTokenAddress,
                trade.tradeTokenAmount);
        }

        // TODO: Checks to make sure all of the tradeToken was sold

        if (loanTokenAmountReceived == 0) {
            //debugLog("error: trade failed in the Oracle! (loanOrderHash)", loanOrder.loanOrderHash);
            return boolOrRevert(false,1322);
        }

        if(! Oracle_Interface(loanOrder.oracleAddress).didCloseTrade(
            loanOrder.loanOrderHash,
            msg.sender,
            isLiquidation,
            gasUsed // initial used gas, collected in modifier
        )) {
            //debugLog("error: didCloseTrade oracle call failed! (loanOrderHash)", loanOrder.loanOrderHash);
            return boolOrRevert(false,1332);
        }

        trade.active = false;

        return true;
    }

    function getMarginRatio(
        bytes32 loanOrderHash,
        address trader)
        public
        view
        returns (uint marginRatio)
    {
        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.maker == address(0)) {
            return 0;
        }

        Loan memory loan = loans[loanOrderHash][trader];
        if (loan.loanTokenAmountFilled == 0 || !loan.active) {
            return 0;
        }

        Trade storage trade = trades[loanOrderHash][trader];

        if (trade.active) {
            marginRatio = Oracle_Interface(loanOrder.oracleAddress).getMarginRatio(
                trade.tradeTokenAddress,
                loanOrder.collateralTokenAddress,
                trade.tradeTokenAmount,
                loan.collateralTokenAmountFilled,
                loanOrder.maintenanceMarginAmount);
        }
        else {
            marginRatio = Oracle_Interface(loanOrder.oracleAddress).getMarginRatio(
                loanOrder.loanTokenAddress,
                loanOrder.collateralTokenAddress,
                loan.loanTokenAmountFilled,
                loan.collateralTokenAmountFilled,
                loanOrder.maintenanceMarginAmount);
        }
    }

    function getInitialMarginRequired(
        address exposureTokenAddress,
        address collateralTokenAddress,
        address oracleAddress,
        uint exposureTokenAmount,
        uint initialMarginAmount)
        public
        view
        returns (uint collateralTokenAmount)
    {
        uint exposureToCollateralRate = Oracle_Interface(oracleAddress).getTradeRate(
            exposureTokenAddress,
            collateralTokenAddress
        );
        if (exposureToCollateralRate == 0) {
            return 0;
        }
        
        collateralTokenAmount = exposureTokenAmount
                                    .mul(exposureToCollateralRate)
                                    .div(10**20)
                                    .mul(initialMarginAmount);

        MarginCalc(
            exposureTokenAddress,
            collateralTokenAddress,
            oracleAddress,
            exposureTokenAmount,
            collateralTokenAmount,
            initialMarginAmount,
            0
        );
    }

    function getTotalInterestRequired(
        LoanOrder loanOrder,
        uint loanTokenAmountFilled)
        internal
        view
        returns (uint totalInterestRequired)
    {
        totalInterestRequired = getPartialAmountNoError(loanTokenAmountFilled, loanOrder.loanTokenAmount, (loanOrder.expirationUnixTimestampSec.sub(block.timestamp) / 86400).mul(loanOrder.interestAmount));
    }


    /*
     * Owner only functions
     */

    function toggleDebugMode (
        bool _toggle)
        public
        onlyOwner
    {
        if (DEBUG_MODE != _toggle)
            DEBUG_MODE = _toggle;
    }

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
        if (B0XORACLE_CONTRACT != address(0)) {
            // B0xOracle is a descendant of Ownable
            Ownable(B0XORACLE_CONTRACT).transferOwnership(newContract);
        }
    }
}

