
pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/math/Math.sol";

import "./BZxStorage.sol";
import "./BZxProxyContracts.sol";
import "../shared/InternalFunctions.sol";

import "../BZxVault.sol";
import "../oracle/OracleInterface.sol";


contract BZxLoanHealth is BZxStorage, Proxiable, InternalFunctions {
    using SafeMath for uint256;

    constructor() public {}

    function initialize(
        address _target)
        public
        onlyOwner
    {
        targets[0xe7246aa3] = _target; // bytes4(keccak256("payInterest(bytes32,address)"))
        targets[0xe75a4a2c] = _target; // bytes4(keccak256("liquidatePosition(bytes32,address)"))
        targets[0xf4ff7d2d] = _target; // bytes4(keccak256("closeLoan(bytes32)"))
        targets[0x6e46c9bb] = _target; // bytes4(keccak256("forceCloanLoan(bytes32,address)"))
        targets[0xee73722f] = _target; // bytes4(keccak256("shouldLiquidate(bytes32,address)"))
        targets[0xdb4d0ae0] = _target; // bytes4(keccak256("getMarginLevels(bytes32,address)"))
        targets[0x60068e2d] = _target; // bytes4(keccak256("getInterest(bytes32,address)"))
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
        if (loanOrder.loanTokenAddress == address(0)) {
            revert("BZxLoanHealth::payInterest: loanOrder.loanTokenAddress == address(0)");
        }

        // can still pay any unpaid accured interest after a loan has closed
        LoanPosition memory loanPosition = loanPositions[loanOrderHash][trader];
        if (loanPosition.loanTokenAmountFilled == 0) {
            revert("BZxLoanHealth::payInterest: loanPosition.loanTokenAmountFilled == 0");
        }
        
        uint amountPaid = _payInterest(
            loanOrder,
            loanPosition,
            true // convert
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
            revert("BZxLoanHealth::liquidatePosition: loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active");
        }

        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.loanTokenAddress == address(0)) {
            revert("BZxLoanHealth::liquidatePosition: loanOrder.loanTokenAddress == address(0)");
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
                revert("BZxLoanHealth::liquidatePosition: loanTokenAmount == 0");
            }

            // the loan token becomes the new position token
            loanPosition.positionTokenAddressFilled = loanOrder.loanTokenAddress;
            loanPosition.positionTokenAmountFilled = loanTokenAmount;
        } else {
            // verify liquidation checks before proceeding to close the loan
            if (!DEBUG_MODE && block.timestamp < loanPosition.loanEndUnixTimestampSec) { // checks for non-expired loan
                if (! OracleInterface(oracleAddresses[loanOrder.oracleAddress]).shouldLiquidate(
                        loanOrderHash,
                        trader,
                        loanOrder.loanTokenAddress,
                        loanPosition.positionTokenAddressFilled,
                        loanPosition.collateralTokenAddressFilled,
                        loanPosition.loanTokenAmountFilled,
                        loanPosition.positionTokenAmountFilled,
                        loanPosition.collateralTokenAmountFilled,
                        loanOrder.maintenanceMarginAmount)) {
                    revert("BZxLoanHealth::liquidatePosition: liquidation not allowed");
                }
            }
        }

        require(_finalizeLoan(
            loanOrder,
            loanPosition, // needs to be storage
            true, // isLiquidation
            gasUsed // initial used gas, collected in modifier
        ),"BZxLoanHealth::liquidatePosition: _finalizeLoan failed");

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

    function forceCloanLoan(
        bytes32 loanOrderHash,
        address trader)
        public
        onlyOwner
        tracksGas
        returns (bool)
    {
        LoanPosition storage loanPosition = loanPositions[loanOrderHash][trader];
        require(loanPosition.loanTokenAmountFilled != 0 && loanPosition.active);

        LoanOrder memory loanOrder = orders[loanOrderHash];
        require(loanOrder.loanTokenAddress != address(0));

        _payInterest(
            loanOrder,
            loanPosition,
            false // convert
        );

        uint totalInterestToRefund = _getTotalInterestRequired(
            loanOrder.loanTokenAmount,
            loanPosition.loanTokenAmountFilled,
            loanOrder.interestAmount,
            loanOrder.maxDurationUnixTimestampSec)
            .sub(interestPaid[loanOrder.loanOrderHash][loanPosition.trader]);

        if (totalInterestToRefund > 0) {
            require(BZxVault(vaultContract).withdrawToken(
                loanOrder.interestTokenAddress,
                loanPosition.trader,
                totalInterestToRefund
            ));
        }

        if (loanPosition.collateralTokenAmountFilled > 0) {
            require(BZxVault(vaultContract).withdrawToken(
                loanPosition.collateralTokenAddressFilled,
                loanPosition.trader,
                loanPosition.collateralTokenAmountFilled
            ));
        }

        if (loanPosition.positionTokenAmountFilled > 0) {
            require(BZxVault(vaultContract).withdrawToken(
                loanPosition.positionTokenAddressFilled,
                loanPosition.lender,
                loanPosition.positionTokenAmountFilled
            ));
        }

        loanPosition.active = false;
        loanList[loanPosition.index] = loanList[loanList.length - 1];
        loanPositions[loanList[loanPosition.index].loanOrderHash][loanList[loanPosition.index].trader].index = loanPosition.index;
        loanList.length--;

        emit LogLoanClosed(
            loanPosition.lender,
            loanPosition.trader,
            //msg.sender, // loanCloser
            false, // isLiquidation
            loanOrder.loanOrderHash
        );

        require(OracleInterface(oracleAddresses[loanOrder.oracleAddress]).didCloseLoan(
            loanOrder.loanOrderHash,
            msg.sender, // loanCloser
            false, // isLiquidation
            gasUsed
        ));

        return true;
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
        if (loanOrder.loanTokenAddress == address(0)) {
            return false;
        }

        LoanPosition memory loanPosition = loanPositions[loanOrderHash][trader];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            return false;
        }

        if (block.timestamp >= loanPosition.loanEndUnixTimestampSec) {
            return true; // expired loan
        }

        /*if (DEBUG_MODE) {
            _emitMarginLog(loanOrder, loanPosition);
        }*/

        return OracleInterface(oracleAddresses[loanOrder.oracleAddress]).shouldLiquidate(
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
        if (loanOrder.loanTokenAddress == address(0)) {
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
        if (loanOrder.loanTokenAddress == address(0)) {
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
        LoanPosition loanPosition,
        bool convert)
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
            
            // send the interest to the oracle for further processing (amountPaid > 0)
            if (! BZxVault(vaultContract).withdrawToken(
                interestData.interestTokenAddress,
                oracleAddresses[loanOrder.oracleAddress],
                amountPaid
            )) {
                revert("BZxLoanHealth::_payInterest: BZxVault.withdrawToken failed");
            }

            // calls the oracle to signal processing of the interest (ie: paying the lender, retaining fees)
            if (! OracleInterface(oracleAddresses[loanOrder.oracleAddress]).didPayInterest(
                loanOrder.loanOrderHash,
                loanPosition.trader,
                loanPosition.lender,
                interestData.interestTokenAddress,
                amountPaid,
                convert,
                gasUsed // initial used gas, collected in modifier
            )) {
                revert("BZxLoanHealth::_payInterest: OracleInterface.didPayInterest failed");
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
            revert("BZxLoanHealth::_closeLoan: loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active");
        }

        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.loanTokenAddress == address(0)) {
            revert("BZxLoanHealth::_closeLoan: loanOrder.loanTokenAddress == address(0)");
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
                revert("BZxLoanHealth::_closeLoan: loanTokenAmount == 0");
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

    function _finalizeLoan(
        LoanOrder loanOrder,
        LoanPosition storage loanPosition,
        bool isLiquidation,
        uint gasUsed)
        internal
        returns (bool)
    {
        require(loanPosition.positionTokenAddressFilled == loanOrder.loanTokenAddress, "BZxLoanHealth::_finalizeLoan: loanPosition.positionTokenAddressFilled != loanOrder.loanTokenAddress");

        // pay any remaining interest to the lender
        _payInterest(
            loanOrder,
            loanPosition,
            true // convert
        );

        uint totalInterestToRefund = _getTotalInterestRequired(
            loanOrder.loanTokenAmount,
            loanPosition.loanTokenAmountFilled,
            loanOrder.interestAmount,
            loanOrder.maxDurationUnixTimestampSec)
            .sub(interestPaid[loanOrder.loanOrderHash][loanPosition.trader]);
        
        // refund any unused interest to the trader
        if (totalInterestToRefund > 0) {
            if (! BZxVault(vaultContract).withdrawToken(
                loanOrder.interestTokenAddress,
                loanPosition.trader,
                totalInterestToRefund
            )) {
                revert("BZxLoanHealth::_finalizeLoan: BZxVault.withdrawToken interest failed");
            }
        }

        if (isLiquidation || loanPosition.positionTokenAmountFilled < loanPosition.loanTokenAmountFilled) {
            // Send collateral to the oracle for processing. Unused collateral must be returned.
            if (! BZxVault(vaultContract).withdrawToken(
                loanPosition.collateralTokenAddressFilled,
                oracleAddresses[loanOrder.oracleAddress],
                loanPosition.collateralTokenAmountFilled
            )) {
                revert("BZxLoanHealth::_finalizeLoan: BZxVault.withdrawToken (collateral) failed");
            }

            (uint loanTokenAmountCovered, uint collateralTokenAmountUsed) = OracleInterface(oracleAddresses[loanOrder.oracleAddress]).processCollateral(
                loanPosition.collateralTokenAddressFilled,
                loanOrder.loanTokenAddress,
                loanPosition.collateralTokenAmountFilled,
                loanPosition.positionTokenAmountFilled < loanPosition.loanTokenAmountFilled ? loanPosition.loanTokenAmountFilled - loanPosition.positionTokenAmountFilled : 0,
                loanOrder.initialMarginAmount,
                loanOrder.maintenanceMarginAmount,
                isLiquidation);
            
            loanPosition.positionTokenAmountFilled = loanPosition.positionTokenAmountFilled.add(loanTokenAmountCovered);
            loanPosition.collateralTokenAmountFilled = loanPosition.collateralTokenAmountFilled.sub(collateralTokenAmountUsed);
        }

        if (loanPosition.collateralTokenAmountFilled > 0) {
            // send remaining collateral token back to the trader
            if (! BZxVault(vaultContract).withdrawToken(
                loanPosition.collateralTokenAddressFilled,
                loanPosition.trader,
                loanPosition.collateralTokenAmountFilled
            )) {
                revert("BZxLoanHealth::_finalizeLoan: BZxVault.withdrawToken collateral failed");
            }
        }

        if (loanPosition.positionTokenAmountFilled > 0) {
            if (loanPosition.positionTokenAmountFilled > loanPosition.loanTokenAmountFilled) {
                // send unpaid profit to the trader
                uint profit = loanPosition.positionTokenAmountFilled-loanPosition.loanTokenAmountFilled;
                if (! BZxVault(vaultContract).withdrawToken(
                    loanPosition.positionTokenAddressFilled, // same as loanTokenAddress
                    loanPosition.trader,
                    profit
                )) {
                    revert("BZxLoanHealth::_finalizeLoan: BZxVault.withdrawToken profit failed");
                }
                loanPosition.positionTokenAmountFilled -= profit;
            }

            // send remaining loan token back to the lender
            if (! BZxVault(vaultContract).withdrawToken(
                loanPosition.positionTokenAddressFilled, // same as loanTokenAddress
                loanPosition.lender,
                loanPosition.positionTokenAmountFilled
            )) {
                revert("BZxLoanHealth::_finalizeLoan: BZxVault.withdrawToken loan failed");
            }
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
            //msg.sender, // loanCloser
            isLiquidation,
            loanOrder.loanOrderHash
        );

        if (! OracleInterface(oracleAddresses[loanOrder.oracleAddress]).didCloseLoan(
            loanOrder.loanOrderHash,
            msg.sender, // loanCloser
            isLiquidation,
            gasUsed
        )) {
            revert("BZxLoanHealth::_finalizeLoan: OracleInterface.didCloseLoan failed");
        }

        return true;
    }
}
