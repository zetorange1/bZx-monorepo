/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.4.24;
pragma experimental ABIEncoderV2;

import "openzeppelin-solidity/contracts/math/Math.sol";

import "../proxy/BZxProxiable.sol";
import "../shared/InternalFunctions.sol";
import "../shared/InterestFunctions.sol";

import "../BZxVault.sol";
import "../oracle/OracleInterface.sol";


contract BZxLoanHealth is BZxStorage, BZxProxiable, InternalFunctions, InterestFunctions {
    using SafeMath for uint256;

    constructor() public {}

    function()  
        public
    {
        revert("fallback not allowed");
    }

    function initialize(
        address _target)
        public
        onlyOwner
    {
        targets[bytes4(keccak256("payInterest(bytes32,address)"))] = _target;
        targets[bytes4(keccak256("payInterestForOrder(bytes32)"))] = _target;
        targets[bytes4(keccak256("liquidatePosition(bytes32,address)"))] = _target;
        targets[bytes4(keccak256("closeLoan(bytes32)"))] = _target;
        targets[bytes4(keccak256("forceCloanLoan(bytes32,address)"))] = _target;
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
        if (loanOrder.loanTokenAddress == address(0)) {
            revert("BZxLoanHealth::payInterest: loanOrder.loanTokenAddress == address(0)");
        }

        LoanPosition memory loanPosition = loanPositions[loanPositionsIds[loanOrderHash][trader]];
        if (loanPosition.loanTokenAmountFilled == 0) {
            revert("BZxLoanHealth::payInterest: loanPosition.loanTokenAmountFilled == 0");
        }
        
        uint amountPaid = _payInterestForPosition(
            loanOrder,
            loanPosition,
            true // convert
        );

        return amountPaid;
    }

    /// @dev Pays the lender the total amount of interest accrued from all loans for a given order.
    /// @dev This function can potentially run out of gas before finishing if there are two many loans assigned to
    /// @dev an order. If this occurs, interest owed can be paid out using the payInterest function. Payouts are
    /// @dev automatic as positions close, as well.
    /// @dev Note that this function can be safely called by anyone.
    /// @param loanOrderHash A unique hash representing the loan order
    /// @return The amount of interest paid out.
    function payInterestForOrder(
        bytes32 loanOrderHash)
        external
        nonReentrant
        tracksGas
        returns (uint)
    {
        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.loanTokenAddress == address(0)) {
            revert("BZxLoanHealth::payInterest: loanOrder.loanTokenAddress == address(0)");
        }

        uint totalAmountPaid = 0;
        uint totalAmountAccrued = 0;
        for (uint i=0; i < orderPositionList[loanOrderHash].length; i++) {
            // can still pay any unpaid accured interest after a loan has closed
            LoanPosition memory loanPosition = loanPositions[orderPositionList[loanOrderHash][i]];
            if (loanPosition.loanTokenAmountFilled == 0) {
                revert("BZxLoanHealth::payInterest: loanPosition.loanTokenAmountFilled == 0");
            }

            (uint amountPaid, uint interestTotalAccrued) = _setInterestPaidForPosition(
                loanOrder,
                loanPosition);
            totalAmountPaid += amountPaid;
            totalAmountAccrued += interestTotalAccrued;
        }

        if (totalAmountPaid > 0) {
            _sendInterest(
                loanOrder,
                totalAmountPaid,
                true // convert
            );
        }

        emit LogPayInterestForOrder(
            loanOrder.loanOrderHash,
            orderLender[loanOrder.loanOrderHash],
            totalAmountPaid,
            totalAmountAccrued,
            orderPositionList[loanOrderHash].length
        );

        return totalAmountPaid;
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

        LoanPosition storage loanPosition = loanPositions[loanPositionsIds[loanOrderHash][trader]];
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

    /// @dev Called by an admin to force close a loan early and return assets to the lender and trader as is.
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param trader The trader of the position
    /// @return True on success
    function forceCloanLoan(
        bytes32 loanOrderHash,
        address trader)
        public
        onlyOwner
        tracksGas
        returns (bool)
    {
        uint positionId = loanPositionsIds[loanOrderHash][trader];

        LoanPosition storage loanPosition = loanPositions[positionId];
        require(loanPosition.loanTokenAmountFilled != 0 && loanPosition.active);

        LoanOrder memory loanOrder = orders[loanOrderHash];
        require(loanOrder.loanTokenAddress != address(0));

        if (loanOrder.interestAmount > 0) {
            _payInterestForPosition(
                loanOrder,
                loanPosition,
                false // convert
            );
        
            uint totalInterestToRefund = interestTotal[loanOrder.loanOrderHash][loanPosition.positionId]
                .sub(interestPaid[loanOrder.loanOrderHash][loanPosition.positionId]);

            if (totalInterestToRefund > 0) {
                require(BZxVault(vaultContract).withdrawToken(
                loanOrder.interestTokenAddress,
                loanPosition.trader,
                totalInterestToRefund
                ));
            }

            interestTotal[loanOrder.loanOrderHash][loanPosition.positionId] = 0;
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
                orderLender[loanOrderHash],
                loanPosition.positionTokenAmountFilled
            ));
        }

        loanPosition.loanTokenAmountUsed = 0;
        loanPosition.active = false;
        _removePosition(
            loanOrderHash,
            loanPosition.trader);

        emit LogLoanClosed(
            orderLender[loanOrderHash],
            loanPosition.trader,
            msg.sender, // loanCloser
            false, // isLiquidation
            loanOrder.loanOrderHash,
            loanPosition.positionId
        );

        require(OracleInterface(oracleAddresses[loanOrder.oracleAddress]).didCloseLoan(
            loanOrder,
            loanPosition,
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

        LoanPosition memory loanPosition = loanPositions[loanPositionsIds[loanOrderHash][trader]];
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

        LoanPosition memory loanPosition = loanPositions[loanPositionsIds[loanOrderHash][trader]];
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
    /// @return interestLastPaidDate The date of the last interest pay out, or 0 if no interest has been withdrawn yet
    function getInterest(
        bytes32 loanOrderHash,
        address trader)
        public
        view
        returns (
            address lender, 
            address interestTokenAddress, 
            uint interestTotalAccrued, 
            uint interestPaidSoFar,
            uint interestLastPaidDate)
    {

        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.loanTokenAddress == address(0)) {
            return;
        }

        // can still get interest for closed loans
        LoanPosition memory loanPosition = loanPositions[loanPositionsIds[loanOrderHash][trader]];
        if (loanPosition.loanTokenAmountFilled == 0) {
            return;
        }

        InterestData memory interestData = _getInterestData(
            loanOrder,
            loanPosition
        );
        return (
            orderLender[loanOrderHash],
            interestData.interestTokenAddress,
            interestData.interestTotalAccrued,
            interestData.interestPaidSoFar,
            interestData.interestLastPaidDate
        );
    }

    /*
    * Internal functions
    */

    function _closeLoan(
        bytes32 loanOrderHash,
        uint gasUsed)
        internal
        returns (bool)
    {
        LoanPosition storage loanPosition = loanPositions[loanPositionsIds[loanOrderHash][msg.sender]];
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

        if (loanOrder.interestAmount > 0) {
            // pay any remaining interest to the lender
            _payInterestForPosition(
                loanOrder,
                loanPosition,
                true // convert
            );

            uint totalInterestToRefund = interestTotal[loanOrder.loanOrderHash][loanPosition.positionId]
                .sub(interestPaid[loanOrder.loanOrderHash][loanPosition.positionId]);
            
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

            interestTotal[loanOrder.loanOrderHash][loanPosition.positionId] = 0;
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
                loanOrder,
                loanPosition,
                loanPosition.positionTokenAmountFilled < loanPosition.loanTokenAmountFilled ? loanPosition.loanTokenAmountFilled - loanPosition.positionTokenAmountFilled : 0,
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
                orderLender[loanOrder.loanOrderHash],
                loanPosition.positionTokenAmountFilled
            )) {
                revert("BZxLoanHealth::_finalizeLoan: BZxVault.withdrawToken loan failed");
            }
        }

        loanPosition.loanTokenAmountUsed = 0;
        loanPosition.active = false;
        _removePosition(
            loanOrder.loanOrderHash,
            loanPosition.trader);

        emit LogLoanClosed(
            orderLender[loanOrder.loanOrderHash],
            loanPosition.trader,
            msg.sender, // loanCloser
            isLiquidation,
            loanOrder.loanOrderHash,
            loanPosition.positionId
        );

        if (! OracleInterface(oracleAddresses[loanOrder.oracleAddress]).didCloseLoan(
            loanOrder,
            loanPosition,
            msg.sender, // loanCloser
            isLiquidation,
            gasUsed
        )) {
            revert("BZxLoanHealth::_finalizeLoan: OracleInterface.didCloseLoan failed");
        }

        return true;
    }

    function _removePosition(
        bytes32 loanOrderHash,
        address trader)
        internal
    {
        uint positionId = loanPositionsIds[loanOrderHash][trader];
        if (positionListIndex[positionId].isSet) {
            assert(positionList.length > 0);

            if (positionList.length > 1) {
                // get positionList index
                uint index = positionListIndex[positionId].index;
                
                // replace loan in list with last loan in array
                positionList[index] = positionList[positionList.length - 1];
                
                // update the position of this replacement
                positionListIndex[positionList[index].positionId].index = index;
            }

            // trim array
            positionList.length--;
        }
    }
}
