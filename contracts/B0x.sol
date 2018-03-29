
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
    mapping (address => Counterparty[]) public loanList; // mapping of lenders and trader addresses to array of loan Counterparty structs

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

    event LogPositionTraded(
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
            orderAddresses,
            orderValues,
            collateralTokenFilled,
            loanTokenAmountFilled,
            signature,
            1 // takerRole
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
            orderAddresses,
            orderValues,
            orderAddresses[3], // collateralTokenFilled
            orderValues[0], // loanTokenAmountFilled
            signature,
            0 // takerRole
        );
    }

    function _takeLoanOrder(
        address[6] orderAddresses,
        uint[9] orderValues,
        address collateralTokenFilled,
        uint loanTokenAmountFilled,
        bytes signature,
        uint takerRole) // (0=lender, 1=trader)
        internal
        returns (uint)
    {
        address lender;
        address trader;
        if (takerRole == 1) { // trader
            lender = orderAddresses[0]; // maker
            trader = msg.sender;
        } else { // lender
            lender = msg.sender;
            trader = orderAddresses[0]; // maker
        }
        
        bytes32 loanOrderHash = getLoanOrderHash(orderAddresses, orderValues);
        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.maker == address(0)) {
            // no previous partial loan fill
            loanOrder = buildLoanOrderStruct(loanOrderHash, orderAddresses, orderValues);
            orders[loanOrder.loanOrderHash] = loanOrder;
            loanList[lender].push(Counterparty({
                counterparty: trader,
                loanOrderHash: loanOrder.loanOrderHash
            }));
            loanList[trader].push(Counterparty({
                counterparty: lender,
                loanOrderHash: loanOrder.loanOrderHash
            }));
        } else {
            // previous partial/complete loan fill by another trader
            loanList[trader].push(Counterparty({
                counterparty: lender,
                loanOrderHash: loanOrder.loanOrderHash
            }));
        }

        if (!isValidSignature(
            loanOrder.maker,
            loanOrder.loanOrderHash,
            signature
        )) {
            return intOrRevert(0,199);
        }

        // makerRole (orderValues[7]) and takerRole must not be equal and must have a value <= 1
        if (orderValues[7] > 1 || takerRole > 1 || orderValues[7] == takerRole) {
            return intOrRevert(0,204);
        }

        // A trader can only fill a portion or all of a loanOrder once:
        //  - this avoids complex interest payments for parts of an order filled at different times by the same trader
        //  - this avoids potentially large loops when calculating margin reqirements and interest payments
        LoanPosition storage loanPosition = loanPositions[loanOrder.loanOrderHash][trader];
        if (loanPosition.loanTokenAmountFilled != 0) {
            return intOrRevert(0,212);
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
        loanPosition.trader = trader;
        loanPosition.collateralTokenAddressFilled = collateralTokenFilled;
        loanPosition.positionTokenAddressFilled = loanOrder.loanTokenAddress;
        loanPosition.loanTokenAmountFilled = loanTokenAmountFilled;
        loanPosition.collateralTokenAmountFilled = collateralTokenAmountFilled;
        loanPosition.positionTokenAmountFilled = loanTokenAmountFilled;
        loanPosition.loanStartUnixTimestampSec = block.timestamp;
        loanPosition.active = true;

        LoanPositionUpdated (
            loanPosition.lender,
            loanPosition.trader,
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
            if (! Oracle_Interface(loanOrder.oracleAddress).didTakeOrder(
                loanOrder.loanOrderHash,
                msg.sender,
                gasUsed // initial used gas, collected in modifier
            )) {
                return intOrRevert(0,254);
            }
        }

        return loanTokenAmountFilled;
    }

    function tradePositionWith0x(
        bytes32 loanOrderHash,
        bytes orderData0x) // 0x order arguments and converted to hex, padded to 32 bytes, concatenated, and appended to the ECDSA
        external
        nonReentrant
        tracksGas
        returns (uint)
    {
        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.maker == address(0)) {
            return intOrRevert(0,271);
        }

        if (block.timestamp >= loanOrder.expirationUnixTimestampSec) {
            return intOrRevert(0,275);
        }

        LoanPosition storage loanPosition = loanPositions[loanOrderHash][msg.sender];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            return intOrRevert(0,280);
        }

        // transfer the current position token to the B0xTo0x contract
        if (!B0xVault(VAULT_CONTRACT).transferToken(
            loanPosition.positionTokenAddressFilled,
            B0XTO0X_CONTRACT,
            loanPosition.positionTokenAmountFilled)) {
            return intOrRevert(0,299);
        }

        var (tradeTokenAddress, tradeTokenAmount, positionTokenUsedAmount) = B0xTo0x_Interface(B0XTO0X_CONTRACT).take0xTrade(
            msg.sender, // trader
            VAULT_CONTRACT,
            loanPosition.positionTokenAmountFilled,
            orderData0x);


        if (tradeTokenAmount == 0 || positionTokenUsedAmount != loanPosition.positionTokenAmountFilled) {
            return intOrRevert(0,317);
        }

        // trade token has to equal loan token if loan needs to be liquidated
        if (tradeTokenAddress != loanOrder.loanTokenAddress && Oracle_Interface(loanOrder.oracleAddress).shouldLiquidate(
                loanOrderHash,
                msg.sender,
                loanPosition.positionTokenAddressFilled,
                loanPosition.collateralTokenAddressFilled,
                loanPosition.positionTokenAmountFilled,
                loanPosition.collateralTokenAmountFilled,
                loanOrder.maintenanceMarginAmount)) {
            return intOrRevert(0,291);
        }

        // the trade token becomes the new position token
        loanPosition.positionTokenAddressFilled = tradeTokenAddress;
        loanPosition.positionTokenAmountFilled = tradeTokenAmount;

        LogPositionTraded(
            loanOrderHash,
            msg.sender,
            tradeTokenAddress,
            tradeTokenAmount,
            positionTokenUsedAmount
        );

        if (! Oracle_Interface(loanOrder.oracleAddress).didTradePosition(
            loanOrderHash,
            msg.sender, // trader
            tradeTokenAddress,
            tradeTokenAmount,
            gasUsed // initial used gas, collected in modifier
        )) {
            return intOrRevert(0,339);
        }

        return tradeTokenAmount;
    }

    function tradePositionWithOracle(
        bytes32 loanOrderHash,
        address tradeTokenAddress)
        external
        nonReentrant
        tracksGas
        returns (uint)
    {
        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.maker == address(0)) {
            return intOrRevert(0,355);
        }

        if (block.timestamp >= loanOrder.expirationUnixTimestampSec) {
            return intOrRevert(0,359);
        }

        LoanPosition storage loanPosition = loanPositions[loanOrderHash][msg.sender];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            return intOrRevert(0,364);
        }

        if (tradeTokenAddress == loanPosition.positionTokenAddressFilled) {
            return intOrRevert(0,368);
        }

        // trade token has to equal loan token if loan needs to be liquidated
        if (tradeTokenAddress != loanOrder.loanTokenAddress && Oracle_Interface(loanOrder.oracleAddress).shouldLiquidate(
                loanOrderHash,
                msg.sender,
                loanPosition.positionTokenAddressFilled,
                loanPosition.collateralTokenAddressFilled,
                loanPosition.positionTokenAmountFilled,
                loanPosition.collateralTokenAmountFilled,
                loanOrder.maintenanceMarginAmount)) {
            return intOrRevert(0,291);
        }

        uint tradeTokenAmount = _tradePositionWithOracle(
            loanOrder,
            loanPosition,
            tradeTokenAddress,
            false // isLiquidation
        );

        if (tradeTokenAmount == 0) {
            return intOrRevert(0,390);
        }

        LogPositionTraded(
            loanOrderHash,
            msg.sender,
            tradeTokenAddress,
            tradeTokenAmount,
            loanPosition.positionTokenAmountFilled
        );

        // the trade token becomes the new position token
        loanPosition.positionTokenAddressFilled = tradeTokenAddress;
        loanPosition.positionTokenAmountFilled = tradeTokenAmount;

        if (! Oracle_Interface(loanOrder.oracleAddress).didTradePosition(
            loanOrderHash,
            msg.sender, // trader
            tradeTokenAddress,
            tradeTokenAmount,
            gasUsed // initial used gas, collected in modifier
        )) {
            return intOrRevert(0,412);
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
            return intOrRevert(0,428);
        }

        // can still pay any unpaid accured interest after a loan has closed
        LoanPosition memory loanPosition = loanPositions[loanOrderHash][trader];
        if (loanPosition.loanTokenAmountFilled == 0) {
            return intOrRevert(0,434);
        }
        
        uint amountPaid = _payInterest(
            loanOrder,
            loanPosition
        );

        return amountPaid;
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
            return boolOrRevert(false,457);
        }

        if (block.timestamp >= loanOrder.expirationUnixTimestampSec) {
            return boolOrRevert(false,461);
        }

        LoanPosition storage loanPosition = loanPositions[loanOrderHash][msg.sender];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            return boolOrRevert(false,466);
        }

        if (collateralTokenFilled != loanPosition.collateralTokenAddressFilled) {
            return boolOrRevert(false,470);
        }

        if (! B0xVault(VAULT_CONTRACT).depositCollateral(
            collateralTokenFilled,
            msg.sender,
            depositAmount
        )) {
            return boolOrRevert(false,478);
        }

        loanPosition.collateralTokenAmountFilled = loanPosition.collateralTokenAmountFilled.add(depositAmount);

        if (! Oracle_Interface(loanOrder.oracleAddress).didDepositCollateral(
            loanOrder.loanOrderHash,
            msg.sender,
            gasUsed // initial used gas, collected in modifier
        )) {
            return boolOrRevert(false,488);
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
            return boolOrRevert(false,507);
        }

        LoanPosition storage loanPosition = loanPositions[loanOrderHash][msg.sender];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            return boolOrRevert(false,512);
        }

        if (collateralTokenFilled == address(0) || collateralTokenFilled == loanPosition.collateralTokenAddressFilled) {
            return boolOrRevert(false,516);
        }

        if (block.timestamp >= loanOrder.expirationUnixTimestampSec) {
            return boolOrRevert(false,520);
        }

        uint collateralTokenAmountFilled = getInitialMarginRequired(
            loanPosition.positionTokenAddressFilled,
            collateralTokenFilled,
            loanOrder.oracleAddress,
            loanPosition.positionTokenAmountFilled,
            loanOrder.initialMarginAmount
        );
        if (collateralTokenAmountFilled == 0) {
            return boolOrRevert(false,531);
        }

        // transfer the new collateral token from the trader to the vault
        if (! B0xVault(VAULT_CONTRACT).depositCollateral(
            collateralTokenFilled,
            msg.sender,
            collateralTokenAmountFilled
        )) {
            return boolOrRevert(false,540);
        }

        // transfer the old collateral token from the vault to the trader
        if (! B0xVault(VAULT_CONTRACT).withdrawCollateral(
            loanPosition.collateralTokenAddressFilled,
            msg.sender,
            loanPosition.collateralTokenAmountFilled
        )) {
            return boolOrRevert(false,549);
        }

        loanPosition.collateralTokenAddressFilled = collateralTokenFilled;
        loanPosition.collateralTokenAmountFilled = collateralTokenAmountFilled;

        if (! Oracle_Interface(loanOrder.oracleAddress).didChangeCollateral(
            loanOrder.loanOrderHash,
            msg.sender,
            gasUsed // initial used gas, collected in modifier
        )) {
            return boolOrRevert(false,560);
        }

        return true;
    }

    function liquidatePosition(
        bytes32 loanOrderHash,
        address trader)
        external
        nonReentrant
        tracksGas
        returns (bool)
    {
        // traders should call closeLoan rather than this function
        if (trader == msg.sender) {
            return boolOrRevert(false,576);
        }

        LoanPosition storage loanPosition = loanPositions[loanOrderHash][trader];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            return boolOrRevert(false,581);
        }

        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.maker == address(0)) {
            return boolOrRevert(false,586);
        }

        // if the position token is not the loan token, then we need to buy back the loan token (if liquidation checks pass),
        // prior to closing the loan
        if (loanPosition.positionTokenAddressFilled != loanOrder.loanTokenAddress) {
            uint loanTokenAmount = _tradePositionWithOracle(
                loanOrder,
                loanPosition,
                loanOrder.loanTokenAddress, // tradeTokenAddress
                true // isLiquidation
            );

            if (loanTokenAmount == 0) {
                return boolOrRevert(false,600);
            }

            // the loan token becomes the new position token
            loanPosition.positionTokenAddressFilled = loanOrder.loanTokenAddress;
            loanPosition.positionTokenAmountFilled = loanTokenAmount;
        } else {
            // verify liquidation checks before proceeding to close the loan
            if (! Oracle_Interface(loanOrder.oracleAddress).shouldLiquidate(
                    loanOrderHash,
                    trader,
                    loanPosition.positionTokenAddressFilled,
                    loanPosition.collateralTokenAddressFilled,
                    loanPosition.positionTokenAmountFilled,
                    loanPosition.collateralTokenAmountFilled,
                    loanOrder.maintenanceMarginAmount)) {
                return boolOrRevert(false,616);
            }
        }

        require(_closeLoan(
            loanOrder,
            loanPosition, // needs to be storage
            true, // isLiquidation
            gasUsed // initial used gas, collected in modifier
        ));

        return true;
    }

    // Called by the trader to close their loan early.
    // This function will fail if the position token is not currently the loan token.
    // tradePositionWith0x or tradePositionWithOracle should be called first to buy back the loan token if needed
    function closeLoan(
        bytes32 loanOrderHash)
        external
        nonReentrant
        tracksGas
        returns (bool)
    {
        LoanPosition storage loanPosition = loanPositions[loanOrderHash][msg.sender];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            return boolOrRevert(false,642);
        }

        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.maker == address(0)) {
            return boolOrRevert(false,647);
        }

        if (loanPosition.positionTokenAddressFilled != loanOrder.loanTokenAddress) {
            return boolOrRevert(false,651);
        }

        return _closeLoan(
            loanOrder,
            loanPosition, // needs to be storage
            false, // isLiquidation
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
            return intOrRevert(0,692);
        }

        require(loanOrder.maker == msg.sender);

        return _cancelLoanOrder(loanOrder, cancelLoanTokenAmount);
    }


    /*
    * Constant public functions
    */

    function getOrders(
        address loanParty,
        uint start,
        uint count)
        public
        view
        returns (bytes)
    {
        var end = Math.min256(loanList[loanParty].length, start.add(count));
        if (end == 0 || start >= end) {
            return;
        }

        // size of bytes = ((addrs.length(6) + uints.length(7) + 1) * 32) * (end-start)
        bytes memory data = new bytes(448 * (end - start)); 

        for (uint j=0; j < end-start; j++) {
            bytes32 loanOrderHash = loanList[loanParty][j+start].loanOrderHash;
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

    function getLoanPositions(
        address loanParty,
        uint start,
        uint count)
        public
        view
        returns (bytes)
    {
        var end = Math.min256(loanList[loanParty].length, start.add(count));
        if (end == 0 || start >= end) {
            return;
        }

        // size of bytes = ((addrs.length(4) + uints.length(5)) * 32) * (end-start)
        bytes memory data = new bytes(288 * (end - start)); 

        for (uint j=0; j < end-start; j++) {
            bytes32 loanOrderHash = loanList[loanParty][j+start].loanOrderHash;
            if (loanPositions[loanOrderHash][loanParty].loanTokenAmountFilled == 0) {
                // loanParty is lender, so it needs to be set to the trader counterparty to retrieve the loan details
                loanParty = loanList[loanParty][j+start].counterparty; // loanParty is now the trader
            }
            var (addrs,uints) = getLoanPositionParts(loanOrderHash,loanParty);

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

    function getInitialMarginRequired(
        address positionTokenAddress,
        address collateralTokenAddress,
        address oracleAddress,
        uint positionTokenAmount,
        uint initialMarginAmount)
        public
        view
        returns (uint collateralTokenAmount)
    {
        uint positionToCollateralRate = Oracle_Interface(oracleAddress).getTradeRate(
            positionTokenAddress,
            collateralTokenAddress
        );
        if (positionToCollateralRate == 0) {
            return 0;
        }
        
        collateralTokenAmount = positionTokenAmount
                                    .mul(positionToCollateralRate)
                                    .div(10**20)
                                    .mul(initialMarginAmount);
    }

    // returns currentMarginAmount, initialMarginAmount, maintenanceMarginAmount
    function getMargin(
        bytes32 loanOrderHash,
        address trader)
        public
        view
        returns (uint, uint, uint)
    {
        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.maker == address(0)) {
            return;
        }

        LoanPosition memory loanPosition = loanPositions[loanOrderHash][trader];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            return;
        }

        return (Oracle_Interface(loanOrder.oracleAddress).getCurrentMargin(
            loanPosition.positionTokenAddressFilled,
            loanPosition.collateralTokenAddressFilled,
            loanPosition.positionTokenAmountFilled,
            loanPosition.collateralTokenAmountFilled),
            loanOrder.initialMarginAmount,
            loanOrder.maintenanceMarginAmount);
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

        // can still get interest for closed loans
        LoanPosition memory loanPosition = loanPositions[loanOrderHash][trader];
        if (loanPosition.loanTokenAmountFilled == 0) {
            return;
        }

        InterestData memory interestData = _getInterest(
            loanOrder,
            loanPosition
        );
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

    function _getInterest(
        LoanOrder loanOrder,
        LoanPosition loanPosition)
        internal
        view
        returns (InterestData interestData)
    {
        uint interestTime = block.timestamp;
        if (interestTime > loanOrder.expirationUnixTimestampSec) {
            interestTime = loanOrder.expirationUnixTimestampSec;
        }

        interestData = InterestData({
            lender: loanPosition.lender,
            interestTokenAddress: loanOrder.interestTokenAddress,
            //totalAmountAccrued: interestTime.sub(loanPosition.loanStartUnixTimestampSec).div(86400).mul(loanOrder.interestAmount).mul(loanPosition.loanTokenAmountFilled).div(loanOrder.loanTokenAmount),
            totalAmountAccrued: getPartialAmountNoError(loanPosition.loanTokenAmountFilled, loanOrder.loanTokenAmount, interestTime.sub(loanPosition.loanStartUnixTimestampSec).div(86400).mul(loanOrder.interestAmount)),
            interestPaidSoFar: interestPaid[loanOrder.loanOrderHash][loanPosition.trader]
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
            return boolOrRevert(false,1076);
        }
        if (loanOrder.loanTokenAddress == address(0) 
            || loanOrder.interestTokenAddress == address(0)
            || collateralTokenFilled == address(0)) {
            return boolOrRevert(false,1081);
        }

        if (loanTokenAmountFilled > loanOrder.loanTokenAmount) {
            return boolOrRevert(false,1085);
        }

        if (! OracleRegistry(ORACLE_REGISTRY_CONTRACT).hasOracle(loanOrder.oracleAddress)) {
            return boolOrRevert(false,1089);
        }

        if (block.timestamp >= loanOrder.expirationUnixTimestampSec) {
            //LogError(uint8(Errors.ORDER_EXPIRED), 0, loanOrder.loanOrderHash);
            return boolOrRevert(false,1094);
        }

        if (loanOrder.maintenanceMarginAmount == 0 || loanOrder.maintenanceMarginAmount >= loanOrder.initialMarginAmount) {
            return boolOrRevert(false,1098);
        }

        uint remainingLoanTokenAmount = loanOrder.loanTokenAmount.sub(getUnavailableLoanTokenAmount(loanOrder.loanOrderHash));
        if (remainingLoanTokenAmount < loanTokenAmountFilled) {
            return boolOrRevert(false,1103);
        }

        return true;
    }


    function _fillLoanOrder(
        LoanOrder loanOrder,
        address trader,
        address lender,
        address collateralTokenFilled,
        uint loanTokenAmountFilled)
        internal
        returns (uint)
    {
        if (!_verifyLoanOrder(loanOrder, collateralTokenFilled, loanTokenAmountFilled)) {
            return intOrRevert(0,1120);
        }

        uint collateralTokenAmountFilled = getInitialMarginRequired(
            loanOrder.loanTokenAddress,
            collateralTokenFilled,
            loanOrder.oracleAddress,
            loanTokenAmountFilled,
            loanOrder.initialMarginAmount
        );
        if (collateralTokenAmountFilled == 0) {
            return intOrRevert(0,1131);
        }

        if (! B0xVault(VAULT_CONTRACT).depositCollateral(
            collateralTokenFilled,
            trader,
            collateralTokenAmountFilled
        )) {
            return intOrRevert(loanTokenAmountFilled,1139);
        }

        // total interest required if loan is kept until order expiration
        // unused interest at the end of a loan is refunded to the trader
        uint totalInterestRequired = getTotalInterestRequired(
            loanOrder,
            loanTokenAmountFilled,
            block.timestamp);
        if (! B0xVault(VAULT_CONTRACT).depositInterest(
            loanOrder.interestTokenAddress,
            trader,
            totalInterestRequired
        )) {
            return intOrRevert(loanTokenAmountFilled,1153);
        }

        if (! B0xVault(VAULT_CONTRACT).depositFunding(
            loanOrder.loanTokenAddress,
            lender,
            loanTokenAmountFilled
        )) {
            return intOrRevert(loanTokenAmountFilled,1161);
        }

        if (loanOrder.feeRecipientAddress != address(0)) {
            if (loanOrder.traderRelayFee > 0) {
                uint paidTraderFee = getPartialAmountNoError(loanTokenAmountFilled, loanOrder.loanTokenAmount, loanOrder.traderRelayFee);
                
                if (! B0xVault(VAULT_CONTRACT).transferTokenFrom(
                    B0X_TOKEN_CONTRACT, 
                    trader,
                    loanOrder.feeRecipientAddress,
                    paidTraderFee
                )) {
                    return intOrRevert(loanTokenAmountFilled,1174);
                }
            }
            if (loanOrder.lenderRelayFee > 0) {
                uint paidLenderFee = getPartialAmountNoError(loanTokenAmountFilled, loanOrder.loanTokenAmount, loanOrder.lenderRelayFee);
                
                if (! B0xVault(VAULT_CONTRACT).transferTokenFrom(
                    B0X_TOKEN_CONTRACT, 
                    lender,
                    loanOrder.feeRecipientAddress,
                    paidLenderFee
                )) {
                    return intOrRevert(0,1186);
                }
            }
        }

        return collateralTokenAmountFilled;
    }

    function _payInterest(
        LoanOrder loanOrder,
        LoanPosition loanPosition)
        internal
        returns (uint)
    {
        InterestData memory interestData = _getInterest(
            loanOrder,
            loanPosition);

        if (interestData.interestPaidSoFar >= interestData.totalAmountAccrued) {
            return 0;
        }

        uint amountPaid = interestData.totalAmountAccrued.sub(interestData.interestPaidSoFar);
        interestPaid[loanOrder.loanOrderHash][loanPosition.trader] = interestData.totalAmountAccrued; // since this function will pay all remaining accured interest
        
        // send the interest to the oracle for further processing
        if (! B0xVault(VAULT_CONTRACT).sendInterestToOracle(
            interestData.interestTokenAddress,
            loanPosition.trader,
            orders[loanOrder.loanOrderHash].oracleAddress,
            amountPaid
        )) {
            return intOrRevert(0,1218);
        }

         // calls the oracle to signal processing of the interest (ie: paying the lender, retaining fees)
        if (! Oracle_Interface(loanOrder.oracleAddress).didPayInterest(
            loanOrder.loanOrderHash,
            loanPosition.trader,
            loanPosition.lender,
            interestData.interestTokenAddress,
            amountPaid,
            gasUsed // initial used gas, collected in modifier
        )) {
            return intOrRevert(0,1230);
        }

        return amountPaid;
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

    // NOTE: this function will only be called if loanPosition.positionTokenAddressFilled == loanOrder.loanTokenAddress
    function _closeLoan(
        LoanOrder loanOrder,
        LoanPosition storage loanPosition,
        bool isLiquidation,
        uint gasUsed)
        internal
        returns (bool)
    {
        loanPosition.active = false;

        // pay any remaining interest to the lender
        _payInterest(
            loanOrder,
            loanPosition
        );

        // refund remaining interest to the trader
        InterestData memory interestData = _getInterest(
            loanOrder,
            loanPosition);
        
        uint totalInterestToRefund = getTotalInterestRequired(
            loanOrder,
            loanPosition.loanTokenAmountFilled,
            loanPosition.loanStartUnixTimestampSec)
            .sub(interestData.interestPaidSoFar);
        
        if (totalInterestToRefund > 0) {
            if (! B0xVault(VAULT_CONTRACT).withdrawInterest(
                interestData.interestTokenAddress,
                loanPosition.trader,
                totalInterestToRefund
            )) {
                return boolOrRevert(false,1297);
            }
        }

        // check if lender is being made whole, and if not attempt to sell collateral token to cover losses
        if (loanPosition.positionTokenAmountFilled < loanOrder.loanTokenAmount) {
            // Send all of the collateral token to the oracle to sell to cover loan token losses.
            // Unused collateral should be returned to the vault by the oracle.
            if (! B0xVault(VAULT_CONTRACT).transferToken(
                loanPosition.collateralTokenAddressFilled,
                loanOrder.oracleAddress,
                loanPosition.collateralTokenAmountFilled
            )) {
                return boolOrRevert(false,1315);
            }

            var (loanTokenAmountCovered, collateralTokenAmountUsed) = Oracle_Interface(loanOrder.oracleAddress).doTradeofCollateral(
                loanPosition.collateralTokenAddressFilled,
                loanOrder.loanTokenAddress,
                loanPosition.collateralTokenAmountFilled,
                loanOrder.loanTokenAmount.sub(loanPosition.positionTokenAmountFilled));
            
            loanPosition.positionTokenAmountFilled = loanPosition.positionTokenAmountFilled.add(loanTokenAmountCovered);
            loanPosition.collateralTokenAmountFilled = loanPosition.collateralTokenAmountFilled.sub(collateralTokenAmountUsed);
        }

        if (! B0xVault(VAULT_CONTRACT).withdrawCollateral(
            loanPosition.collateralTokenAddressFilled,
            loanPosition.trader,
            loanPosition.collateralTokenAmountFilled
        )) {
            return boolOrRevert(false,1334);
        }

        if (! B0xVault(VAULT_CONTRACT).withdrawFunding(
            loanPosition.positionTokenAddressFilled, // same as loanTokenAddress
            loanPosition.lender,
            loanPosition.positionTokenAmountFilled
        )) {
            return boolOrRevert(false,1342);
        }

        if (! Oracle_Interface(loanOrder.oracleAddress).didCloseLoan(
            loanOrder.loanOrderHash,
            msg.sender,
            isLiquidation,
            gasUsed
        )) {
            return boolOrRevert(false,1351);
        }

        return true;
    }

    // Note: The oracle has to fill all the source token, or the trade should fail
    function _tradePositionWithOracle(
        LoanOrder loanOrder,
        LoanPosition memory loanPosition,
        address tradeTokenAddress,
        bool isLiquidation)
        internal
        returns (uint)
    {
        // transfer the current position token to the Oracle contract
        if (!B0xVault(VAULT_CONTRACT).transferToken(
            loanPosition.positionTokenAddressFilled,
            loanOrder.oracleAddress,
            loanPosition.positionTokenAmountFilled)) {
            return intOrRevert(0,1371);
        }

        uint tradeTokenAmountReceived;
        if (isLiquidation) {
            tradeTokenAmountReceived = Oracle_Interface(loanOrder.oracleAddress).verifyAndDoTrade(
                loanPosition.positionTokenAddressFilled,
                tradeTokenAddress,
                loanPosition.collateralTokenAddressFilled,
                loanPosition.positionTokenAmountFilled,
                loanPosition.collateralTokenAmountFilled,
                loanOrder.maintenanceMarginAmount);
        } else {
            tradeTokenAmountReceived = Oracle_Interface(loanOrder.oracleAddress).doTrade(
                loanPosition.positionTokenAddressFilled,
                tradeTokenAddress,
                loanPosition.positionTokenAmountFilled);
        }

        return tradeTokenAmountReceived;
    }

    function getTotalInterestRequired(
        LoanOrder loanOrder,
        uint loanTokenAmountFilled,
        uint loanStartUnixTimestampSec)
        internal
        pure
        returns (uint totalInterestRequired)
    {
        totalInterestRequired = getPartialAmountNoError(loanTokenAmountFilled, loanOrder.loanTokenAmount, (loanOrder.expirationUnixTimestampSec.sub(loanStartUnixTimestampSec) / 86400).mul(loanOrder.interestAmount));
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
    */
    function getLoanPositionParts (
        bytes32 loanOrderHash,
        address trader)
        public
        view
        returns (address[4],uint[5])
    {
        LoanPosition memory loanPosition = loanPositions[loanOrderHash][trader];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            return;
        }

        uint active = 1;
        if (!loanPosition.active) {
            active = 0;
        }
        return (
            [
                loanPosition.lender,
                loanPosition.trader,
                loanPosition.collateralTokenAddressFilled,
                loanPosition.positionTokenAddressFilled
            ],
            [
                loanPosition.loanTokenAmountFilled,
                loanPosition.collateralTokenAmountFilled,
                loanPosition.positionTokenAmountFilled,
                loanPosition.loanStartUnixTimestampSec,
                active
            ]
        );
    }

    /*
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
