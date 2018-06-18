
pragma solidity ^0.4.24; // solhint-disable-line compiler-fixed

import "openzeppelin-solidity/contracts/math/Math.sol";

import "./B0xStorage.sol";
import "./B0xProxyContracts.sol";
import "../shared/InternalFunctions.sol";

import "../B0xVault.sol";
import "../oracle/OracleInterface.sol";


contract B0xLoanHealth is B0xStorage, Proxiable, InternalFunctions {
    using SafeMath for uint256;

    constructor() public {}

    function initialize(
        address _target)
        public
        onlyOwner
    {
        targets[bytes4(keccak256("payInterest(bytes32,address)"))] = _target;
        targets[bytes4(keccak256("liquidatePosition(bytes32,address)"))] = _target;
        targets[bytes4(keccak256("closeLoan(bytes32)"))] = _target;
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
            return intOrRevert(0,47); // revert("B0xLoanHealth::payInterest: loanOrder.maker == address(0)");
        }

        // can still pay any unpaid accured interest after a loan has closed
        LoanPosition memory loanPosition = loanPositions[loanOrderHash][trader];
        if (loanPosition.loanTokenAmountFilled == 0) {
            return intOrRevert(0,53); // revert("B0xLoanHealth::payInterest: loanPosition.loanTokenAmountFilled == 0");
        }
        
        uint amountPaid = _payInterest(
            loanOrder,
            loanPosition
        );

        return amountPaid;
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
        if (trader == msg.sender) {
            return _closeLoan(
                loanOrderHash,
                gasUsed // initial used gas, collected in modifier
            );
        }

        LoanPosition storage loanPosition = loanPositions[loanOrderHash][trader];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            return boolOrRevert(false,85); // revert("B0xLoanHealth::liquidatePosition: loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active");
        }

        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.maker == address(0)) {
            return boolOrRevert(false,90); // revert("B0xLoanHealth::liquidatePosition: loanOrder.maker == address(0)");
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
                !DEBUG_MODE, // isLiquidation
                false // isManual
            );

            if (loanTokenAmount == 0) {
                return boolOrRevert(false,109); // revert("B0xLoanHealth::liquidatePosition: loanTokenAmount == 0");
            }

            // the loan token becomes the new position token
            loanPosition.positionTokenAddressFilled = loanOrder.loanTokenAddress;
            loanPosition.positionTokenAmountFilled = loanTokenAmount;
        } else {
            // verify liquidation checks before proceeding to close the loan
            if (!DEBUG_MODE) {
                if (! OracleInterface(loanOrder.oracleAddress).shouldLiquidate(
                        loanOrderHash,
                        trader,
                        loanOrder.loanTokenAddress,
                        loanPosition.positionTokenAddressFilled,
                        loanPosition.collateralTokenAddressFilled,
                        loanPosition.loanTokenAmountFilled,
                        loanPosition.positionTokenAmountFilled,
                        loanPosition.collateralTokenAmountFilled,
                        loanOrder.maintenanceMarginAmount)) {
                    return boolOrRevert(false,128); // revert("B0xLoanHealth::liquidatePosition: liquidation not allowed");
                }
            }
        }

        require(_finalizeLoan(
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
        return _closeLoan(
            loanOrderHash,
            gasUsed // initial used gas, collected in modifier
        );
    }

    /*
    * Constant public functions
    */
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

        return OracleInterface(loanOrder.oracleAddress).shouldLiquidate(
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
            if (! B0xVault(vaultContract).withdrawToken(
                interestData.interestTokenAddress,
                orders[loanOrder.loanOrderHash].oracleAddress,
                amountPaid
            )) {
                return intOrRevert(0,293); // revert("B0xLoanHealth::_payInterest: B0xVault.withdrawToken failed");
            }

            // calls the oracle to signal processing of the interest (ie: paying the lender, retaining fees)
            if (! OracleInterface(loanOrder.oracleAddress).didPayInterest(
                loanOrder.loanOrderHash,
                loanPosition.trader,
                loanPosition.lender,
                interestData.interestTokenAddress,
                amountPaid,
                gasUsed // initial used gas, collected in modifier
            )) {
                return intOrRevert(0,305); // revert("B0xLoanHealth::_payInterest: OracleInterface.didPayInterest failed");
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

    function _closeLoan(
        bytes32 loanOrderHash,
        uint gasUsed)
        internal
        returns (bool)
    {
        LoanPosition storage loanPosition = loanPositions[loanOrderHash][msg.sender];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            return boolOrRevert(false,328); // revert("B0xLoanHealth::_closeLoan: loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active");
        }

        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.maker == address(0)) {
            return boolOrRevert(false,333); // revert("B0xLoanHealth::_closeLoan: loanOrder.maker == address(0)");
        }

        // If the position token is not the loan token, then we need to buy back the loan token prior to closing the loan.
        if (loanPosition.positionTokenAddressFilled != loanOrder.loanTokenAddress) {
            uint loanTokenAmount = _tradePositionWithOracle(
                loanOrder,
                loanPosition,
                loanOrder.loanTokenAddress, // tradeTokenAddress
                false, // isLiquidation
                false // isManual
            );

            if (loanTokenAmount == 0) {
                return boolOrRevert(false,347); // revert("B0xLoanHealth::_closeLoan: loanTokenAmount == 0");
            }

            // the loan token becomes the new position token
            loanPosition.positionTokenAddressFilled = loanOrder.loanTokenAddress;
            loanPosition.positionTokenAmountFilled = loanTokenAmount;
        }

        return _finalizeLoan(
            loanOrder,
            loanPosition, // needs to be storage
            false, // isLiquidation
            gasUsed // initial used gas, collected in modifier
        );
    }

    // NOTE: this function will only be called if loanPosition.positionTokenAddressFilled == loanOrder.loanTokenAddress
    function _finalizeLoan(
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
            if (! B0xVault(vaultContract).withdrawToken(
                loanOrder.interestTokenAddress,
                loanPosition.trader,
                totalInterestToRefund
            )) {
                return boolOrRevert(false,393); // revert("B0xLoanHealth::_finalizeLoan: B0xVault.withdrawToken interest failed");
            }
        }

        // check if lender is being made whole, and if not attempt to sell collateral token to cover losses
        if (loanPosition.positionTokenAmountFilled < loanPosition.loanTokenAmountFilled) {
            // Send all of the collateral token to the oracle to sell to cover loan token losses.
            // Unused collateral should be returned to the vault by the oracle.
            if (! B0xVault(vaultContract).withdrawToken(
                loanPosition.collateralTokenAddressFilled,
                loanOrder.oracleAddress,
                loanPosition.collateralTokenAmountFilled
            )) {
                return boolOrRevert(false,406); // revert("B0xLoanHealth::_finalizeLoan: B0xVault.withdrawToken (cover losses) failed");
            }

            uint loanTokenAmountCovered;
            uint collateralTokenAmountUsed;
            (loanTokenAmountCovered, collateralTokenAmountUsed) = OracleInterface(loanOrder.oracleAddress).doTradeofCollateral(
                loanPosition.collateralTokenAddressFilled,
                loanOrder.loanTokenAddress,
                loanPosition.collateralTokenAmountFilled,
                loanPosition.loanTokenAmountFilled.sub(loanPosition.positionTokenAmountFilled),
                loanOrder.initialMarginAmount,
                loanOrder.maintenanceMarginAmount);
            
            loanPosition.positionTokenAmountFilled = loanPosition.positionTokenAmountFilled.add(loanTokenAmountCovered);
            loanPosition.collateralTokenAmountFilled = loanPosition.collateralTokenAmountFilled.sub(collateralTokenAmountUsed);
        }

        // send remaining collateral token back to the trader
        if (! B0xVault(vaultContract).withdrawToken(
            loanPosition.collateralTokenAddressFilled,
            loanPosition.trader,
            loanPosition.collateralTokenAmountFilled
        )) {
            return boolOrRevert(false,429); // revert("B0xLoanHealth::_finalizeLoan: B0xVault.withdrawToken collateral failed");
        }

        // send remaining loan token back to the lender
        if (! B0xVault(vaultContract).withdrawToken(
            loanPosition.positionTokenAddressFilled, // same as loanTokenAddress
            loanPosition.lender,
            loanPosition.positionTokenAmountFilled
        )) {
            return boolOrRevert(false,438); // revert("B0xLoanHealth::_finalizeLoan: B0xVault.withdrawToken loan failed");
        }

        if (! OracleInterface(loanOrder.oracleAddress).didCloseLoan(
            loanOrder.loanOrderHash,
            msg.sender,
            isLiquidation,
            gasUsed
        )) {
            return boolOrRevert(false,447); // revert("B0xLoanHealth::_finalizeLoan: OracleInterface.didCloseLoan failed");
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
