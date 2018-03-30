
pragma solidity ^0.4.21;

/**
    @title Oracle_Interface, an interface for b0x compatible oracle contracts

    This interface is meant to be inherited by contracts implementing a 
    compatible oracle solution for b0x. The functions should provide logic
    for price discovery of ERC20 token pairs, and handle the trading of
    those pairs through an on-chain mechanism. All functions are called by b0x,
    so all must be implemented. If a function is unneeded in a particular
    use-case, simply return immediately, but with a True value for Boolean
    returns.

    Care should be taken to define appropriate levels of security to prevent
    unauthorized use to functions that would normally be called by the b0x
    calling contract. One way of doing this is with the Ownable contract from
    OpenZeppelin.

    !!! Safeguard of user funds should be of the utmost importance !!!
 */
interface Oracle_Interface {

    /// @dev Called by b0x after a loan order is taken
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param taker The taker of the loan order
    /// @param gasUsed The initial used gas, collected in a modifier in b0x, for optional gas refunds
    /// @return Successful execution of the function
    function didTakeOrder(
        bytes32 loanOrderHash,
        address taker,
        uint gasUsed)
        public
        returns (bool);

    /// @dev Called by b0x after a position token is traded
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param trader The trader doing the trade
    /// @param tradeTokenAddress The token that was bought in the trade
    /// @param tradeTokenAmount The amount of token that was bought
    /// @param gasUsed The initial used gas, collected in a modifier in b0x, for optional gas refunds
    /// @return Successful execution of the function
    function didTradePosition(
        bytes32 loanOrderHash,
        address trader,
        address tradeTokenAddress,
        uint tradeTokenAmount,
        uint gasUsed)
        public
        returns (bool);

    /// @dev Called by b0x after interest should be paid to a lender
    /// @dev Assume the interest token has already been transfered to
    /// @dev this contract before this function is called.
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param trader The trader
    /// @param lender The lender
    /// @param interestTokenAddress The token that will be paid for interest
    /// @param amountOwed The amount interest to pay
    /// @param gasUsed The initial used gas, collected in a modifier in b0x, for optional gas refunds
    /// @return Successful execution of the function
    function didPayInterest(
        bytes32 loanOrderHash,
        address trader,
        address lender,
        address interestTokenAddress,
        uint amountOwed,
        uint gasUsed)
        public
        returns (bool);

    /// @dev Called by b0x after a borrower has deposited additional collateral
    /// @dev token for an open loan
    /// @param loanOrderHash A unique hash representing the loan order.
    /// @param borrower The borrower
    /// @param gasUsed The initial used gas, collected in a modifier in b0x, for optional gas refunds
    /// @return Successful execution of the function
    function didDepositCollateral(
        bytes32 loanOrderHash,
        address borrower,
        uint gasUsed)
        public
        returns (bool);

    /// @dev Called by b0x after a borrower has changed the collateral token
    /// @dev used for an open loan
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param borrower The borrower
    /// @param gasUsed The initial used gas, collected in a modifier in b0x, for optional gas refunds
    /// @return Successful execution of the function
    function didChangeCollateral(
        bytes32 loanOrderHash,
        address borrower,
        uint gasUsed)
        public
        returns (bool);

    /// @dev Called by b0x after a loan is closed
    /// @param loanOrderHash A unique hash representing the loan order.
    /// @param closer The user that closed the loan
    /// @param isLiquidation A boolean indicating if the loan was closed due to liquidation
    /// @param gasUsed The initial used gas, collected in a modifier in b0x, for optional gas refunds
    /// @return Successful execution of the function
    function didCloseLoan(
        bytes32 loanOrderHash,
        address closer,
        bool isLiquidation,
        uint gasUsed)
        public
        returns (bool);

    /// @dev Liquidates the position on-chain
    /// @param sourceTokenAddress The token being sold
    /// @param destTokenAddress The token being bought
    /// @param sourceTokenAmount The amount of token being sold
    /// @return The amount of destToken bought
    function doTrade(
        address sourceTokenAddress, // typically tradeToken
        address destTokenAddress,   // typically loanToken
        uint sourceTokenAmount)
        public
        returns (uint);

    /// @dev Verifies a position has fallen below margin maintenance
    /// @dev then liquidates the position on-chain
    /// @param sourceTokenAddress The token being sold
    /// @param destTokenAddress The token being bought
    /// @param collateralTokenAddress The collateral token from the loan
    /// @param sourceTokenAmount The amount of token being sold
    /// @param collateralTokenAmount The collateral token amount from the loan
    /// @param maintenanceMarginAmount The maintenance margin amount from the loan
    /// @return The amount of destToken bought
    function verifyAndDoTrade(
        address sourceTokenAddress, // typically tradeToken
        address destTokenAddress,   // typically loanToken
        address collateralTokenAddress,
        uint sourceTokenAmount,
        uint collateralTokenAmount,
        uint maintenanceMarginAmount)
        public
        returns (uint);

    /// @dev Liquidates collateral to cover loan losses
    /// @param collateralTokenAddress The collateral token
    /// @param loanTokenAddress The loan token
    /// @param collateralTokenAmountUsable The total amount of collateral usable to cover losses
    /// @param loanTokenAmountNeeded The amount of loan token needed to cover losses
    /// @return The amount of destToken bought
    function doTradeofCollateral(
        address collateralTokenAddress,
        address loanTokenAddress,
        uint collateralTokenAmountUsable,
        uint loanTokenAmountNeeded)
        public
        returns (uint, uint);

    /// @dev Checks if a position has fallen below margin
    /// @dev maintenance and should be liquidated
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param trader The address of the trader
    /// @param exposureTokenAddress The token at risk (typically the loan token)
    /// @param collateralTokenAddress The token used as collateral
    /// @param exposureTokenAmount The amount of token at risk
    /// @param collateralTokenAmount The amount of collateral token
    /// @param maintenanceMarginAmount The maintenance margin amount from the loan
    /// @return Returns True if the trade should be liquidated immediately
    function shouldLiquidate(
        bytes32 loanOrderHash,
        address trader,
        address exposureTokenAddress,
        address collateralTokenAddress,
        uint exposureTokenAmount,
        uint collateralTokenAmount,
        uint maintenanceMarginAmount)
        public
        view
        returns (bool);

    /// @dev Gets the trade price of the ERC-20 token pair
    /// @param sourceTokenAddress Token being sold
    /// @param destTokenAddress Token being bought
    /// @return The trade rate
    function getTradeRate(
        address sourceTokenAddress,
        address destTokenAddress)
        public
        view 
        returns (uint);

    /// @dev Returns the current margin amount for this particular loan/position
    /// @param exposureTokenAddress The token at risk (typically the loan token)
    /// @param collateralTokenAddress The token used as collateral
    /// @param exposureTokenAmount The amount of token at risk
    /// @param collateralTokenAmount The amount of collateral token
    /// @return The current margin amount
    function getCurrentMargin(
        address exposureTokenAddress,
        address collateralTokenAddress,
        uint exposureTokenAmount,
        uint collateralTokenAmount)
        public
        view
        returns (uint);

    /// @dev Checks if the ERC20 token pair is supported by the oracle
    /// @param sourceTokenAddress Token being sold
    /// @param destTokenAddress Token being bought
    /// @return True if price discovery and trading is supported
    function isTradeSupported(
        address sourceTokenAddress,
        address destTokenAddress)
        public
        view 
        returns (bool);
}
