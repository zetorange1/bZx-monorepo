
pragma solidity 0.4.24;


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
interface OracleInterface {

    /// @dev Called by bZx after a loan order is taken
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param orderAddresses loanTokenAddress, collateralTokenAddress, interestTokenAddress, taker
    /// @param orderAmounts loanTokenAmount, collateralTokenAmount, interestTokenAmount, gasUsed
    /// @return Successful execution of the function
    function didTakeOrder(
        bytes32 loanOrderHash,
        address[4] orderAddresses,
        uint[4] orderAmounts)
        external
        returns (bool);

    /// @dev Called by bZx after a position token is traded
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param trader The trader doing the trade
    /// @param tradeTokenAddress The token that was bought in the trade
    /// @param tradeTokenAmount The amount of token that was bought
    /// @param gasUsed The initial used gas, collected in a modifier in bZx, for optional gas refunds
    /// @return Successful execution of the function
    function didTradePosition(
        bytes32 loanOrderHash,
        address trader,
        address tradeTokenAddress,
        uint tradeTokenAmount,
        uint gasUsed)
        external
        returns (bool);

    /// @dev Called by bZx after interest should be paid to a lender
    /// @dev Assume the interest token has already been transfered to
    /// @dev this contract before this function is called.
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param trader The trader
    /// @param lender The lender
    /// @param interestTokenAddress The token that will be paid for interest
    /// @param amountOwed The amount interest to pay
    /// @param convert A boolean indicating if the interest should be converted to Ether
    /// @param gasUsed The initial used gas, collected in a modifier in bZx, for optional gas refunds
    /// @return Successful execution of the function
    function didPayInterest(
        bytes32 loanOrderHash,
        address trader,
        address lender,
        address interestTokenAddress,
        uint amountOwed,
        bool convert,
        uint gasUsed)
        external
        returns (bool);

    /// @dev Called by bZx after a borrower has deposited additional collateral
    /// @dev token for an open loan
    /// @param loanOrderHash A unique hash representing the loan order.
    /// @param borrower The borrower
    /// @param gasUsed The initial used gas, collected in a modifier in bZx, for optional gas refunds
    /// @return Successful execution of the function
    function didDepositCollateral(
        bytes32 loanOrderHash,
        address borrower,
        uint gasUsed)
        external
        returns (bool);

    /// @dev Called by bZx after a borrower has withdrawn excess collateral
    /// @dev token for an open loan
    /// @param loanOrderHash A unique hash representing the loan order.
    /// @param borrower The borrower
    /// @param gasUsed The initial used gas, collected in a modifier in bZx, for optional gas refunds
    /// @return Successful execution of the function
    function didWithdrawCollateral(
        bytes32 loanOrderHash,
        address borrower,
        uint gasUsed)
        external
        returns (bool);

    /// @dev Called by bZx after a borrower has changed the collateral token
    /// @dev used for an open loan
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param borrower The borrower
    /// @param gasUsed The initial used gas, collected in a modifier in bZx, for optional gas refunds
    /// @return Successful execution of the function
    function didChangeCollateral(
        bytes32 loanOrderHash,
        address borrower,
        uint gasUsed)
        external
        returns (bool);

    /// @dev Called by bZx after a borrower has withdraw their profits, if any
    /// @dev used for an open loan
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param borrower The borrower
    /// @param gasUsed The initial used gas, collected in a modifier in bZx, for optional gas refunds
    /// @return Successful execution of the function
    function didWithdrawProfit(
        bytes32 loanOrderHash,
        address borrower,
        uint profitOrLoss,
        uint gasUsed)
        external
        returns (bool);

    /// @dev Called by bZx after a loan is closed
    /// @param loanOrderHash A unique hash representing the loan order.
    /// @param loanCloser The user that closed the loan
    /// @param isLiquidation A boolean indicating if the loan was closed due to liquidation
    /// @param gasUsed The initial used gas, collected in a modifier in bZx, for optional gas refunds
    /// @return Successful execution of the function
    function didCloseLoan(
        bytes32 loanOrderHash,
        address loanCloser,
        bool isLiquidation,
        uint gasUsed)
        external
        returns (bool);

    /// @dev Places a manual on-chain trade with a liquidity provider
    /// @param sourceTokenAddress The token being sold
    /// @param destTokenAddress The token being bought
    /// @param sourceTokenAmount The amount of token being sold
    /// @return The amount of destToken bought
    function doManualTrade(
        address sourceTokenAddress,
        address destTokenAddress,
        uint sourceTokenAmount)
        external
        returns (uint);

