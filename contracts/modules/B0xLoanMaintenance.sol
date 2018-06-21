
pragma solidity ^0.4.24; // solhint-disable-line compiler-fixed

import "openzeppelin-solidity/contracts/math/Math.sol";

import "./B0xStorage.sol";
import "./B0xProxyContracts.sol";
import "../shared/InternalFunctions.sol";

import "../B0xVault.sol";
import "../oracle/OracleInterface.sol";


contract B0xLoanMaintenance is B0xStorage, Proxiable, InternalFunctions {
    using SafeMath for uint256;

    constructor() public {}

    function initialize(
        address _target)
        public
        onlyOwner
    {
        targets[bytes4(keccak256("depositCollateral(bytes32,address,uint256)"))] = _target;
        targets[bytes4(keccak256("withdrawExcessCollateral(bytes32,address,uint256)"))] = _target;
        targets[bytes4(keccak256("changeCollateral(bytes32,address)"))] = _target;
        targets[bytes4(keccak256("withdrawProfit(bytes32)"))] = _target;
        targets[bytes4(keccak256("getProfitOrLoss(bytes32,address)"))] = _target;
    }

    /// @dev Allows the trader to increase the collateral for a loan.
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param collateralTokenFilled The address of the collateral token used.
    /// @return depositAmount The amount of additional collateral token to deposit.
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
            revert("B0xLoanHealth::depositCollateral: loanOrder.maker == address(0)");
        }

        if (block.timestamp >= loanOrder.expirationUnixTimestampSec) {
            revert("B0xLoanHealth::depositCollateral: block.timestamp >= loanOrder.expirationUnixTimestampSec");
        }

        LoanPosition storage loanPosition = loanPositions[loanOrderHash][msg.sender];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            revert("B0xLoanHealth::depositCollateral: loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active");
        }

        if (collateralTokenFilled != loanPosition.collateralTokenAddressFilled) {
            revert("B0xLoanHealth::depositCollateral: collateralTokenFilled != loanPosition.collateralTokenAddressFilled");
        }

        if (! B0xVault(vaultContract).depositToken(
            collateralTokenFilled,
            msg.sender,
            depositAmount
        )) {
            revert("B0xLoanHealth::depositCollateral: B0xVault.depositToken collateral failed");
        }

        loanPosition.collateralTokenAmountFilled = loanPosition.collateralTokenAmountFilled.add(depositAmount);

        if (! OracleInterface(loanOrder.oracleAddress).didDepositCollateral(
            loanOrder.loanOrderHash,
            msg.sender,
            gasUsed // initial used gas, collected in modifier
        )) {
            revert("B0xLoanHealth::depositCollateral: OracleInterface.didDepositCollateral failed");
        }

        return true;
    }

    /// @dev Allows the trader to withdraw excess collateral for a loan.
    /// @dev Excess collateral is any amount above the initial margin.
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param collateralTokenFilled The address of the collateral token used.
    /// @return withdrawAmount The amount of excess collateral token to withdraw. The actual amount withdrawn will be less if there's less excess.
    function withdrawExcessCollateral(
        bytes32 loanOrderHash,
        address collateralTokenFilled,
        uint withdrawAmount)
        external
        nonReentrant
        tracksGas
        returns (uint excessCollateral)
    {
        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.maker == address(0)) {
            revert("B0xLoanHealth::withdrawExcessCollateral: loanOrder.maker == address(0)");
        }

        LoanPosition storage loanPosition = loanPositions[loanOrderHash][msg.sender];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            revert("B0xLoanHealth::withdrawExcessCollateral: loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active");
        }

        if (collateralTokenFilled != loanPosition.collateralTokenAddressFilled) {
            revert("B0xLoanHealth::withdrawExcessCollateral: collateralTokenFilled != loanPosition.collateralTokenAddressFilled");
        }

        // the new collateral amount must be enough to satify the initial margin requirement of the loan
        uint initialCollateralTokenAmount = _getInitialCollateralRequired(
            loanOrder.loanTokenAddress,
            loanPosition.collateralTokenAddressFilled,
            loanOrder.oracleAddress,
            loanPosition.loanTokenAmountFilled,
            loanOrder.initialMarginAmount
        );
        if (initialCollateralTokenAmount == 0 || initialCollateralTokenAmount >= loanPosition.collateralTokenAmountFilled) {
            revert("B0xLoanHealth::withdrawExcessCollateral: initialCollateralTokenAmount == 0 || initialCollateralTokenAmount >= loanPosition.collateralTokenAmountFilled");
        }

        excessCollateral = Math.min256(withdrawAmount, loanPosition.collateralTokenAmountFilled-initialCollateralTokenAmount);

        // transfer excess collateral to trader
        if (! B0xVault(vaultContract).withdrawToken(
            loanPosition.collateralTokenAddressFilled,
            msg.sender,
            excessCollateral
        )) {
            revert("B0xLoanHealth::withdrawExcessCollateral: B0xVault.withdrawToken collateral failed");
        }

        // update stored collateral amount
        loanPosition.collateralTokenAmountFilled = loanPosition.collateralTokenAmountFilled.sub(excessCollateral);

        if (! OracleInterface(loanOrder.oracleAddress).didWithdrawCollateral(
            loanOrder.loanOrderHash,
            msg.sender,
            gasUsed // initial used gas, collected in modifier
        )) {
            revert("B0xLoanHealth::withdrawExcessCollateral: OracleInterface.didWithdrawCollateral failed");
        }
    }

    /// @dev Allows the trader to change the collateral token being used for a loan.
    /// @dev This function will transfer in the initial margin requirement of the new token and the old token will be refunded to the trader.
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param collateralTokenFilled The address of the collateral token used.
    /// @return True on success
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
            revert("B0xLoanHealth::changeCollateral: loanOrder.maker == address(0)");
        }

        LoanPosition storage loanPosition = loanPositions[loanOrderHash][msg.sender];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            revert("B0xLoanHealth::changeCollateral: loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active");
        }

        if (collateralTokenFilled == address(0) || collateralTokenFilled == loanPosition.collateralTokenAddressFilled) {
            revert("B0xLoanHealth::changeCollateral: collateralTokenFilled == address(0) || collateralTokenFilled == loanPosition.collateralTokenAddressFilled");
        }

        if (block.timestamp >= loanOrder.expirationUnixTimestampSec) {
            revert("B0xLoanHealth::changeCollateral: block.timestamp >= loanOrder.expirationUnixTimestampSec");
        }

        // the new collateral amount must be enough to satify the initial margin requirement of the loan
        uint collateralTokenAmountFilled = _getInitialCollateralRequired(
            loanOrder.loanTokenAddress,
            collateralTokenFilled,
            loanOrder.oracleAddress,
            loanPosition.loanTokenAmountFilled,
            loanOrder.initialMarginAmount
        );
        if (collateralTokenAmountFilled == 0) {
            revert("B0xLoanHealth::changeCollateral: collateralTokenAmountFilled == 0");
        }

        // transfer the new collateral token from the trader to the vault
        if (! B0xVault(vaultContract).depositToken(
            collateralTokenFilled,
            msg.sender,
            collateralTokenAmountFilled
        )) {
            revert("B0xLoanHealth::changeCollateral: B0xVault.depositToken new collateral failed");
        }

        // transfer the old collateral token from the vault to the trader
        if (! B0xVault(vaultContract).withdrawToken(
            loanPosition.collateralTokenAddressFilled,
            msg.sender,
            loanPosition.collateralTokenAmountFilled
        )) {
            revert("B0xLoanHealth::changeCollateral: B0xVault.withdrawToken old collateral failed");
        }

        loanPosition.collateralTokenAddressFilled = collateralTokenFilled;
        loanPosition.collateralTokenAmountFilled = collateralTokenAmountFilled;

        if (! OracleInterface(loanOrder.oracleAddress).didChangeCollateral(
            loanOrder.loanOrderHash,
            msg.sender,
            gasUsed // initial used gas, collected in modifier
        )) {
            revert("B0xLoanHealth::changeCollateral: OracleInterface.didChangeCollateral failed");
        }

        return true;
    }

    /// @dev Allows the trader to withdraw their profits, if any.
    /// @dev Profits are paid out from the current positionToken.
    /// @param loanOrderHash A unique hash representing the loan order
    /// @return profitAmount The amount of profit withdrawn denominated in positionToken
    function withdrawProfit(
        bytes32 loanOrderHash)
        external
        nonReentrant
        tracksGas
        returns (uint profitAmount)
    {
        LoanOrder memory loanOrder = orders[loanOrderHash];
        LoanPosition storage loanPosition = loanPositions[loanOrderHash][msg.sender];

        bool isProfit;
        (isProfit, profitAmount,) = _getProfitOrLoss(
            loanOrder,
            loanPosition);
        if (profitAmount == 0 || !isProfit) {
            revert("B0xLoanHealth::withdrawProfit: profitAmount == 0 || !isProfit");
        }

        // transfer profit to the trader
        if (! B0xVault(vaultContract).withdrawToken(
            loanPosition.positionTokenAddressFilled,
            msg.sender,
            profitAmount
        )) {
            revert("B0xLoanHealth::withdrawProfit: B0xVault.withdrawToken loan failed");
        }

        // deduct profit from positionToken balance
        loanPosition.positionTokenAmountFilled = loanPosition.positionTokenAmountFilled.sub(profitAmount);

        if (! OracleInterface(loanOrder.oracleAddress).didWithdrawProfit(
            loanOrder.loanOrderHash,
            msg.sender,
            profitAmount,
            gasUsed // initial used gas, collected in modifier
        )) {
            revert("B0xLoanHealth::withdrawProfit: OracleInterface.didWithdrawProfit failed");
        }

        emit LogWithdrawProfit(
            loanOrder.loanOrderHash,
            msg.sender,
            profitAmount,
            loanPosition.positionTokenAmountFilled
        );

        return profitAmount;
    }

    /*
    * Constant public functions
    */
    /// @dev Get the current profit/loss data of a position
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param trader The trader of the position
    /// @return isProfit False it there's a loss, True otherwise
    /// @return profitOrLoss The amount of profit or amount of loss (denominated in positionToken)
    /// @return positionTokenAddress The position token current filled, which could be the same as the loanToken
    function getProfitOrLoss(
        bytes32 loanOrderHash,
        address trader)
        public
        view
        returns (bool isProfit, uint profitOrLoss, address positionTokenAddress)
    {
        LoanOrder memory loanOrder = orders[loanOrderHash];
        LoanPosition memory loanPosition = loanPositions[loanOrderHash][trader];

        return _getProfitOrLoss(
            loanOrder,
            loanPosition);
    }

    /*
    * Constant Internal functions
    */
    function _getProfitOrLoss(
        LoanOrder loanOrder,
        LoanPosition loanPosition)
        internal
        view
        returns (bool isProfit, uint profitOrLoss, address positionTokenAddress)
    {
        if (loanOrder.maker == address(0)) {
            return;
        }

        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            return;
        }

        (isProfit, profitOrLoss) = OracleInterface(loanOrder.oracleAddress).getProfitOrLoss(
            loanPosition.positionTokenAddressFilled,
            loanOrder.loanTokenAddress,
            loanPosition.positionTokenAmountFilled,
            loanPosition.loanTokenAmountFilled);

        positionTokenAddress = loanPosition.positionTokenAddressFilled;
    }

}
