/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
 
pragma solidity 0.5.3;
pragma experimental ABIEncoderV2;

import "../storage/BZxObjects.sol";


/**
    @title OracleInterface, an interface for bZx compatible oracle contracts

    This interface is meant to be inherited by contracts implementing a
    compatible oracle solution for bZx. The functions should provide logic
    for price discovery of ERC20 token pairs, and handle the trading of
    those pairs through an on-chain mechanism. All functions are called by bZx,
    so all must be implemented. If a function is unneeded in a particular
    use-case, simply return immediately, but with a True value for Boolean
    returns.

    Care should be taken to define appropriate levels of security to prevent
    unauthorized use to functions that would normally be called by the bZx
    calling contract. One way of doing this is with the Ownable contract from
    OpenZeppelin.

    !!! Safeguard of user funds should be of the utmost importance !!!
 */
// solhint-disable-next-line contract-name-camelcase
contract OracleInterface {

    /// @dev Called by bZx after a loan order is added
    /// @param loanOrder The loanOrder object
    /// @param loanOrderAux The loanOrderAux object
    /// @param oracleData An arbitrary length bytes stream to pass to the oracle.
    /// @param taker The user that filled/took the loan
    /// @param gasUsed The initial used gas, collected in a modifier in bZx, for optional gas refunds
    /// @return Successful execution of the function
    function didAddOrder(
        BZxObjects.LoanOrder memory loanOrder,
        BZxObjects.LoanOrderAux memory loanOrderAux,
        bytes memory oracleData,
        address taker,
        uint256 gasUsed)
        public
        returns (bool);

    /// @dev Called by bZx after a loan order is taken
    /// @param loanOrder The loanOrder object
    /// @param loanOrderAux The loanOrderAux object
    /// @param loanPosition The loanPosition object
    /// @param taker The user that filled/took the loan
    /// @param gasUsed The initial used gas, collected in a modifier in bZx, for optional gas refunds
    /// @return Successful execution of the function
    function didTakeOrder(
        BZxObjects.LoanOrder memory loanOrder,
        BZxObjects.LoanOrderAux memory loanOrderAux,
        BZxObjects.LoanPosition memory loanPosition,
        address taker,
        uint256 gasUsed)
        public
        returns (bool);

    /// @dev Called by bZx after a position token is traded
    /// @param loanOrder The loanOrder object
    /// @param loanPosition The loanPosition object
    /// @param gasUsed The initial used gas, collected in a modifier in bZx, for optional gas refunds
    /// @return Successful execution of the function
    function didTradePosition(
        BZxObjects.LoanOrder memory loanOrder,
        BZxObjects.LoanPosition memory loanPosition,
        uint256 gasUsed)
        public
        returns (bool);

    /// @dev Called by bZx after interest should be paid to a lender for a loan order
    /// @dev Assumes the interest token has already been transferred to
    /// @dev this contract before this function is called.
    /// @param loanOrder The loanOrder object
    /// @param lender The lender address
    /// @param amountOwed The amount interest to pay
    /// @param gasUsed The initial used gas, collected in a modifier in bZx, for optional gas refunds
    /// @return Successful execution of the function
    function didPayInterest(
        BZxObjects.LoanOrder memory loanOrder,
        address lender,
        uint256 amountOwed,
        uint256 gasUsed)
        public
        returns (bool);

    /// @dev Called by bZx after the lender request a full earned interest payout for a specific interest token
    /// @dev Assumes the interest token has already been transferred to
    /// @dev this contract before this function is called.
    /// @param lender The lender address
    /// @param interestTokenAddress The interest token address
    /// @param amountOwed The amount interest to pay
    /// @param gasUsed The initial used gas, collected in a modifier in bZx, for optional gas refunds
    /// @return Successful execution of the function
    function didPayInterestByLender(
        address lender,
        address interestTokenAddress,
        uint256 amountOwed,
        uint256 /* gasUsed */)
        public
        returns (bool);

    /// @dev Called by bZx after a borrower has deposited additional collateral
    /// @dev token for an open loan
    /// @param loanOrder The loanOrder object
    /// @param loanPosition The loanPosition object
    /// @param depositAmount The amount deposited
    /// @param gasUsed The initial used gas, collected in a modifier in bZx, for optional gas refunds
    /// @return Successful execution of the function
    function didDepositCollateral(
        BZxObjects.LoanOrder memory loanOrder,
        BZxObjects.LoanPosition memory loanPosition,
        uint256 depositAmount,
        uint256 gasUsed)
        public
        returns (bool);

    /// @dev Called by bZx after a borrower has withdrawn excess collateral
    /// @dev token for an open loan
    /// @param loanOrder The loanOrder object
    /// @param loanPosition The loanPosition object
    /// @param withdrawAmount The amount of collateral withdrawn
    /// @param gasUsed The initial used gas, collected in a modifier in bZx, for optional gas refunds
    /// @return Successful execution of the function
    function didWithdrawCollateral(
        BZxObjects.LoanOrder memory loanOrder,
        BZxObjects.LoanPosition memory loanPosition,
        uint256 withdrawAmount,
        uint256 gasUsed)
        public
        returns (bool);

    /// @dev Called by bZx after a borrower has changed the collateral token
    /// @dev used for an open loan
    /// @param loanOrder The loanOrder object
    /// @param loanPosition The loanPosition object
    /// @param gasUsed The initial used gas, collected in a modifier in bZx, for optional gas refunds
    /// @return Successful execution of the function
    function didChangeCollateral(
        BZxObjects.LoanOrder memory loanOrder,
        BZxObjects.LoanPosition memory loanPosition,
        uint256 gasUsed)
        public
        returns (bool);

    /// @dev Called by bZx after a borrower has withdrawn any amount in excess of their loan principal
    /// @param loanOrder The loanOrder object
    /// @param loanPosition The loanPosition object
    /// @param withdrawAmount The amount withdrawn
    /// @param gasUsed The initial used gas, collected in a modifier in bZx, for optional gas refunds
    /// @return Successful execution of the function
    function didWithdrawPosition(
        BZxObjects.LoanOrder memory loanOrder,
        BZxObjects.LoanPosition memory loanPosition,
        uint256 withdrawAmount,
        uint256 gasUsed)
        public
        returns (bool);

    /// @dev Called by bZx after a borrower has deposited position token
    /// @param loanOrder The loanOrder object
    /// @param loanPosition The loanPosition object
    /// @param depositAmount The amount deposited
    /// @param gasUsed The initial used gas, collected in a modifier in bZx, for optional gas refunds
    /// @return Successful execution of the function
    function didDepositPosition(
        BZxObjects.LoanOrder memory loanOrder,
        BZxObjects.LoanPosition memory loanPosition,
        uint256 depositAmount,
        uint256 gasUsed)
        public
        returns (bool);

    /// @dev Called by bZx after a loan is closed fully or partially
    /// @param loanOrder The loanOrder object
    /// @param loanPosition The loanPosition object
    /// @param loanCloser The user that closed the loan
    /// @param closeAmount The amount of loan token being returned to the lender
    /// @param isLiquidation A boolean indicating if the loan was closed due to liquidation
    /// @param gasUsed The initial used gas, collected in a modifier in bZx, for optional gas refunds
    /// @return Successful execution of the function
    function didCloseLoan(
        BZxObjects.LoanOrder memory loanOrder,
        BZxObjects.LoanPosition memory loanPosition,
        address payable loanCloser,
        uint256 closeAmount,
        bool isLiquidation,
        uint256 gasUsed)
        public
        returns (bool);

    /// @dev Called by bZx after a trader transfers their ownership of a position to a new trader
    /// @param loanOrder The loanOrder object
    /// @param loanPosition The loanPosition object
    /// @param oldTrader The old trader of the position
    /// @param gasUsed The initial used gas, collected in a modifier in bZx, for optional gas refunds
    /// @return Successful execution of the function
    function didChangeTraderOwnership(
        BZxObjects.LoanOrder memory loanOrder,
        BZxObjects.LoanPosition memory loanPosition,
        address oldTrader,
        uint256 gasUsed)
        public
        returns (bool);

    /// @dev Called by bZx after a lender transfers their ownership of a position to a new lender
    /// @param loanOrder The loanOrder object
    /// @param oldLender The old lender of the position
    /// @param newLender The new lender of the position
    /// @param gasUsed The initial used gas, collected in a modifier in bZx, for optional gas refunds
    /// @return Successful execution of the function
    function didChangeLenderOwnership(
        BZxObjects.LoanOrder memory loanOrder,
        address oldLender,
        address newLender,
        uint256 gasUsed)
        public
        returns (bool);

    /// @dev Called by bZx after a lender increases the fillable amount of a loan order already on chain and partially filled
    /// @param loanOrder The loanOrder object
    /// @param lender The lender
    /// @param loanTokenAmountAdded The amount of loan token that was added to the order
    /// @param totalNewFillableAmount The total fillable amount still available for this order
    /// @param newExpirationTimestamp The new expirationUnixTimestampSec of the loan
    /// @param gasUsed The initial used gas, collected in a modifier in bZx, for optional gas refunds
    /// @return Successful execution of the function
    function didUpdateLoanAsLender(
        BZxObjects.LoanOrder memory loanOrder,
        address lender,
        uint256 loanTokenAmountAdded,
        uint256 totalNewFillableAmount,
        uint256 newExpirationTimestamp,
        uint256 gasUsed)
        public
        returns (bool);

    /// @dev Places an automatic on-chain trade with a liquidity provider
    /// @param sourceTokenAddress The token being sold
    /// @param destTokenAddress The token being bought
    /// @param sourceTokenAmount The amount of token being sold
    /// @param maxDestTokenAmount The desired amount of token to buy
    /// @return The amount of destToken bought and the amount of source token used
    function trade(
        address sourceTokenAddress,
        address destTokenAddress,
        uint256 sourceTokenAmount,
        uint256 maxDestTokenAmount)
        public
        returns (uint256 destTokenAmountReceived, uint256 sourceTokenAmountUsed);

    /// @dev Places an automatic on-chain trade with a liquidity provider
    /// @param loanOrder The loanOrder object
    /// @param loanPosition The loanPosition object
    /// @param destTokenAddress The token being bought
    /// @param maxDestTokenAmount The desired amount of token to buy
    /// @param ensureHealthy If True, prevents a trade that brings the margin level below maintenanceMarginAmount
    /// @return The amount of destToken bought and the amount of source token used
    function tradePosition(
        BZxObjects.LoanOrder memory loanOrder,
        BZxObjects.LoanPosition memory loanPosition,
        address destTokenAddress,
        uint256 maxDestTokenAmount,
        bool ensureHealthy)
        public
        returns (uint256 destTokenAmountReceived, uint256 sourceTokenAmountUsed);

    /// @dev Liquidates the position (swaps positionToken to loanToken)
    /// @param loanOrder The loanOrder object
    /// @param loanPosition The loanPosition object
    /// @param maxDestTokenAmount The desired amount of token to buy
    /// @return The amount of destToken bought and the amount of source token used
    function liquidatePosition(
        BZxObjects.LoanOrder memory loanOrder,
        BZxObjects.LoanPosition memory loanPosition,
        uint256 maxDestTokenAmount)
        public
        returns (uint256 destTokenAmountReceived, uint256 sourceTokenAmountUsed);

    /// @dev Liquidates collateral to cover loan losses and does any other processing required by the oracle
    /// @param loanOrder The loanOrder object
    /// @param loanPosition The loanPosition object
    /// @param loanTokenAmountNeeded The amount of loan token needed to cover losses
    /// @param isLiquidation A boolean indicating if the loan was closed due to liquidation
    /// @return loanTokenAmountCovered and collateralTokenAmountUsed
    function processCollateral(
        BZxObjects.LoanOrder memory loanOrder,
        BZxObjects.LoanPosition memory loanPosition,
        uint256 loanTokenAmountNeeded,
        bool isLiquidation)
        public
        returns (uint256 loanTokenAmountCovered, uint256 collateralTokenAmountUsed);

    /// @dev Checks if a position has fallen below margin
    /// @dev maintenance and should be liquidated
    /// @param loanOrder The loanOrder object
    /// @param loanPosition The loanPosition object
    /// @return Returns True if the trade should be liquidated immediately
    function shouldLiquidate(
        BZxObjects.LoanOrder memory loanOrder,
        BZxObjects.LoanPosition memory loanPosition)
        public
        view
        returns (bool);

    /// @dev Gets the trade price and amount received from a trade of sourceToken for destToken
    /// @param sourceTokenAddress Token being sold
    /// @param destTokenAddress Token being bought
    /// @param sourceTokenAmount The amount of token being sold
    /// @return The trade rate, precision between tokens, and amount of destToken that would be received from the trade
    function getTradeData(
        address sourceTokenAddress,
        address destTokenAddress,
        uint256 sourceTokenAmount)
        public
        view
        returns (uint256 sourceToDestRate, uint256 sourceToDestPrecision, uint256 destTokenAmount);

    /// @dev Returns the current excess or deficit position amount from the loan principal
    /// @param loanOrder The loanOrder object
    /// @param loanPosition The loanPosition object
    /// @return isPositive, positionOffsetAmount, loanOffsetAmount, collateralOffsetAmount
    function getPositionOffset(
        BZxObjects.LoanOrder memory loanOrder,
        BZxObjects.LoanPosition memory loanPosition)
        public
        view
        returns (bool isPositive, uint256 positionOffsetAmount, uint256 loanOffsetAmount, uint256 collateralOffsetAmount);

    /// @dev Returns the current margin level for this particular loan/position
    /// @param loanTokenAddress The token that was loaned
    /// @param positionTokenAddress The token in the current position (could also be the loanToken)
    /// @param collateralTokenAddress The token used for collateral
    /// @param loanTokenAmount The amount of loan token
    /// @param positionTokenAmount The amount of position token
    /// @param collateralTokenAmount The amount of collateral token
    /// @return The current margin amount (a percentage -> i.e. 54350000000000000000 == 54.35%)
    function getCurrentMarginAmount(
        address loanTokenAddress,
        address positionTokenAddress,
        address collateralTokenAddress,
        uint256 loanTokenAmount,
        uint256 positionTokenAmount,
        uint256 collateralTokenAmount)
        public
        view
        returns (uint256);

    /// @dev Checks if the ERC20 token pair is supported by the oracle
    /// @param sourceTokenAddress Token being sold
    /// @param destTokenAddress Token being bought
    /// @param sourceTokenAmount Amount of token being sold
    /// @return True if price discovery and trading is supported
    function isTradeSupported(
        address sourceTokenAddress,
        address destTokenAddress,
        uint256 sourceTokenAmount)
        public
        view
        returns (bool);
}