    /// @dev Places an automatic on-chain trade with a liquidity provider
    /// @param sourceTokenAddress The token being sold
    /// @param destTokenAddress The token being bought
    /// @param sourceTokenAmount The amount of token being sold
    /// @return The amount of destToken bought
    function doTrade(
        address sourceTokenAddress,
        address destTokenAddress,
        uint sourceTokenAmount)
        external
        returns (uint);

    /// @dev Verifies a position has fallen below margin maintenance
    /// @dev then liquidates the position on-chain
    /// @param loanTokenAddress The token that was loaned
    /// @param positionTokenAddress The token in the current position (could also be the loanToken)
    /// @param collateralTokenAddress The token used for collateral
    /// @param loanTokenAmount The amount of loan token
    /// @param positionTokenAmount The amount of position token
    /// @param collateralTokenAmount The amount of collateral token
    /// @param maintenanceMarginAmount The maintenance margin amount from the loan
    /// @return The amount of destToken bought
    function verifyAndLiquidate(
        address loanTokenAddress,
        address positionTokenAddress,
        address collateralTokenAddress,
        uint loanTokenAmount,
        uint positionTokenAmount,
        uint collateralTokenAmount,
        uint maintenanceMarginAmount)
        external
        returns (uint);

    /// @dev Liquidates collateral to cover loan losses and does any other processing required by the oracle
    /// @param collateralTokenAddress The collateral token
    /// @param loanTokenAddress The loan token
    /// @param collateralTokenAmountUsable The total amount of collateral usable for processing
    /// @param loanTokenAmountNeeded The amount of loan token needed to cover losses
    /// @param initialMarginAmount The initial margin amount set for the loan
    /// @param maintenanceMarginAmount The maintenance margin amount set for the loan
    /// @param isLiquidation A boolean indicating if the loan was closed due to liquidation
    /// @return The amount of destToken bought
    function processCollateral(
        address collateralTokenAddress,
        address loanTokenAddress,
        uint collateralTokenAmountUsable,
        uint loanTokenAmountNeeded,
        uint initialMarginAmount,
        uint maintenanceMarginAmount,
        bool isLiquidation)
        external
        returns (uint, uint);

    /// @dev Checks if a position has fallen below margin
    /// @dev maintenance and should be liquidated
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param trader The address of the trader
    /// @param loanTokenAddress The token that was loaned
    /// @param positionTokenAddress The token in the current position (could also be the loanToken)
    /// @param collateralTokenAddress The token used for collateral
    /// @param loanTokenAmount The amount of loan token
    /// @param positionTokenAmount The amount of position token
    /// @param collateralTokenAmount The amount of collateral token
    /// @param maintenanceMarginAmount The maintenance margin amount from the loan
    /// @return Returns True if the trade should be liquidated immediately
    function shouldLiquidate(
        bytes32 loanOrderHash,
        address trader,
        address loanTokenAddress,
        address positionTokenAddress,
        address collateralTokenAddress,
        uint loanTokenAmount,
        uint positionTokenAmount,
        uint collateralTokenAmount,
        uint maintenanceMarginAmount)
        external
        view
        returns (bool);

    /// @dev Gets the trade price and amount received from a trade of sourceToken for destToken
    /// @param sourceTokenAddress Token being sold
    /// @param destTokenAddress Token being bought
    /// @param sourceTokenAmount The amount of token being sold
    /// @return The trade rate
    function getTradeData(
        address sourceTokenAddress,
        address destTokenAddress,
        uint sourceTokenAmount)
        external
        view 
        returns (uint sourceToDestRate, uint destTokenAmount);

    /// @dev Returns the profit/loss data for the current position
    /// @param positionTokenAddress The token in the current position (could also be the loanToken)
    /// @param loanTokenAddress The token that was loaned
    /// @param positionTokenAmount The amount of position token
    /// @param loanTokenAmount The amount of loan token
    /// @return isProfit, profitOrLoss (denominated in positionToken)
    function getProfitOrLoss(
        address positionTokenAddress,
        address loanTokenAddress,
        uint positionTokenAmount,
        uint loanTokenAmount)
        external
        view
        returns (bool isProfit, uint profitOrLoss);

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
        uint loanTokenAmount,
        uint positionTokenAmount,
        uint collateralTokenAmount)
        external
        view
        returns (uint);

    /// @dev Checks if the ERC20 token pair is supported by the oracle
    /// @param sourceTokenAddress Token being sold
    /// @param destTokenAddress Token being bought
    /// @param sourceTokenAmount Amount of token being sold
    /// @return True if price discovery and trading is supported
    function isTradeSupported(
        address sourceTokenAddress,
        address destTokenAddress,
        uint sourceTokenAmount)
        external
        view 
        returns (bool);
}
