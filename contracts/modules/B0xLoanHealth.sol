
pragma solidity ^0.4.23;

import 'openzeppelin-solidity/contracts/math/Math.sol';

import './B0xStorage.sol';
import './B0xProxyContracts.sol';
import '../shared/InternalFunctions.sol';

import '../B0xVault.sol';
import '../oracle/Oracle_Interface.sol';

contract B0xLoanHealth is B0xStorage, Proxiable, InternalFunctions {
    using SafeMath for uint256;

    constructor() public {}
    
    function initialize(
        address _target)
        public
        onlyOwner
    {
        targets[bytes4(keccak256("payInterest(bytes32,address)"))] = _target;
        targets[bytes4(keccak256("depositCollateral(bytes32,address,uint256)"))] = _target;
        targets[bytes4(keccak256("withdrawExcessCollateral(bytes32,address,uint256)"))] = _target;
        targets[bytes4(keccak256("changeCollateral(bytes32,address)"))] = _target;
        targets[bytes4(keccak256("withdrawProfit(bytes32)"))] = _target;
        targets[bytes4(keccak256("liquidatePosition(bytes32,address)"))] = _target;
        targets[bytes4(keccak256("closeLoan(bytes32)"))] = _target;
        targets[bytes4(keccak256("getProfitOrLoss(bytes32,address)"))] = _target;
        targets[bytes4(keccak256("shouldLiquidate(bytes32,address)"))] = _target;
        targets[bytes4(keccak256("getMarginLevels(bytes32,address)"))] = _target;
        targets[bytes4(keccak256("getInterest(bytes32,address)"))] = _target;
    }

    /// @dev Pays the lender of a loan the total amount of interest accrued for a loan.
    /// @dev Note that this function can be safely called by anyone.
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param trader The address of the trader/borrower of a loan.
    /// @return The amount of interest paid out.
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
            return intOrRevert(0,51); // revert("B0xLoanHealth::payInterest: loanOrder.maker == address(0)");
        }

        // can still pay any unpaid accured interest after a loan has closed
        LoanPosition memory loanPosition = loanPositions[loanOrderHash][trader];
        if (loanPosition.loanTokenAmountFilled == 0) {
            return intOrRevert(0,57); // revert("B0xLoanHealth::payInterest: loanPosition.loanTokenAmountFilled == 0");
        }
        
        uint amountPaid = _payInterest(
            loanOrder,
            loanPosition
        );

        return amountPaid;
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
            return boolOrRevert(false,83); // revert("B0xLoanHealth::depositCollateral: loanOrder.maker == address(0)");
        }

        if (block.timestamp >= loanOrder.expirationUnixTimestampSec) {
            return boolOrRevert(false,87); // revert("B0xLoanHealth::depositCollateral: block.timestamp >= loanOrder.expirationUnixTimestampSec");
        }

        LoanPosition storage loanPosition = loanPositions[loanOrderHash][msg.sender];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            return boolOrRevert(false,92); // revert("B0xLoanHealth::depositCollateral: loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active");
        }

        if (collateralTokenFilled != loanPosition.collateralTokenAddressFilled) {
            return boolOrRevert(false,96); // revert("B0xLoanHealth::depositCollateral: collateralTokenFilled != loanPosition.collateralTokenAddressFilled");
        }

        if (! B0xVault(VAULT_CONTRACT).depositToken(
            collateralTokenFilled,
            msg.sender,
            depositAmount
        )) {
            return boolOrRevert(false,104); // revert("B0xLoanHealth::depositCollateral: B0xVault.depositToken collateral failed");
        }

        loanPosition.collateralTokenAmountFilled = loanPosition.collateralTokenAmountFilled.add(depositAmount);

        if (! Oracle_Interface(loanOrder.oracleAddress).didDepositCollateral(
            loanOrder.loanOrderHash,
            msg.sender,
            gasUsed // initial used gas, collected in modifier
        )) {
            return boolOrRevert(false,114); // revert("B0xLoanHealth::depositCollateral: Oracle_Interface.didDepositCollateral failed");
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
            return intOrRevert(0,136); // revert("B0xLoanHealth::withdrawExcessCollateral: loanOrder.maker == address(0)");
        }

        LoanPosition storage loanPosition = loanPositions[loanOrderHash][msg.sender];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            return intOrRevert(0,141); // revert("B0xLoanHealth::withdrawExcessCollateral: loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active");
        }

        if (collateralTokenFilled != loanPosition.collateralTokenAddressFilled) {
            return intOrRevert(0,145); // revert("B0xLoanHealth::withdrawExcessCollateral: collateralTokenFilled != loanPosition.collateralTokenAddressFilled");
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
            return intOrRevert(0,157); // revert("B0xLoanHealth::withdrawExcessCollateral: initialCollateralTokenAmount == 0 || initialCollateralTokenAmount >= loanPosition.collateralTokenAmountFilled");
        }

        excessCollateral = Math.min256(withdrawAmount, loanPosition.collateralTokenAmountFilled-initialCollateralTokenAmount);

        // transfer excess collateral to trader
        if (! B0xVault(VAULT_CONTRACT).withdrawToken(
            loanPosition.collateralTokenAddressFilled,
            msg.sender,
            excessCollateral
        )) {
            return intOrRevert(0,168); // revert("B0xLoanHealth::withdrawExcessCollateral: B0xVault.withdrawToken collateral failed");
        }

        // update stored collateral amount
        loanPosition.collateralTokenAmountFilled = loanPosition.collateralTokenAmountFilled.sub(excessCollateral);

        if (! Oracle_Interface(loanOrder.oracleAddress).didWithdrawCollateral(
            loanOrder.loanOrderHash,
            msg.sender,
            gasUsed // initial used gas, collected in modifier
        )) {
            return intOrRevert(0,179); // revert("B0xLoanHealth::withdrawExcessCollateral: Oracle_Interface.didWithdrawCollateral failed");
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
            return boolOrRevert(false,198); // revert("B0xLoanHealth::changeCollateral: loanOrder.maker == address(0)");
        }

        LoanPosition storage loanPosition = loanPositions[loanOrderHash][msg.sender];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            return boolOrRevert(false,203); // revert("B0xLoanHealth::changeCollateral: loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active");
        }

        if (collateralTokenFilled == address(0) || collateralTokenFilled == loanPosition.collateralTokenAddressFilled) {
            return boolOrRevert(false,207); // revert("B0xLoanHealth::changeCollateral: collateralTokenFilled == address(0) || collateralTokenFilled == loanPosition.collateralTokenAddressFilled");
        }

        if (block.timestamp >= loanOrder.expirationUnixTimestampSec) {
            return boolOrRevert(false,211); // revert("B0xLoanHealth::changeCollateral: block.timestamp >= loanOrder.expirationUnixTimestampSec");
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
            return boolOrRevert(false,223); // revert("B0xLoanHealth::changeCollateral: collateralTokenAmountFilled == 0");
        }

        // transfer the new collateral token from the trader to the vault
        if (! B0xVault(VAULT_CONTRACT).depositToken(
            collateralTokenFilled,
            msg.sender,
            collateralTokenAmountFilled
        )) {
            return boolOrRevert(false,232); // revert("B0xLoanHealth::changeCollateral: B0xVault.depositToken new collateral failed");
        }

        // transfer the old collateral token from the vault to the trader
        if (! B0xVault(VAULT_CONTRACT).withdrawToken(
            loanPosition.collateralTokenAddressFilled,
            msg.sender,
            loanPosition.collateralTokenAmountFilled
        )) {
            return boolOrRevert(false,241); // revert("B0xLoanHealth::changeCollateral: B0xVault.withdrawToken old collateral failed");
        }

        loanPosition.collateralTokenAddressFilled = collateralTokenFilled;
        loanPosition.collateralTokenAmountFilled = collateralTokenAmountFilled;

        if (! Oracle_Interface(loanOrder.oracleAddress).didChangeCollateral(
            loanOrder.loanOrderHash,
            msg.sender,
            gasUsed // initial used gas, collected in modifier
        )) {
            return boolOrRevert(false,252); // revert("B0xLoanHealth::changeCollateral: Oracle_Interface.didChangeCollateral failed");
        }

        return true;
    }

    /// @dev Allows the trader to withdraw their profits, if any.
    /// @dev Profits are paid out from the current positionToken.
    /// @param loanOrderHash A unique hash representing the loan order
    /// @return profitAmount The amount of profit withdrawn
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
        (isProfit, profitAmount, ,) = _getProfitOrLoss(
            loanOrder,
            loanPosition);
        if (profitAmount == 0 || !isProfit) {
            return intOrRevert(0,277); // revert("B0xLoanHealth::withdrawProfit: profitAmount == 0 || !isProfit");
        }

        // transfer profit to the trader
        if (! B0xVault(VAULT_CONTRACT).withdrawToken(
            loanPosition.positionTokenAddressFilled,
            msg.sender,
            profitAmount
        )) {
            return intOrRevert(0,286); // revert("B0xLoanHealth::withdrawProfit: B0xVault.withdrawToken loan failed");
        }

        // deduct profit from positionToken balance
        loanPosition.positionTokenAmountFilled = loanPosition.positionTokenAmountFilled.sub(profitAmount);

        if (! Oracle_Interface(loanOrder.oracleAddress).didWithdrawProfit(
            loanOrder.loanOrderHash,
            msg.sender,
            profitAmount,
            gasUsed // initial used gas, collected in modifier
        )) {
            return intOrRevert(0,298); // revert("B0xLoanHealth::withdrawProfit: Oracle_Interface.didWithdrawProfit failed");
        }

        emit LogWithdrawProfit(
            loanOrder.loanOrderHash,
            msg.sender,
            profitAmount,
            loanPosition.positionTokenAmountFilled
        );

        return profitAmount;
    }

    /// @dev Checks that a position meets the conditions for liquidation, then closes the position and loan.
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param trader The trader of the position
    /// @return True on success
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
            return boolOrRevert(false,325); // revert("B0xLoanHealth::liquidatePosition: trader == msg.sender");
        }

        LoanPosition storage loanPosition = loanPositions[loanOrderHash][trader];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            return boolOrRevert(false,330); // revert("B0xLoanHealth::liquidatePosition: loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active");
        }

        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.maker == address(0)) {
            return boolOrRevert(false,335); // revert("B0xLoanHealth::liquidatePosition: loanOrder.maker == address(0)");
        }

        if (DEBUG_MODE) {
            _emitMarginLog(loanOrder, loanPosition);
        }

        // If the position token is not the loan token, then we need to buy back the loan token 
        // prior to closing the loan. Liquidation checks will be run in _tradePositionWithOracle.
        if (loanPosition.positionTokenAddressFilled != loanOrder.loanTokenAddress) {
            uint loanTokenAmount = _tradePositionWithOracle(
                loanOrder,
                loanPosition,
                loanOrder.loanTokenAddress, // tradeTokenAddress
                true // isLiquidation
            );

            if (loanTokenAmount == 0) {
                return boolOrRevert(false,353); // revert("B0xLoanHealth::liquidatePosition: loanTokenAmount == 0");
            }

            // the loan token becomes the new position token
            loanPosition.positionTokenAddressFilled = loanOrder.loanTokenAddress;
            loanPosition.positionTokenAmountFilled = loanTokenAmount;
        } else {
            // verify liquidation checks before proceeding to close the loan
            if (! Oracle_Interface(loanOrder.oracleAddress).shouldLiquidate(
                    loanOrderHash,
                    trader,
                    loanOrder.loanTokenAddress,
                    loanPosition.positionTokenAddressFilled,
                    loanPosition.collateralTokenAddressFilled,
                    loanPosition.loanTokenAmountFilled,
                    loanPosition.positionTokenAmountFilled,
                    loanPosition.collateralTokenAmountFilled,
                    loanOrder.maintenanceMarginAmount)) {
                return boolOrRevert(false,371); // revert("B0xLoanHealth::liquidatePosition: liquidation not allowed");
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

    /// @dev Called by the trader to close their loan early.
    /// @param loanOrderHash A unique hash representing the loan order
    /// @return True on success
    function closeLoan(
        bytes32 loanOrderHash)
        external
        nonReentrant
        tracksGas
        returns (bool)
    {
        LoanPosition storage loanPosition = loanPositions[loanOrderHash][msg.sender];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            return boolOrRevert(false,397); // revert("B0xLoanHealth::closeLoan: loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active");
        }

        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.maker == address(0)) {
            return boolOrRevert(false,402); // revert("B0xLoanHealth::closeLoan: loanOrder.maker == address(0)");
        }

        // If the position token is not the loan token, then we need to buy back the loan token prior to closing the loan.
        if (loanPosition.positionTokenAddressFilled != loanOrder.loanTokenAddress) {
            uint loanTokenAmount = _tradePositionWithOracle(
                loanOrder,
                loanPosition,
                loanOrder.loanTokenAddress, // tradeTokenAddress
                false // isLiquidation
            );

            if (loanTokenAmount == 0) {
                return boolOrRevert(false,415); // revert("B0xLoanHealth::closeLoan: loanTokenAmount == 0");
            }

            // the loan token becomes the new position token
            loanPosition.positionTokenAddressFilled = loanOrder.loanTokenAddress;
            loanPosition.positionTokenAmountFilled = loanTokenAmount;
        }

        return _closeLoan(
            loanOrder,
            loanPosition, // needs to be storage
            false, // isLiquidation
            gasUsed // initial used gas, collected in modifier
        );
    }

    /*
    * Constant public functions
    */

    /// @dev Get the current profit/loss data of a position
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param trader The trader of the position
    /// @return isProfit False it there's a loss, True otherwise
    /// @return profitOrLoss The amount of profit or amount of loss (denominated in loanToken)
    /// @return positionToLoanAmount The value of the position token in loan token units
    /// @return positionToLoanRate The exchange rate from position token to loan token
    function getProfitOrLoss(
        bytes32 loanOrderHash,
        address trader)
        public
        view
        returns (bool isProfit, uint profitOrLoss, uint positionToLoanAmount, uint positionToLoanRate)
    {
        LoanOrder memory loanOrder = orders[loanOrderHash];
        LoanPosition memory loanPosition = loanPositions[loanOrderHash][trader];

        return _getProfitOrLoss(
            loanOrder,
            loanPosition);
    }

    /// @dev Checks the conditions for liquidation with the oracle
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param trader The trader of the position
    /// @return True if liquidation should occur, false otherwise
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

        /*if (DEBUG_MODE) {
            _emitMarginLog(loanOrder, loanPosition);
        }*/

        return Oracle_Interface(loanOrder.oracleAddress).shouldLiquidate(
            loanOrderHash,
            trader,
            loanOrder.loanTokenAddress,
            loanPosition.positionTokenAddressFilled,
            loanPosition.collateralTokenAddressFilled,
            loanPosition.loanTokenAmountFilled,
            loanPosition.positionTokenAmountFilled,
            loanPosition.collateralTokenAmountFilled,
            loanOrder.maintenanceMarginAmount);
    }

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

        return (_getMarginLevels(
            loanOrder,
            loanPosition));
    }

    /// @dev Gets current interest data for the loan
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param trader The trader of the position
    /// @return lender The lender in this loan
    /// @return interestTokenAddress The interset token used in this loan
    /// @return interestTotalAccrued The total amount of interest that has been earned so far
    /// @return interestPaidSoFar The amount of earned interest that has been withdrawn
    function getInterest(
        bytes32 loanOrderHash,
        address trader)
        public
        view
        returns (address lender, address interestTokenAddress, uint interestTotalAccrued, uint interestPaidSoFar) {

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
            interestData.interestTotalAccrued,
            interestData.interestPaidSoFar
        );
    }


    /*
    * Constant Internal functions
    */

    function _getProfitOrLoss(
        LoanOrder loanOrder,
        LoanPosition loanPosition)
        internal
        view
        returns (bool isProfit, uint profitOrLoss, uint positionToLoanAmount, uint positionToLoanRate)
    {
        if (loanOrder.maker == address(0)) {
            return;
        }

        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            return;
        }

        return Oracle_Interface(loanOrder.oracleAddress).getProfitOrLoss(
            loanPosition.positionTokenAddressFilled,
            loanOrder.loanTokenAddress,
            loanPosition.positionTokenAmountFilled,
            loanPosition.loanTokenAmountFilled);
    }

    /*
    * Internal functions
    */

    function _payInterest(
        LoanOrder loanOrder,
        LoanPosition loanPosition)
        internal
        returns (uint amountPaid)
    {
        InterestData memory interestData = _getInterest(
            loanOrder,
            loanPosition);

        if (interestData.interestPaidSoFar >= interestData.interestTotalAccrued) {
            amountPaid = 0;
        } else {
            amountPaid = interestData.interestTotalAccrued.sub(interestData.interestPaidSoFar);
            interestPaid[loanOrder.loanOrderHash][loanPosition.trader] = interestData.interestTotalAccrued; // since this function will pay all remaining accured interest
            
            // send the interest to the oracle for further processing
            if (! B0xVault(VAULT_CONTRACT).withdrawToken(
                interestData.interestTokenAddress,
                orders[loanOrder.loanOrderHash].oracleAddress,
                amountPaid
            )) {
                return intOrRevert(0,616); // revert("B0xLoanHealth::_payInterest: B0xVault.withdrawToken failed");
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
                return intOrRevert(0,628); // revert("B0xLoanHealth::_payInterest: Oracle_Interface.didPayInterest failed");
            }
        }

        emit LogPayInterest(
            loanOrder.loanOrderHash,
            loanPosition.lender,
            loanPosition.trader,
            amountPaid,
            interestData.interestTotalAccrued
        );

        return amountPaid;
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
        // pay any remaining interest to the lender
        _payInterest(
            loanOrder,
            loanPosition
        );

        uint totalInterestToRefund = _getTotalInterestRequired(
            loanOrder.loanTokenAmount,
            loanPosition.loanTokenAmountFilled,
            loanOrder.interestAmount,
            loanOrder.expirationUnixTimestampSec,
            loanPosition.loanStartUnixTimestampSec)
            .sub(interestPaid[loanOrder.loanOrderHash][loanPosition.trader]);
        
	    // refund any unused interest to the trader
        if (totalInterestToRefund > 0) {
            if (! B0xVault(VAULT_CONTRACT).withdrawToken(
                loanOrder.interestTokenAddress,
                loanPosition.trader,
                totalInterestToRefund
            )) {
                return boolOrRevert(false,673); // revert("B0xLoanHealth::_closeLoan: B0xVault.withdrawToken interest failed");
            }
        }

        // check if lender is being made whole, and if not attempt to sell collateral token to cover losses
        if (loanPosition.positionTokenAmountFilled < loanPosition.loanTokenAmountFilled) {
            // Send all of the collateral token to the oracle to sell to cover loan token losses.
            // Unused collateral should be returned to the vault by the oracle.
            if (! B0xVault(VAULT_CONTRACT).withdrawToken(
                loanPosition.collateralTokenAddressFilled,
                loanOrder.oracleAddress,
                loanPosition.collateralTokenAmountFilled
            )) {
                return boolOrRevert(false,686); // revert("B0xLoanHealth::_closeLoan: B0xVault.withdrawToken (cover losses) failed");
            }

            uint loanTokenAmountCovered;
            uint collateralTokenAmountUsed;
            (loanTokenAmountCovered, collateralTokenAmountUsed) = Oracle_Interface(loanOrder.oracleAddress).doTradeofCollateral(
                loanPosition.collateralTokenAddressFilled,
                loanOrder.loanTokenAddress,
                loanPosition.collateralTokenAmountFilled,
                loanPosition.loanTokenAmountFilled.sub(loanPosition.positionTokenAmountFilled));
            
            loanPosition.positionTokenAmountFilled = loanPosition.positionTokenAmountFilled.add(loanTokenAmountCovered);
            loanPosition.collateralTokenAmountFilled = loanPosition.collateralTokenAmountFilled.sub(collateralTokenAmountUsed);
        }

        // send remaining collateral token back to the trader
        if (! B0xVault(VAULT_CONTRACT).withdrawToken(
            loanPosition.collateralTokenAddressFilled,
            loanPosition.trader,
            loanPosition.collateralTokenAmountFilled
        )) {
            return boolOrRevert(false,707); // revert("B0xLoanHealth::_closeLoan: B0xVault.withdrawToken collateral failed");
        }

        // send remaining loan token back to the lender
        if (! B0xVault(VAULT_CONTRACT).withdrawToken(
            loanPosition.positionTokenAddressFilled, // same as loanTokenAddress
            loanPosition.lender,
            loanPosition.positionTokenAmountFilled
        )) {
            return boolOrRevert(false,716); // revert("B0xLoanHealth::_closeLoan: B0xVault.withdrawToken loan failed");
        }

        if (! Oracle_Interface(loanOrder.oracleAddress).didCloseLoan(
            loanOrder.loanOrderHash,
            msg.sender,
            isLiquidation,
            gasUsed
        )) {
            return boolOrRevert(false,725); // revert("B0xLoanHealth::_closeLoan: Oracle_Interface.didCloseLoan failed");
        }

        // set this loan to inactive
        loanPosition.active = false;
        
        // replace loan in list with last loan in array
        loanList[loanPosition.index] = loanList[loanList.length - 1];
        
        // update the position of this replacement
        loanPositions[loanList[loanPosition.index].loanOrderHash][loanList[loanPosition.index].trader].index = loanPosition.index;
        
        // trim array
        loanList.length--;

        emit LogLoanClosed(
            loanPosition.lender,
            loanPosition.trader,
            isLiquidation,
            loanOrder.loanOrderHash
        );

        return true;
    }
}
