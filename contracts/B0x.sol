
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


contract B0x is ReentrancyGuard, Upgradeable, GasTracker, Debugger, B0xTypes {
    using SafeMath for uint256;

    string constant public VERSION = "1.0.0";

    address public B0X_TOKEN_CONTRACT;
    address public VAULT_CONTRACT;
    address public ORACLE_REGISTRY_CONTRACT;
    address public B0XTO0X_CONTRACT;

    mapping (bytes32 => LoanOrder) public orders; // mapping of loanOrderHash to taken loanOrders
    mapping (bytes32 => uint) public orderFilledAmounts; // mapping of loanOrderHash to loanTokenAmount filled
    mapping (bytes32 => uint) public orderCancelledAmounts; // mapping of loanOrderHash to loanTokenAmount cancelled

    mapping (bytes32 => mapping (address => LoanPosition)) public loanPositions; // mapping of loanOrderHash to mapping of traders to loanPositions
    mapping (address => bytes32[]) public loanList; // mapping of lenders and trader addresses to array of loanOrderHashes

    mapping (bytes32 => mapping (address => uint)) public interestPaid; // mapping of loanOrderHash to mapping of traders to amount of interest paid so far to a lender

    /*event LoanOrderTaken (
        address maker,
        address loanTokenAddress,
        address interestTokenAddress,
        address collateralTokenAddress,
        address feeRecipientAddress,
        address oracleAddress,
        uint loanTokenAmount,
        uint interestAmount,
        uint initialMarginAmount,
        uint maintenanceMarginAmount,
        uint lenderRelayFee,
        uint traderRelayFee,
        uint expirationUnixTimestampSec,
        bytes32 loanOrderHash
    );*/

    event LoanPositionUpdated (
        address lender,
        address trader,
        address collateralTokenAddressFilled,
        address positionTokenAddressFilled,
        uint loanTokenAmountFilled,
        uint collateralTokenAmountFilled,
        uint positionTokenAmountFilled,
        uint loanStartUnixTimestampSec,
        bool active,
        bytes32 loanOrderHash
    );

    event LogTradeOn0x(
        bytes32 loanOrderHash,
        address trader,
        address destTokenAddress,
        uint destTokenAmount,
        uint sourceTokenUsedAmount
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
    /// @param orderValues Array of order's loanTokenAmount, interestAmount, initialMarginAmount, maintenanceMarginAmount, lenderRelayFee, traderRelayFee, expirationUnixTimestampSec, makerRole (0=lender, 1=trader), and salt.
    /// @param collateralTokenFilled Desired address of the collateralTokenAddress the trader wants to use.
    /// @param loanTokenAmountFilled Desired amount of loanToken the trader wants to borrow.
    /// @param signature ECDSA signature in raw bytes (rsv).
    /// @return Total amount of loanToken borrowed (uint).
    /// @dev Traders can take a portion of the total coin being lended (loanTokenAmountFilled).
    /// @dev Traders also specify the token that will fill the margin requirement if they are taking the order.
    function takeLoanOrderAsTrader(
        address[6] orderAddresses,
        uint[9] orderValues,
        address collateralTokenFilled,
        uint loanTokenAmountFilled,
        bytes signature)
        external
        nonReentrant
        tracksGas
        returns (uint)
    {
        return _takeLoanOrder(
            1, // takerRole
            orderAddresses,
            orderValues,
            collateralTokenFilled,
            loanTokenAmountFilled,
            signature
        );
    }

    /// @dev Takes the order as lender
    /// @param orderAddresses Array of order's makerAddress, loanTokenAddress, interestTokenAddress collateralTokenAddress, feeRecipientAddress, oracleAddress.
    /// @param orderValues Array of order's loanTokenAmount, interestAmount, initialMarginAmount, maintenanceMarginAmount, lenderRelayFee, traderRelayFee, expirationUnixTimestampSec, makerRole (0=lender, 1=trader), and salt.
    /// @param signature ECDSA signature in raw bytes (rsv).
    /// @return Total amount of loanToken borrowed (uint).
    /// @dev Lenders have to fill the entire desired amount the trader wants to borrow.
    /// @dev This makes loanTokenAmountFilled = loanOrder.loanTokenAmount.
    function takeLoanOrderAsLender(
        address[6] orderAddresses,
        uint[9] orderValues,
        bytes signature)
        external
        nonReentrant
        tracksGas
        returns (uint)
    {
        return _takeLoanOrder(
            0, // takerRole
            orderAddresses,
            orderValues,
            orderAddresses[3], // collateralTokenFilled
            orderValues[0], // loanTokenAmountFilled
            signature
        );
    }

    function _takeLoanOrder(
        uint takerRole, // (0=lender, 1=trader)
        address[6] orderAddresses,
        uint[9] orderValues,
        address collateralTokenFilled,
        uint loanTokenAmountFilled,
        bytes signature)
        internal
        returns (uint)
    {
        address lender;
        address trader;
        if (takerRole == 1) { // trader
            lender = orderAddresses[0]; // maker
            trader = msg.sender;
        }
        else { // lender
            lender = msg.sender;
            trader = orderAddresses[0]; // maker
        }
        
        bytes32 loanOrderHash = getLoanOrderHash(orderAddresses, orderValues);
        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.maker == address(0)) {
            // no previous partial loan fill
            loanOrder = buildLoanOrderStruct(loanOrderHash, orderAddresses, orderValues);
            orders[loanOrder.loanOrderHash] = loanOrder;
            loanList[lender].push(loanOrder.loanOrderHash);
            loanList[trader].push(loanOrder.loanOrderHash);
        }
        else {
            // previous partial/complete loan fill by another trader
            loanList[trader].push(loanOrder.loanOrderHash);
        }

        if(!isValidSignature(
            loanOrder.maker,
            loanOrder.loanOrderHash,
            signature
        )) {
            //debugLog("error: invalid signiture (loanOrderHash)", loanOrder.loanOrderHash);
            return intOrRevert(0,193);
        }

        // makerRole (orderValues[7]) and takerRole must not be equal and must have a value <= 1
        if (orderValues[7] > 1 || takerRole > 1 || orderValues[7] == takerRole) {
            //debugLog("error: makerRole or takerRole is invalid for this order (loanOrderHash)", loanOrder.loanOrderHash);
            return intOrRevert(0,199);
        }

        // A trader can only fill a portion or all of a loanOrder once:
        //  - this avoids complex interest payments for parts of an order filled at different times by the same trader
        //  - this avoids potentially large loops when calculating margin reqirements and interest payments
        LoanPosition storage loanPosition = loanPositions[loanOrder.loanOrderHash][trader];
        if (loanPosition.loanTokenAmountFilled != 0) {
            //debugLog("error: loanPosition already filled for this trader (loanOrderHash)", loanOrder.loanOrderHash);
            return intOrRevert(0,208);
        }     

        uint collateralTokenAmountFilled = _fillLoanOrder(
            loanOrder,
            trader,
            lender,
            collateralTokenFilled,
            loanTokenAmountFilled
        );

        orderFilledAmounts[loanOrder.loanOrderHash] = orderFilledAmounts[loanOrder.loanOrderHash].add(loanTokenAmountFilled);

        loanPosition.lender = lender;
        loanPosition.collateralTokenAddressFilled = collateralTokenFilled;
        loanPosition.positionTokenAddressFilled = loanOrder.loanTokenAddress;
        loanPosition.loanTokenAmountFilled = loanTokenAmountFilled;
        loanPosition.collateralTokenAmountFilled = collateralTokenAmountFilled;
        loanPosition.positionTokenAmountFilled = loanTokenAmountFilled;
        loanPosition.loanStartUnixTimestampSec = block.timestamp;
        loanPosition.active = true;

        LoanPositionUpdated (
            loanPosition.lender,
            trader,
            loanPosition.collateralTokenAddressFilled,
            loanPosition.positionTokenAddressFilled,
            loanPosition.loanTokenAmountFilled,
            loanPosition.collateralTokenAmountFilled,
            loanPosition.positionTokenAmountFilled,
            loanPosition.loanStartUnixTimestampSec,
            loanPosition.active,
            loanOrder.loanOrderHash
        );

        if (collateralTokenAmountFilled > 0) {
            if(! Oracle_Interface(loanOrder.oracleAddress).didTakeOrder(
                loanOrder.loanOrderHash,
                msg.sender,
                gasUsed // initial used gas, collected in modifier
            )) {
                //debugLog("error: didTakeOrder oracle call failed! (loanOrderHash)", loanOrder.loanOrderHash);
                return intOrRevert(0,250);
            }
        }

        return loanTokenAmountFilled;
    }

    function tradeWith0x(
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
            return intOrRevert(0,268);
        }

        if (block.timestamp >= loanOrder.expirationUnixTimestampSec) {
            //debugLog("error: loan order is expired (loanOrderHash)", loanOrderHash);
            return intOrRevert(0,273);
        }

        LoanPosition storage loanPosition = loanPositions[loanOrderHash][msg.sender];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            //debugLog("error: loan not found or not active (loanOrderHash)", loanOrderHash);
            return intOrRevert(0,279);
        }

        if (Oracle_Interface(loanOrder.oracleAddress).shouldLiquidate(
                loanOrderHash,
                msg.sender,
                loanPosition.positionTokenAddressFilled,
                loanPosition.collateralTokenAddressFilled,
                loanPosition.positionTokenAmountFilled,
                loanPosition.collateralTokenAmountFilled,
                loanOrder.maintenanceMarginAmount)) {
            //debugLog("error: margin too low! (loanOrderHash)", loanOrderHash);
            return intOrRevert(0,291);
        }

        // transfer the current position token to the B0xTo0x contract
        if (!B0xVault(VAULT_CONTRACT).transferFrom(
            loanPosition.positionTokenAddressFilled,
            loanPosition.lender,
            B0XTO0X_CONTRACT,
            loanPosition.positionTokenAmountFilled)) {
            //debugLog("error: unable to transfer position token (loanOrderHash)", loanOrderHash);
            return intOrRevert(0,301);
        }

        var (tradeTokenAddress, tradeTokenAmount, positionTokenUsedAmount) = B0xTo0x_Interface(B0XTO0X_CONTRACT).take0xTrade(
            msg.sender, // trader
            VAULT_CONTRACT,
            loanOrder.oracleAddress, // the Oracle receives the tradeToken 
            loanPosition.positionTokenAmountFilled,
            orderData0x);

        /*
        orderAddresses0x[4] // feeRecipient
        orderValues0x[3] // takerFee
        orderAddresses0x[2]; // makerToken (aka tradeTokenAddress)
        orderValues0x[1], // takerTokenAmount (aka positionTokenAmount)
        orderValues0x[0] // makerTokenAmount (aka tradeTokenAmount)
        */

        if (tradeTokenAmount == 0 || positionTokenUsedAmount != loanPosition.positionTokenAmountFilled) {
            //debugLog("error: 0x trade did not fill completely or at all! (loanOrderHash)", loanOrderHash);
            return intOrRevert(0,321);
        }

        // the trade token becomes the new position token
        loanPosition.positionTokenAddressFilled = tradeTokenAddress;
        loanPosition.positionTokenAmountFilled = tradeTokenAmount;

        LogTradeOn0x(
            loanOrderHash,
            msg.sender,
            tradeTokenAddress,
            tradeTokenAmount,
            positionTokenUsedAmount
        );

        if(! Oracle_Interface(loanOrder.oracleAddress).didOpenPosition(
            loanOrderHash,
            msg.sender, // trader
            tradeTokenAddress,
            tradeTokenAmount,
            gasUsed // initial used gas, collected in modifier
        )) {
            //debugLog("error: didOpenPosition oracle call failed! (loanOrderHash)", loanOrderHash);
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

        LoanPosition memory loanPosition = loanPositions[loanOrderHash][trader];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            //debugLog("error: loan not found or not active (loanOrderHash)", loanOrderHash);
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
            loanPosition.lender,
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
        address collateralTokenFilled,
        uint depositAmount)
        external
        nonReentrant
        tracksGas
        returns (bool)
    {
        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.maker == address(0)) {
            //debugLog("depositCollateral error: invalid loan order (loanOrderHash)", loanOrderHash);
            return boolOrRevert(false,420);
        }

        if (block.timestamp >= loanOrder.expirationUnixTimestampSec) {
            //debugLog("depositCollateral error: loan order is expired (loanOrderHash)", loanOrderHash);
            return boolOrRevert(false,425);
        }

        LoanPosition storage loanPosition = loanPositions[loanOrderHash][msg.sender];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            //debugLog("depositCollateral error: loan not found or not active (loanOrderHash)", loanOrderHash);
            return boolOrRevert(false,431);
        }

        if (collateralTokenFilled != loanPosition.collateralTokenAddressFilled) {
            //debugLog("depositCollateral error: collateral token does not match this loan (loanOrderHash)", loanOrderHash);
            return boolOrRevert(false,436);
        }

        if (! B0xVault(VAULT_CONTRACT).depositCollateral(
            collateralTokenFilled,
            msg.sender,
            depositAmount
        )) {
            //debugLog("depositCollateral error: unable to transfer enough collateralToken (depositAmount, loanOrderHash)", depositAmount, loanOrder.loanOrderHash);
            return boolOrRevert(false,445);
        }

        loanPosition.collateralTokenAmountFilled = loanPosition.collateralTokenAmountFilled.add(depositAmount);

        if(! Oracle_Interface(loanOrder.oracleAddress).didDepositCollateral(
            loanOrder.loanOrderHash,
            msg.sender,
            gasUsed // initial used gas, collected in modifier
        )) {
            //debugLog("error: didDepositCollateral oracle call failed! (loanOrderHash)", loanOrder.loanOrderHash);
            return boolOrRevert(false,456);
        }

        return true;
    }

    // Allows the trader to change the collateral token being used for an open loan.
    // This function will transfer in the initial margin requirement of the new token.
    // The old token will be refunded to the trader.
    function changeCollateral(
        bytes32 loanOrderHash,
        address collateralTokenFilled)
        external
        nonReentrant
        tracksGas
        returns (bool)
    {
        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.maker == address(0)) {
            //debugLog("changeCollateral error: invalid loan order (loanOrderHash)", loanOrderHash);
            return boolOrRevert(false,476);
        }

        LoanPosition storage loanPosition = loanPositions[loanOrderHash][msg.sender];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            //debugLog("changeCollateral error: loan not found or not active (loanOrderHash)", loanOrderHash);
            return boolOrRevert(false,482);
        }

        if (collateralTokenFilled == address(0) || collateralTokenFilled == loanPosition.collateralTokenAddressFilled) {
            //debugLog("changeCollateral error: invalid collateralTokenFilled (loanOrderHash)", loanOrderHash);
            return boolOrRevert(false,487);
        }

        if (block.timestamp >= loanOrder.expirationUnixTimestampSec) {
            //debugLog("error: loan order is expired (loanOrderHash)", loanOrderHash);
            return boolOrRevert(false,492);
        }

        uint collateralTokenAmountFilled = getInitialMarginRequired(
            loanPosition.positionTokenAddressFilled,
            collateralTokenFilled,
            loanOrder.oracleAddress,
            loanPosition.positionTokenAmountFilled,
            loanOrder.initialMarginAmount
        );
        if (collateralTokenAmountFilled == 0) {
            //debugLog("changeCollateral error: loanToken to collateralToken combo not supported at this time by oracle (loanOrderHash)", loanOrderHash);
            return boolOrRevert(false,504);
        }

        // transfer the new collateral token from the trader to the vault
        if (! B0xVault(VAULT_CONTRACT).depositCollateral(
            collateralTokenFilled,
            msg.sender,
            collateralTokenAmountFilled
        )) {
            //debugLog("changeCollateral error: unable to transfer enough collateralToken to vault (collateralTokenAmountFilled, loanOrderHash)", collateralTokenAmountFilled, loanOrder.loanOrderHash);
            return boolOrRevert(false,514);
        }

        // transfer the old collateral token from the vault to the trader
        if (! B0xVault(VAULT_CONTRACT).withdrawCollateral(
            loanPosition.collateralTokenAddressFilled,
            msg.sender,
            loanPosition.collateralTokenAmountFilled
        )) {
            //debugLog("changeCollateral error: unable to transfer enough collateralToken to trader (collateralTokenAmountFilled, loanOrderHash)", loan.collateralTokenAmountFilled, loanOrder.loanOrderHash);
            return boolOrRevert(false,524);
        }

        loanPosition.collateralTokenAddressFilled = collateralTokenFilled;
        loanPosition.collateralTokenAmountFilled = collateralTokenAmountFilled;

        if(! Oracle_Interface(loanOrder.oracleAddress).didChangeCollateral(
            loanOrder.loanOrderHash,
            msg.sender,
            gasUsed // initial used gas, collected in modifier
        )) {
            //debugLog("error: didChangeCollateral oracle call failed! (loanOrderHash)", loanOrder.loanOrderHash);
            return boolOrRevert(false,536);
        }

        return true;
    }

    // TODO: Merge with closeLoan.
    function closePosition(
        bytes32 loanOrderHash)
        external
        nonReentrant
        tracksGas
        returns (bool)
    {
        LoanPosition memory loanPosition = loanPositions[loanOrderHash][msg.sender];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            //debugLog("changeCollateral error: loan not found or not active (loanOrderHash)", loanOrderHash);
            return boolOrRevert(false,553);
        }

        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.maker == address(0)) {
            //debugLog("error: invalid loan order (loanOrderHash)", loanOrderHash);
            return boolOrRevert(false,559);
        }

        return _closePosition(
            loanOrder,
            loanPosition,
            false // isLiquidation
        );
    }

    // TODO: Merge with tradeWith0x.
    function closePositionWith0x(
        bytes32 loanOrderHash,
        bytes orderData0x) // 0x order arguments and converted to hex, padded to 32 bytes, concatenated, and appended to the ECDSA
        external
        nonReentrant
        tracksGas
        returns (uint)
    {
        LoanPosition storage loanPosition = loanPositions[loanOrderHash][msg.sender];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            //debugLog("changeCollateral error: loan not found or not active (loanOrderHash)", loanOrderHash);
            return intOrRevert(0,581);
        }

        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.maker == address(0)) {
            //debugLog("error: invalid loan order (loanOrderHash)", loanOrderHash);
            return intOrRevert(0,587);
        }

        // transfer the tradeToken to the B0xTo0x contract
        if (! Oracle_Interface(loanOrder.oracleAddress).transferToken(
            loanPosition.positionTokenAddressFilled,
            B0XTO0X_CONTRACT,
            loanPosition.positionTokenAmountFilled)) {
            //debugLog("error: unable to transfer trade token (loanOrderHash)", loanOrderHash);
            return intOrRevert(0,596);
        }

        var (tradeTokenAddress, tradeTokenAmount, tradeTokenUsedAmount) = B0xTo0x_Interface(B0XTO0X_CONTRACT).take0xTrade(
            msg.sender, // trader
            loanOrder.oracleAddress,
            VAULT_CONTRACT, // the vault receives the loanToken
            loanPosition.positionTokenAmountFilled,
            orderData0x);

        if (tradeTokenAmount == 0 ||                                     // trade did not fill
            tradeTokenAmount < loanPosition.loanTokenAmountFilled ||     // trade not enough return fill loanToken amount
            tradeTokenAddress != loanOrder.loanTokenAddress)             // invalid trade
        {
            //debugLog("error: 0x trade did not fill! (loanOrderHash)", loanOrderHash);
            return intOrRevert(0,611);
        }

        // the trade token becomes the new position token
        loanPosition.positionTokenAddressFilled = tradeTokenAddress;
        loanPosition.positionTokenAmountFilled = tradeTokenAmount;

        LogTradeOn0x(
            loanOrderHash,
            msg.sender,
            tradeTokenAddress,
            tradeTokenAmount,
            tradeTokenUsedAmount
        );

        if(! Oracle_Interface(loanOrder.oracleAddress).didClosePosition(
            loanOrder.loanOrderHash,
            msg.sender,
            false, // isLiquidation
            gasUsed // initial used gas, collected in modifier
        )) {
            //debugLog("error: didClosePosition oracle call failed! (loanOrderHash)", loanOrder.loanOrderHash);
            return intOrRevert(0,633);
        }

        return tradeTokenAmount;
    }

    function liquidatePosition(
        bytes32 loanOrderHash,
        address trader)
        external
        nonReentrant
        tracksGas
        returns (bool)
    {
        // traders should call closePosition to close their own positions
        if (trader == msg.sender) {
            //debugLog("error: traders should call closePosition to close their own positions (loanOrderHash)", loanOrderHash);
            return boolOrRevert(false,650);
        }

        LoanPosition storage loanPosition = loanPositions[loanOrderHash][trader];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            //debugLog("error: loan not found or not active (loanOrderHash)", loanOrderHash);
            return boolOrRevert(false,656);
        }

        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.maker == address(0)) {
            //debugLog("error: invalid loan order (loanOrderHash)", loanOrderHash);
            return boolOrRevert(false,662);
        }

        // liqudation must succeed!
        require(_closePosition(
            loanOrder,
            loanPosition,
            true // isLiquidation
        ));
        
        return _closeLoan(
            loanOrder,
            loanPosition, // needs to be storage
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
        LoanPosition storage loanPosition = loanPositions[loanOrderHash][msg.sender];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            //debugLog("error: loan not found or not active (loanOrderHash)", loanOrderHash);
            return boolOrRevert(false,689);
        }

        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.maker == address(0)) {
            //debugLog("changeCollateral error: invalid loan order (loanOrderHash)", loanOrderHash);
            return boolOrRevert(false,695);
        }
        
        return _closeLoan(
            loanOrder,
            loanPosition, // needs to be storage
            gasUsed // initial used gas, collected in modifier
        );
    }

    function cancelLoanOrder(
        address[6] orderAddresses,
        uint[9] orderValues,
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
            return intOrRevert(0,736);
        }

        require(loanOrder.maker == msg.sender);

        return _cancelLoanOrder(loanOrder, cancelLoanTokenAmount);
    }


    /*
    * Constant public functions
    */

    function getOrders(
        address user,
        uint start,
        uint count)
        public
        view
        returns (bytes)
    {
        var end = Math.min256(loanList[user].length, start.add(count));
        if (end == 0 || start >= end) {
            return;
        }

        // size of bytes = ((addrs.length + uints.length + 1) * 32) * (end-start)
        bytes memory data = new bytes(448 * (end - start)); 

        for (uint j=0; j < end-start; j++) {
            bytes32 loanOrderHash = loanList[user][j+start];
            var (addrs,uints) = getLoanOrderParts(loanOrderHash);

            uint i;

            // handles address
            for(i = 1; i <= addrs.length; i++) {
                address tmpAddr = addrs[i-1];
                assembly {
                    mstore(add(data, mul(add(i, mul(j, 14)), 32)), tmpAddr)
                }
            }

            // handles uint
            for(i = addrs.length+1; i <= addrs.length+uints.length; i++) {
                uint tmpUint = uints[i-1-addrs.length];
                assembly {
                    mstore(add(data, mul(add(i, mul(j, 14)), 32)), tmpUint)
                }
            }

            // handles bytes32
            i = addrs.length + uints.length + 1;
            assembly {
                mstore(add(data, mul(add(i, mul(j, 14)), 32)), loanOrderHash)
            }
        }

        return data;
    }

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

        LoanPosition memory loanPosition = loanPositions[loanOrderHash][trader];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            return false;
        }

        if (block.timestamp >= loanOrder.expirationUnixTimestampSec) {
            return true; // expired loan
        }

        return Oracle_Interface(loanOrder.oracleAddress).shouldLiquidate(
            loanOrderHash,
            trader,
            loanPosition.positionTokenAddressFilled,
            loanPosition.collateralTokenAddressFilled,
            loanPosition.positionTokenAmountFilled,
            loanPosition.collateralTokenAmountFilled,
            loanOrder.maintenanceMarginAmount);
    }

    /// @dev Calculates Keccak-256 hash of order with specified parameters.
    /// @param orderAddresses Array of order's maker, loanTokenAddress, interestTokenAddress collateralTokenAddress, and feeRecipientAddress.
    /// @param orderValues Array of order's loanTokenAmount, interestAmount, initialMarginAmount, maintenanceMarginAmount, lenderRelayFee, traderRelayFee, expirationUnixTimestampSec, makerRole (0=lender, 1=trader), and salt.
    /// @return Keccak-256 hash of loanOrder.
    function getLoanOrderHash(
        address[6] orderAddresses, 
        uint[9] orderValues)
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
        LoanPosition memory loanPosition = loanPositions[loanOrder.loanOrderHash][trader];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            return;
        }
        
        uint interestTime = block.timestamp;
        if (interestTime > loanOrder.expirationUnixTimestampSec) {
            //debugLog("notice: loanOrder has expired (loanOrderHash)", loanOrder.loanOrderHash);
            interestTime = loanOrder.expirationUnixTimestampSec;
        }

        interestData = InterestData({
            lender: loanPosition.lender,
            interestTokenAddress: loanOrder.interestTokenAddress,
            totalAmountAccrued: interestTime.sub(loanPosition.loanStartUnixTimestampSec) / 86400 * loanOrder.interestAmount * loanPosition.loanTokenAmountFilled / loanOrder.loanTokenAmount,
            interestPaidSoFar: interestPaid[loanOrder.loanOrderHash][trader]
        });
    }

    /*
    * Internal functions
    */

    function _verifyLoanOrder(
        LoanOrder loanOrder,
        address collateralTokenFilled,
        uint loanTokenAmountFilled)
        internal
        returns (bool)
    {
        if (loanOrder.maker == msg.sender) {
            //debugLog("error: invalid taker (loanOrderHash)", loanOrder.loanOrderHash);
            return boolOrRevert(false,1011);
        }
        if (loanOrder.loanTokenAddress == address(0) 
            || loanOrder.interestTokenAddress == address(0)
            || collateralTokenFilled == address(0)) {
            //debugLog("error: one or more token addresses are missing from the order (loanOrderHash)", loanOrder.loanOrderHash);
            return boolOrRevert(false,1017);
        }

        if (loanTokenAmountFilled > loanOrder.loanTokenAmount) {
            //debugLog("error: loanTokenAmountFilled can't be greater than loanOrder.loanTokenAmount (loanOrderHash)", loanOrder.loanOrderHash);
            return boolOrRevert(false,1022);
        }

        if (! OracleRegistry(ORACLE_REGISTRY_CONTRACT).hasOracle(loanOrder.oracleAddress)) {
            //debugLog("error: oracle doesn't exist in OracleRegistry (loanOrderHash)", loanOrder.loanOrderHash);
            return boolOrRevert(false,1027);
        }

        if (block.timestamp >= loanOrder.expirationUnixTimestampSec) {
            //LogError(uint8(Errors.ORDER_EXPIRED), 0, loanOrder.loanOrderHash);
            //debugLog("error: loanOrder has expired (loanOrderHash)", loanOrder.loanOrderHash);
            return boolOrRevert(false,1033);
        }

        if(! (loanOrder.maintenanceMarginAmount >= 0 && loanOrder.maintenanceMarginAmount < loanOrder.initialMarginAmount && loanOrder.initialMarginAmount <= 100)) {
            //debugLog("error: valid margin parameters (loanOrderHash)", loanOrder.loanOrderHash);
            return boolOrRevert(false,1038);
        }

        uint remainingLoanTokenAmount = loanOrder.loanTokenAmount.sub(getUnavailableLoanTokenAmount(loanOrder.loanOrderHash));
        if (remainingLoanTokenAmount < loanTokenAmountFilled) {
            //debugLog("error: not enough loanToken still available in thie order (loanOrderHash)", loanOrder.loanOrderHash);
            return boolOrRevert(false,1044);
        }

        return true;
    }


    function _fillLoanOrder(
        LoanOrder loanOrder,
        address trader,
        address lender,
        address collateralTokenFilled,
        uint loanTokenAmountFilled)
        private
        returns (uint)
    {
        if (!_verifyLoanOrder(loanOrder, collateralTokenFilled, loanTokenAmountFilled)) {
            //debugLog("error: loanOrder did not pass validation! (loanOrderHash)", loanOrder.loanOrderHash);
            return intOrRevert(0,1062);
        }

        uint collateralTokenAmountFilled = getInitialMarginRequired(
            loanOrder.loanTokenAddress,
            collateralTokenFilled,
            loanOrder.oracleAddress,
            loanTokenAmountFilled,
            loanOrder.initialMarginAmount
        );
        if (collateralTokenAmountFilled == 0) {
            //debugLog("changeCollateral error: loanToken to collateralToken combo not supported at this time by oracle (loanOrderHash)", loanOrderHash);
            return intOrRevert(0,1074);
        }

        if (! B0xVault(VAULT_CONTRACT).depositCollateral(
            collateralTokenFilled,
            trader,
            collateralTokenAmountFilled
        )) {
            //debugLog("error: unable to transfer enough collateralToken (collateralTokenAmountFilled, loanOrderHash)", collateralTokenAmountFilled, loanOrder.loanOrderHash);
            return intOrRevert(loanTokenAmountFilled,1083);
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
            return intOrRevert(loanTokenAmountFilled,1095);
        }

        if (! B0xVault(VAULT_CONTRACT).depositFunding(
            loanOrder.loanTokenAddress,
            lender,
            loanTokenAmountFilled
        )) {
            //debugLog("error: unable to transfer enough loanToken (loanTokenAmountFilled, loanOrderHash)", loanTokenAmountFilled, loanOrder.loanOrderHash);
            return intOrRevert(loanTokenAmountFilled,1104);
        }

        if (loanOrder.feeRecipientAddress != address(0)) {
            if (loanOrder.traderRelayFee > 0) {
                uint paidTraderFee = getPartialAmountNoError(loanTokenAmountFilled, loanOrder.loanTokenAmount, loanOrder.traderRelayFee);
                
                if (! B0xVault(VAULT_CONTRACT).transferFrom(
                    B0X_TOKEN_CONTRACT, 
                    trader,
                    loanOrder.feeRecipientAddress,
                    paidTraderFee
                )) {
                    //debugLog("error: unable to pay traderRelayFee (loanOrderHash)", loanOrder.loanOrderHash);
                    return intOrRevert(loanTokenAmountFilled,1118);
                }
            }
            if (loanOrder.lenderRelayFee > 0) {
                uint paidLenderFee = getPartialAmountNoError(loanTokenAmountFilled, loanOrder.loanTokenAmount, loanOrder.lenderRelayFee);
                
                if (! B0xVault(VAULT_CONTRACT).transferFrom(
                    B0X_TOKEN_CONTRACT, 
                    lender,
                    loanOrder.feeRecipientAddress,
                    paidLenderFee
                )) {
                    //debugLog("error: unable to pay lenderRelayFee (loanOrderHash)", loanOrder.loanOrderHash);
                    return intOrRevert(0,1131);
                }
            }
        }

        return collateralTokenAmountFilled;
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
        LoanPosition storage loanPosition,
        uint gasUsed)
        internal
        returns (bool)
    {
        _cancelLoanOrder(loanOrder, MAX_UINT);

        loanPosition.active = false;

        if(! Oracle_Interface(loanOrder.oracleAddress).didCloseLoan(
            loanOrder.loanOrderHash,
            gasUsed
        )) {
            //debugLog("error: didCloseLoan oracle call failed! (loanOrderHash)", loanOrder.loanOrderHash);
            return boolOrRevert(false,1183);
        }

        return true;
    }

    function _closePosition(
        LoanOrder loanOrder,
        LoanPosition memory loanPosition,
        bool isLiquidation)
        internal
        returns (bool)
    {
        uint loanTokenAmountReceived;
        if (isLiquidation) {
            loanTokenAmountReceived = Oracle_Interface(loanOrder.oracleAddress).verifyAndDoTrade(
                loanPosition.positionTokenAddressFilled,
                loanOrder.loanTokenAddress,
                loanPosition.collateralTokenAddressFilled,
                loanPosition.positionTokenAmountFilled,
                loanPosition.collateralTokenAmountFilled, // loan already confirmed to be open, since position is open
                loanOrder.maintenanceMarginAmount);
        }
        else {
            loanTokenAmountReceived = Oracle_Interface(loanOrder.oracleAddress).doTrade(
                loanPosition.positionTokenAddressFilled,
                loanOrder.loanTokenAddress,
                loanPosition.positionTokenAmountFilled);
        }

        // TODO: Checks to make sure all of the tradeToken was sold

        if (loanTokenAmountReceived == 0) {
            //debugLog("error: trade failed in the Oracle! (loanOrderHash)", loanOrder.loanOrderHash);
            return boolOrRevert(false,1217);
        }

        if(! Oracle_Interface(loanOrder.oracleAddress).didClosePosition(
            loanOrder.loanOrderHash,
            msg.sender,
            isLiquidation,
            gasUsed // initial used gas, collected in modifier
        )) {
            //debugLog("error: didClosePosition oracle call failed! (loanOrderHash)", loanOrder.loanOrderHash);
            return boolOrRevert(false,1227);
        }

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

        LoanPosition memory loanPosition = loanPositions[loanOrderHash][trader];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            return 0;
        }

        marginRatio = Oracle_Interface(loanOrder.oracleAddress).getMarginRatio(
            loanPosition.positionTokenAddressFilled,
            loanPosition.collateralTokenAddressFilled,
            loanPosition.positionTokenAmountFilled,
            loanPosition.collateralTokenAmountFilled,
            loanOrder.maintenanceMarginAmount);
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
            exposureToCollateralRate,
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

    function setDebugMode (
        bool _debug)
        public
        onlyOwner
    {
        if (DEBUG_MODE != _debug)
            DEBUG_MODE = _debug;
    }

    function setB0xToken (
        address _token)
        public
        onlyOwner
    {
        if (_token != address(0))
            B0X_TOKEN_CONTRACT = _token;
    }

    function setVault (
        address _vault)
        public
        onlyOwner
    {
        if (_vault != address(0))
            VAULT_CONTRACT = _vault;
    }

    function setOracleRegistry (
        address _registry)
        public
        onlyOwner
    {
        if (_registry != address(0))
            ORACLE_REGISTRY_CONTRACT = _registry;
    }

    function set0xExchangeWrapper (
        address _wrapper)
        public
        onlyOwner
    {
        if (_wrapper != address(0))
            B0XTO0X_CONTRACT = _wrapper;
    }


    function upgradeContract (
        address newContract)
        public
        onlyOwner
    {
        require(newContract != address(0) && newContract != address(this));
        upgrade(newContract);
        B0xVault(VAULT_CONTRACT).transferOwnership(newContract);
    }


    /*
     * Unused Functions (remove later)
     */

    /*function getLoanOrderByteData (
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
    */
    function getLoanOrderParts (
        bytes32 loanOrderHash)
        public
        view
        returns (address[6],uint[7])
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
                loanOrder.expirationUnixTimestampSec
            ]
        );
    }
    /*
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
        returns (address,uint[3],bool)
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
                loan.filledUnixTimestampSec
            ],
            loan.active
        );
    }

    function getPositionByteData (
        bytes32 loanOrderHash,
        address trader)
        public
        view
        returns (bytes)
    {
        var (tradeTokenAddress,uints,active) = getPositionParts(loanOrderHash, trader);
        if (tradeTokenAddress == address(0)) {
            return;
        }

        return getPositionBytes(tradeTokenAddress, uints, active);
    }
    function getPositionParts (
        bytes32 loanOrderHash,
        address trader)
        public
        view
        returns (address,uint[3],bool)
    {
        Position memory position = positions[loanOrderHash][trader];
        if (position.tradeTokenAmount == 0) {
            return;
        }

        return (
            position.tradeTokenAddress,
            [
                position.tradeTokenAmount,
                position.loanTokenUsedAmount,
                position.filledUnixTimestampSec
            ],
            position.active
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
            loan.collateralTokenFilled,
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

        LogLoanOrPosition(
            loan.lender,
            loan.collateralTokenAmountFilled,
            loan.loanTokenAmountFilled,
            loan.filledUnixTimestampSec,
            loan.active
        );
    }
    function getPositionLog(
        bytes tradeData)
        public
    {
        Position memory position = getPositionFromBytes(tradeData);

        LogLoanOrPosition(
            position.tradeTokenAddress,
            position.tradeTokenAmount,
            position.loanTokenUsedAmount,
            position.filledUnixTimestampSec,
            position.active
        );
    }*/
}

