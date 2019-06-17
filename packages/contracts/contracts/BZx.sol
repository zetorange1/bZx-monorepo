/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
 
/* solhint-disable func-order, separate-by-one-line-in-contract */

pragma solidity 0.5.3;
pragma experimental ABIEncoderV2;

import "./storage/BZxStorage.sol";
import "./zeroex/ExchangeV2Interface.sol";

// This interface is meant to used with the deployed BZxProxy contract (proxy/BZxProxy.sol) address.
// js example: const bZx = await BZx.at(BZxProxy.address);

contract BZx is BZxStorage {

    /// @dev Takes the order as trader
    /// @param orderAddresses Array of order's makerAddress, loanTokenAddress, interestTokenAddress, collateralTokenAddress, feeRecipientAddress, oracleAddress, takerAddress, tradeTokenToFillAddress.
    /// @param orderValues Array of order's loanTokenAmount, interestAmount, initialMarginAmount, maintenanceMarginAmount, lenderRelayFee, traderRelayFee, maxDurationUnixTimestampSec, expirationUnixTimestampSec, makerRole (0=lender, 1=trader), withdrawOnOpen, and salt.
    /// @param oracleData An arbitrary length bytes stream to pass to the oracle.
    /// @param collateralTokenFilled Desired address of the collateralTokenAddress the trader wants to use.
    /// @param loanTokenAmountFilled Desired amount of loanToken the trader wants to borrow.
    /// @param tradeTokenToFillAddress If non-zero address, will swap the loanToken for this asset using the oracle.
    /// @param withdrawOnOpen If true, will overcollateralize the loan and withdraw the position token to the trader's wallet. If set, tradeTokenToFillAddress is ignored.
    /// @param signature ECDSA signature in raw bytes (rsv).
    /// @return Total amount of loanToken borrowed (uint256).
    /// @dev Traders can take a portion of the total coin being lended (loanTokenAmountFilled).
    /// @dev Traders also specify the token that will fill the margin requirement if they are taking the order.
    function takeLoanOrderAsTrader(
        address[8] calldata orderAddresses,
        uint256[11] calldata orderValues,
        bytes calldata oracleData,
        address collateralTokenFilled,
        uint256 loanTokenAmountFilled,
        address tradeTokenToFillAddress,
        bool withdrawOnOpen,
        bytes calldata signature)
        external
        returns (uint256);

    /// @dev Takes the order as lender
    /// @param orderAddresses Array of order's makerAddress, loanTokenAddress, interestTokenAddress, collateralTokenAddress, feeRecipientAddress, oracleAddress, takerAddress, tradeTokenToFillAddress.
    /// @param orderValues Array of order's loanTokenAmount, interestAmount, initialMarginAmount, maintenanceMarginAmount, lenderRelayFee, traderRelayFee, maxDurationUnixTimestampSec, expirationUnixTimestampSec, makerRole (0=lender, 1=trader), withdrawOnOpen, and salt.
    /// @param oracleData An arbitrary length bytes stream to pass to the oracle.
    /// @param signature ECDSA signature in raw bytes (rsv).
    /// @return Total amount of loanToken borrowed (uint256).
    /// @dev Lenders have to fill the entire desired amount the trader wants to borrow.
    /// @dev This makes loanTokenAmountFilled = loanOrder.loanTokenAmount.
    function takeLoanOrderAsLender(
        address[8] calldata orderAddresses,
        uint256[11] calldata orderValues,
        bytes calldata oracleData,
        bytes calldata signature)
        external
        returns (uint256);

    /// @dev Pushes an order on chain
    /// @param orderAddresses Array of order's makerAddress, loanTokenAddress, interestTokenAddress, collateralTokenAddress, feeRecipientAddress, oracleAddress, takerAddress, tradeTokenToFillAddress.
    /// @param orderValues Array of order's loanTokenAmount, interestAmount, initialMarginAmount, maintenanceMarginAmount, lenderRelayFee, traderRelayFee, maxDurationUnixTimestampSec, expirationUnixTimestampSec, makerRole (0=lender, 1=trader), withdrawOnOpen, and salt.
    /// @param oracleData An arbitrary length bytes stream to pass to the oracle.
    /// @param signature ECDSA signature in raw bytes (rsv).
    /// @return A unique hash representing the loan order.
    function pushLoanOrderOnChain(
        address[8] calldata orderAddresses,
        uint256[11] calldata orderValues,
        bytes calldata oracleData,
        bytes calldata signature)
        external
        returns (bytes32);

    /// @dev Takes the order as trader that's already pushed on chain
    /// @param loanOrderHash A unique hash representing the loan order.
    /// @param collateralTokenFilled Desired address of the collateralTokenAddress the trader wants to use.
    /// @param loanTokenAmountFilled Desired amount of loanToken the trader wants to borrow.
    /// @param tradeTokenToFillAddress If non-zero address, will swap the loanToken for this asset using the oracle.
    /// @param withdrawOnOpen If true, will overcollateralize the loan and withdraw the position token to the trader's wallet. If set, tradeTokenToFillAddress is ignored.
    /// @return Total amount of loanToken borrowed (uint256).
    /// @dev Traders can take a portion of the total coin being lended (loanTokenAmountFilled).
    /// @dev Traders also specify the token that will fill the margin requirement if they are taking the order.
    function takeLoanOrderOnChainAsTrader(
        bytes32 loanOrderHash,
        address collateralTokenFilled,
        uint256 loanTokenAmountFilled,
        address tradeTokenToFillAddress,
        bool withdrawOnOpen)
        external
        returns (uint256);

    /// @dev Allows a delegate to take an on-chain order on behalf of a trader
    /// @param trader The trader to which to fill the order.
    /// @param loanOrderHash A unique hash representing the loan order.
    /// @param collateralTokenFilled Desired address of the collateralTokenAddress the trader wants to use.
    /// @param loanTokenAmountFilled Desired amount of loanToken the trader wants to borrow.
    /// @param tradeTokenToFillAddress If non-zero address, will swap the loanToken for this asset using the oracle.
    /// @param withdrawOnOpen If true, will overcollateralize the loan and withdraw the position token to the trader's wallet. If set, tradeTokenToFillAddress is ignored.
    /// @return Total amount of loanToken borrowed (uint256).
    /// @dev Traders can take a portion of the total coin being lended (loanTokenAmountFilled).
    /// @dev Traders also specify the token that will fill the margin requirement if they are taking the order.
    function takeLoanOrderOnChainAsTraderByDelegate(
        address trader,
        bytes32 loanOrderHash,
        address collateralTokenFilled,
        uint256 loanTokenAmountFilled,
        address tradeTokenToFillAddress,
        bool withdrawOnOpen)
        external
        returns (uint256);

    /// @dev Takes the order as lender that's already pushed on chain
    /// @param loanOrderHash A unique hash representing the loan order.
    /// @return Total amount of loanToken borrowed (uint256).
    /// @dev Lenders have to fill the entire desired amount the trader wants to borrow.
    /// @dev This makes loanTokenAmountFilled = loanOrder.loanTokenAmount.
    function takeLoanOrderOnChainAsLender(
        bytes32 loanOrderHash)
        external
        returns (uint256);

    /// @dev Approves a hash on-chain using any valid signature type.
    ///      After presigning a hash, the preSign signature type will become valid for that hash and signer.
    /// @param signer Address that should have signed the hash generated by the loanOrder parameters given.
    /// @param orderAddresses Array of order's makerAddress, loanTokenAddress, interestTokenAddress, collateralTokenAddress, feeRecipientAddress, oracleAddress, takerAddress, tradeTokenToFillAddress.
    /// @param orderValues Array of order's loanTokenAmount, interestAmount, initialMarginAmount, maintenanceMarginAmount, lenderRelayFee, traderRelayFee, maxDurationUnixTimestampSec, expirationUnixTimestampSec, makerRole (0=lender, 1=trader), withdrawOnOpen, and salt.
    /// @param oracleData An arbitrary length bytes stream to pass to the oracle.
    /// @param signature Proof that the hash has been signed by signer.
    function preSign(
        address signer,
        address[8] calldata orderAddresses,
        uint256[11] calldata orderValues,
        bytes calldata oracleData,
        bytes calldata signature)
        external;

    /// @dev Approves a hash on-chain using any valid signature type.
    ///      After presigning a hash, the preSign signature type will become valid for that hash and signer.
    /// @param signer Address that should have signed the given hash.
    /// @param hash Signed Keccak-256 hash.
    /// @param signature Proof that the hash has been signed by signer.
    function preSignWithHash(
        address signer,
        bytes32 hash,
        bytes calldata signature)
        external;

    /// @dev Toggles approval of a deletate that can fill orders on behalf of another user
    /// @param delegate The delegate address
    /// @param isApproved If true, the delegate is approved. If false, the delegate is not approved
    function toggleDelegateApproved(
        address delegate,
        bool isApproved)
        external;

    /// @dev Toggles approval of a protocol deletate that can fill orders on behalf of another user when requested by that user
    /// @param delegate The delegate address
    /// @param isApproved If true, the delegate is approved. If false, the delegate is not approved
    function toggleProtocolDelegateApproved(
        address delegate,
        bool isApproved)
        external;

    /// @dev Cancels remaining (untaken) loan
    /// @param orderAddresses Array of order's makerAddress, loanTokenAddress, interestTokenAddress, collateralTokenAddress, feeRecipientAddress, oracleAddress, takerAddress, tradeTokenToFillAddress.
    /// @param orderValues Array of order's loanTokenAmount, interestAmount, initialMarginAmount, maintenanceMarginAmount, lenderRelayFee, traderRelayFee, maxDurationUnixTimestampSec, expirationUnixTimestampSec, makerRole (0=lender, 1=trader), withdrawOnOpen, and salt.
    /// @param oracleData An arbitrary length bytes stream to pass to the oracle.
    /// @param cancelLoanTokenAmount The amount of remaining unloaned token to cancel.
    /// @return The amount of loan token canceled.
    function cancelLoanOrder(
        address[8] calldata orderAddresses,
        uint256[11] calldata orderValues,
        bytes calldata oracleData,
        uint256 cancelLoanTokenAmount)
        external
        returns (uint256);

    /// @dev Cancels remaining (untaken) loan
    /// @param loanOrderHash A unique hash representing the loan order.
    /// @param cancelLoanTokenAmount The amount of remaining unloaned token to cancel.
    /// @return The amount of loan token canceled.
    function cancelLoanOrderWithHash(
        bytes32 loanOrderHash,
        uint256 cancelLoanTokenAmount)
        external
        returns (uint256);

    /// @dev Returns the amount of fillable loan token for an order
    /// @param loanOrderHash A unique hash representing the loan order
    /// @return The amount of loan token fillable
    function getLoanTokenFillable(
        bytes32 loanOrderHash)
        public
        view
        returns (uint256);

    /// @dev Calculates Keccak-256 hash of order with specified parameters.
    /// @param orderAddresses Array of order's makerAddress, loanTokenAddress, interestTokenAddress, collateralTokenAddress, feeRecipientAddress, oracleAddress, takerAddress, tradeTokenToFillAddress.
    /// @param orderValues Array of order's loanTokenAmount, interestAmount, initialMarginAmount, maintenanceMarginAmount, lenderRelayFee, traderRelayFee, maxDurationUnixTimestampSec, expirationUnixTimestampSec, makerRole (0=lender, 1=trader), withdrawOnOpen, and salt.
    /// @param oracleData An arbitrary length bytes stream to pass to the oracle.
    /// @return Keccak-256 hash of loanOrder.
    function getLoanOrderHash(
        address[8] memory orderAddresses,
        uint256[11] memory orderValues,
        bytes memory oracleData)
        public
        view
        returns (bytes32);

    /// @dev Verifies that an order signature is valid.
    /// @param signer address of signer.
    /// @param hash Signed Keccak-256 hash.
    /// @param signature ECDSA signature in raw bytes (rsv) + signatureType.
    /// @return Validity of order signature.
    function isValidSignature(
        address signer,
        bytes32 hash,
        bytes memory signature)
        public
        pure
        returns (bool);

    /// @dev Calculates the initial collateral required to open the loan.
    /// @param collateralTokenAddress The collateral token used by the trader.
    /// @param oracleAddress The oracle address specified in the loan order.
    /// @param loanTokenAmountFilled The amount of loan token borrowed.
    /// @param initialMarginAmount The initial margin percentage amount (i.e. 50000000000000000000 == 50%)
    /// @return The minimum collateral requirement to open the loan.
    function getInitialCollateralRequired(
        address loanTokenAddress,
        address collateralTokenAddress,
        address oracleAddress,
        uint256 loanTokenAmountFilled,
        uint256 initialMarginAmount)
        public
        view
        returns (uint256 collateralTokenAmount);

    /// @dev Returns a bytestream of a single order.
    /// @param loanOrderHash A unique hash representing the loan order.
    /// @return A concatenated stream of bytes.
    function getSingleOrder(
        bytes32 loanOrderHash)
        public
        view
        returns (bytes memory);

    /// @dev Returns a bytestream of data from orders that are available for taking.
    /// @param start The starting order in the order list to return.
    /// @param count The total amount of orders to return if they exist. Amount returned can be less.
    /// @param oracleFilter Only return orders for a given oracle address.
    /// @return A concatenated stream of bytes.
    function getOrdersFillable(
        uint256 start,
        uint256 count,
        address oracleFilter)
        public
        view
        returns (bytes memory);

    /// @dev Returns a bytestream of order data for a user.
    /// @param loanParty The address of the maker or taker of the order.
    /// @param start The starting order in the order list to return.
    /// @param count The total amount of orders to return if they exist. Amount returned can be less.
    /// @param oracleFilter Only return orders for a given oracle address.
    /// @return A concatenated stream of bytes.
    function getOrdersForUser(
        address loanParty,
        uint256 start,
        uint256 count,
        address oracleFilter)
        public
        view
        returns (bytes memory);

    /// @dev Returns a bytestream of loan data for a trader.
    /// @param loanOrderHash A unique hash representing the loan order.
    /// @param trader The address of the trader/borrower of a loan.
    /// @return A concatenated stream of bytes.
    function getSingleLoan(
        bytes32 loanOrderHash,
        address trader)
        public
        view
        returns (bytes memory);

    /// @dev Returns a bytestream of loan data for a lender.
    /// @param loanParty The address of the lender in the loan.
    /// @param count The total amount of loans to return if they exist. Amount returned can be less.
    /// @param activeOnly A boolean indicating if inactive/expired loans should be excluded.
    /// @return A concatenated stream of bytes.
    function getLoansForLender(
        address loanParty,
        uint256 count,
        bool activeOnly)
        public
        view
        returns (bytes memory);

    /// @dev Returns a bytestream of loan data for a trader.
    /// @param loanParty The address of the trader in the loan.
    /// @param count The total amount of loans to return if they exist. Amount returned can be less.
    /// @param activeOnly A boolean indicating if inactive/expired loans should be excluded.
    /// @return A concatenated stream of bytes.
    function getLoansForTrader(
        address loanParty,
        uint256 count,
        bool activeOnly)
        public
        view
        returns (bytes memory);

    /// @dev Returns a bytestream of active loans.
    /// @param start The starting loan in the loan list to return.
    /// @param count The total amount of loans to return if they exist. Amount returned can be less.
    /// @return A concatenated stream of PositionRef(loanOrderHash, trader) bytes.
    function getActiveLoans(
        uint256 start,
        uint256 count)
        public
        view
        returns (bytes memory);

    /// @dev Returns a LoanOrder object.
    /// @param loanOrderHash A unique hash representing the loan order.
    function getLoanOrder(
        bytes32 loanOrderHash)
        public
        view
        returns (LoanOrder memory);

    /// @dev Returns a LoanOrderAux object.
    /// @param loanOrderHash A unique hash representing the loan order.
    function getLoanOrderAux(
        bytes32 loanOrderHash)
        public
        view
        returns (LoanOrderAux memory);

    /// @dev Returns a LoanPosition object.
    /// @param positionId A unqiue id representing the loan position.
    function getLoanPosition(
        uint256 positionId)
        public
        view
        returns (LoanPosition memory);

    /// @dev Executes a 0x trade using loaned funds.
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param orderData0x 0x order arguments, converted to hex, padded to 32 bytes and concatenated (multi-order batching allowed)
    /// @param signature0x ECDSA of the 0x order (multi-order batching allowed)
    /// @return The amount of token received in the trade.
    function tradePositionWith0x(
        bytes32 loanOrderHash,
        bytes calldata orderData0x,
        bytes calldata signature0x)
        external
        returns (uint256);

    /// @dev Executes a 0x trade using loaned funds.
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param orders0x Array of 0x V2 order structs
    /// @param signatures0x Array of signatures for each of the V2 orders
    /// @return The amount of token received in the trade.
    function tradePositionWith0xV2(
        bytes32 loanOrderHash,
        ExchangeV2Interface.OrderV2[] memory orders0x,
        bytes[] memory signatures0x)
        public
        returns (uint256);

    /// @dev Executes a market order trade using the oracle contract specified in the loan referenced by loanOrderHash
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param tradeTokenAddress The address of the token to buy in the trade
    /// @return The amount of token received in the trade.
    function tradePositionWithOracle(
        bytes32 loanOrderHash,
        address tradeTokenAddress)
        external
        returns (uint256);

    /// @dev Allows the trader to increase the collateral for a loan.
    /// @dev If depositTokenAddress is not the correct token, it will be traded to the correct token using the oracle.
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param depositTokenAddress The address of the collateral token used.
    /// @param depositAmount The amount of additional collateral token to deposit.
    /// @return True on success
    function depositCollateral(
        bytes32 loanOrderHash,
        address depositTokenAddress,
        uint256 depositAmount)
        external
        returns (bool);

    /// @dev Allows the trader to withdraw excess collateral for a loan.
    /// @dev Excess collateral is any amount above the initial margin.
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param withdrawAmount The amount to withdraw
    /// @return amountWithdrawn The amount withdrawn denominated in collateralToken. Can be less than withdrawAmount.
    function withdrawCollateral(
        bytes32 loanOrderHash,
        uint256 withdrawAmount)
        external
        returns (uint256 amountWithdrawn);

    /// @dev Allows the trader to change the collateral token being used for a loan.
    /// @dev This function will transfer in the initial margin requirement of the new token and the old token will be refunded to the trader.
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param collateralTokenFilled The address of the collateral token used.
    /// @return collateralTokenAmountFilled The amount of new collateral token filled
    function changeCollateral(
        bytes32 loanOrderHash,
        address collateralTokenFilled)
        external
        returns (uint256 collateralTokenAmountFilled);

    /// @dev Allows the trader to withdraw any amount in excess of their loan principal
    /// @dev The trader will only be able to withdraw an amount the keeps the loan at or above initial margin
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param withdrawAmount The amount to withdraw
    /// @return amountWithdrawn The amount withdrawn denominated in positionToken. Can be less than withdrawAmount.
    function withdrawPosition(
        bytes32 loanOrderHash,
        uint256 withdrawAmount)
        external
        returns (uint256 amountWithdrawn);

    /// @dev Allows the trader to return the position/loan token to increase their escrowed balance
    /// @dev This should be used by the trader if they've withdraw an overcollateralized loan
    /// @dev If depositTokenAddress is not the correct token, it will be traded to the correct token using the oracle.
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param depositTokenAddress The address of the position token being returned
    /// @param depositAmount The amount of position token to deposit.
    /// @return True on success
    function depositPosition(
        bytes32 loanOrderHash,
        address depositTokenAddress,
        uint256 depositAmount)
        external
        returns (bool);

    /// @dev Allows the trader to transfer ownership of the underlying assets in a position to another user.
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param newOwner The address receiving the transfer
    /// @return True on success
    function changeTraderOwnership(
        bytes32 loanOrderHash,
        address newOwner)
        external
        returns (bool);

    /// @dev Allows the lender to transfer ownership of the underlying assets in a position to another user.
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param newOwner The address receiving the transfer
    /// @return True on success
    function changeLenderOwnership(
        bytes32 loanOrderHash,
        address newOwner)
        external
        returns (bool);

    /// @dev Allows the lender to set optional updates to their on-chain loan order that affects future borrowers
    /// @dev Setting a new interest rate will invalidate the off-chain bZx loan order (only the on-chain order can be taken)
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param increaseAmountForLoan Optional parameter to specify the amount of loan token increase
    /// @param newInterestRate Optional parameter to specify the amount of loan token increase
    /// @param newExpirationTimestamp Optional parameter to set the expirationUnixTimestampSec on the loan to a different date. A value of MAX_UINT (2**256 - 1) removes the expiration date.
    /// @return True on success
    function updateLoanAsLender(
        bytes32 loanOrderHash,
        uint256 increaseAmountForLoan,
        uint256 newInterestRate,
        uint256 newExpirationTimestamp)
        external
        returns (bool);

    /// @dev Allows the maker of an order to set a description
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param desc Descriptive text to attach to the loan order
    /// @return True on success
    function setLoanOrderDesc(
        bytes32 loanOrderHash,
        string calldata desc)
        external
        returns (bool);

    /// @dev Get the current excess or deficit position amount from the loan principal
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param trader The trader of the position
    /// @return isPositive True if there's an surplus, False otherwise
    /// @return positionOffsetAmount The amount of surplus or deficit in positionToken
    /// @return loanOffsetAmount The amount of surplus or deficit in loanToken
    /// @return collateralOffsetAmount The amount of surplus or deficit in collateralToken
    function getPositionOffset(
        bytes32 loanOrderHash,
        address trader)
        public
        view
        returns (
            bool isPositive,
            uint256 positionOffsetAmount,
            uint256 loanOffsetAmount,
            uint256 collateralOffsetAmount);

    /// @param loanOrderHash A unique hash representing the loan order
    /// @param trader The trader of the position
    /// @param actualized If true we get actual rate, false we get best rate
    /// @return netCollateralAmount The amount of collateral escrowed netted to any exceess or deficit from gains and losses
    /// @return interestDepositRemaining The amount of deposited interest that is not yet owed to a lender
    /// @return loanTokenAmountBorrowed The amount of loan token borrowed for the position
    function getTotalEscrow(
        bytes32 loanOrderHash,
        address trader,
        bool actualized)
        public
        view
        returns (
            uint256 netCollateralAmount,
            uint256 interestDepositRemaining,
            uint256 loanTokenAmountBorrowed);

    /// @dev Pays the lender the total amount of interest accrued for a loan order
    /// @dev Note that this function can be safely called by anyone.
    /// @param loanOrderHash A unique hash representing the loan order
    /// @return The amount of interest paid out
    function payInterestForOrder(
        bytes32 loanOrderHash)
        external
        returns (uint256);

    /// @dev Pays the lender the total amount of interest for open loans using a particular oracle and interest token
    /// @dev Note that this function can be only be called by a lender for their loans.
    /// @param oracleAddress The oracle address
    /// @param interestTokenAddress The interest token address
    /// @return The amount of interest paid out
    function payInterestForOracle(
        address oracleAddress,
        address interestTokenAddress)
        external
        returns (uint256);

    /// @dev Checks that a position meets the conditions for liquidation, then closes the position and loan.
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param trader The trader of the position
    /// @param maxCloseAmount The maximum amount of loan principal to liquidate
    /// @dev A maxCloseAmount exceeding loanTokenAmountFilled or a maxCloseAmount of 0, will set the maximum to loanTokenAmountFilled.
    /// @return True on success
    function liquidatePosition(
        bytes32 loanOrderHash,
        address trader,
        uint256 maxCloseAmount)
        external
        returns (bool);

    /// @dev Called by the trader to close part of their loan early.
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param closeAmount The amount of the loan token to return to the lender
    /// @return The actual amount closed. Greater than closeAmount means the loan needed liquidation.
    function closeLoanPartially(
        bytes32 loanOrderHash,
        uint256 closeAmount)
        external
        returns (uint256 actualCloseAmount);

    /// @dev Called by the trader to close part of their loan early.
    /// @dev Contract will revert if the position is unhealthy and the full position is not being closed.
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param closeAmount The amount of the loan token to return to the lender
    /// @return The actual amount closed. Greater than closeAmount means the loan needed liquidation.
    function closeLoanPartiallyIfHealthy(
        bytes32 loanOrderHash,
        uint256 closeAmount)
        external
        returns (uint256 actualCloseAmount);

    /// @dev Called by the trader to close their loan early.
    /// @param loanOrderHash A unique hash representing the loan order
    /// @return True on success
    function closeLoan(
        bytes32 loanOrderHash)
        external
        returns (bool);

    /// @dev Called by an admin to force close a loan early and return assets to the lender and trader as is.
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param trader The trader of the position
    /// @return True on success
    function forceCloseLoan(
        bytes32 loanOrderHash,
        address trader)
        external
        returns (bool);

    /// @dev Checks the conditions for liquidation with the oracle
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param trader The trader of the position
    /// @return True if liquidation should occur, false otherwise
    function shouldLiquidate(
        bytes32 loanOrderHash,
        address trader)
        public
        view
        returns (bool);

    /// @dev Gets current margin data for the loan
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param trader The trader of the position
    /// @return initialMarginAmount The initial margin percentage set on the loan order
    /// @return maintenanceMarginAmount The maintenance margin percentage set on the loan order
    /// @return currentMarginAmount The current margin percentage, representing the health of the loan (i.e. 54350000000000000000 == 54.35%)
    function getMarginLevels(
        bytes32 loanOrderHash,
        address trader)
        public
        view
        returns (
            uint256 initialMarginAmount,
            uint256 maintenanceMarginAmount,
            uint256 currentMarginAmount);

    /// @dev Gets current lender interest data totals for all loans with a specific oracle and interest token
    /// @param lender The lender address
    /// @param oracleAddress The oracle address
    /// @param interestTokenAddress The interest token address
    /// @return interestPaid The total amount of interest that has been paid to a lender so far
    /// @return interestPaidDate The date of the last interest pay out, or 0 if no interest has been withdrawn yet
    /// @return interestOwedPerDay The amount of interest the lender is earning per day
    /// @return interestUnPaid The total amount of interest the lender is owned and not yet withdrawn
    function getLenderInterestForOracle(
        address lender,
        address oracleAddress,
        address interestTokenAddress)
        public
        view
        returns (
            uint256 interestPaid,
            uint256 interestPaidDate,
            uint256 interestOwedPerDay,
            uint256 interestUnPaid);

    /// @dev Gets current lender interest data for the loan
    /// @param loanOrderHash A unique hash representing the loan
    /// @return lender The lender in this loan
    /// @return interestTokenAddress The interest token used in this loan
    /// @return interestPaid The total amount of interest that has been paid to a lender so far
    /// @return interestPaidDate The date of the last interest pay out, or 0 if no interest has been withdrawn yet
    /// @return interestOwedPerDay The amount of interest the lender is earning per day
    /// @return interestUnPaid The total amount of interest the lender is owned and not yet withdrawn
    function getLenderInterestForOrder(
        bytes32 loanOrderHash)
        public
        view
        returns (
            address lender,
            address interestTokenAddress,
            uint256 interestPaid,
            uint256 interestPaidDate,
            uint256 interestOwedPerDay,
            uint256 interestUnPaid);

    /// @dev Gets current trader interest data for the loan
    /// @param loanOrderHash A unique hash representing the loan
    /// @param trader The trader of the position
    /// @return interestTokenAddress The interest token used in this loan
    /// @return interestOwedPerDay The amount of interest the trader is paying per day
    /// @return interestPaidTotal The total amount of interest the trader has paid so far to a lender
    /// @return interestDepositTotal The total amount of interest the trader has deposited
    /// @return interestDepositRemaining The amount of deposited interest that is not yet owed to a lender
    function getTraderInterestForLoan(
        bytes32 loanOrderHash,
        address trader)
        public
        view
        returns (
            address interestTokenAddress,
            uint256 interestOwedPerDay,
            uint256 interestPaidTotal,
            uint256 interestDepositTotal,
            uint256 interestDepositRemaining);

    /// @param loanOrderHash A unique hash representing the loan order
    /// @param trader The trader of the position
    /// @return True if the position is open/active, false otherwise
    function isPositionOpen(
        bytes32 loanOrderHash,
        address trader)
        public
        view
        returns (bool);
}
