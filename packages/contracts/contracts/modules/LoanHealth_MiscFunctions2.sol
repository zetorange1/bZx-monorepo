/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.2;
pragma experimental ABIEncoderV2;

import "../openzeppelin-solidity/Math.sol";

import "../proxy/BZxProxiable.sol";
import "../shared/InterestFunctions.sol";

import "../BZxVault.sol";
import "../oracle/OracleInterface.sol";


contract LoanHealth_MiscFunctions2 is BZxStorage, BZxProxiable, InterestFunctions {
    using SafeMath for uint256;

    constructor() public {}

    function()
        external
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
        targets[bytes4(keccak256("getMarginLevels(bytes32,address)"))] = _target;
        targets[bytes4(keccak256("getInterest(bytes32,address)"))] = _target;
        targets[bytes4(keccak256("getInterestForOrder(bytes32)"))] = _target;
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
        returns (uint256)
    {
        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.loanTokenAddress == address(0)) {
            revert("BZxLoanHealth::payInterest: loanOrder.loanTokenAddress == address(0)");
        }

        LoanPosition memory loanPosition = loanPositions[loanPositionsIds[loanOrderHash][trader]];
        if (loanPosition.loanTokenAmountFilled == 0) {
            revert("BZxLoanHealth::payInterest: loanPosition.loanTokenAmountFilled == 0");
        }
        
        uint256 amountPaid = _payInterestForPosition(
            loanOrder,
            loanPosition,
            true, // convert
            true // emitEvent
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
        returns (uint256)
    {
        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.loanTokenAddress == address(0)) {
            revert("BZxLoanHealth::payInterest: loanOrder.loanTokenAddress == address(0)");
        }

        uint256 totalAmountPaid = 0;
        uint256 totalAmountAccrued = 0;
        for (uint256 i=0; i < orderPositionList[loanOrderHash].length; i++) {

            LoanPosition memory loanPosition = loanPositions[orderPositionList[loanOrderHash][i]];
            if (loanPosition.loanTokenAmountFilled == 0) {
                continue;
            }

            (uint256 amountPaid, uint256 interestTotalAccrued) = _setInterestPaidForPosition(
                loanOrder,
                loanPosition);
            totalAmountPaid = totalAmountPaid.add(amountPaid);
            totalAmountAccrued = totalAmountAccrued.add(interestTotalAccrued);
        }

        if (totalAmountPaid > 0) {
            _sendInterest(
                loanOrder,
                totalAmountPaid,
                true // convert
            );

            emit LogPayInterestForOrder(
                loanOrder.loanOrderHash,
                orderLender[loanOrder.loanOrderHash],
                totalAmountPaid,
                totalAmountAccrued,
                orderPositionList[loanOrderHash].length
            );
        }

        return totalAmountPaid;
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
        returns (uint256, uint256, uint256)
    {
        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.loanTokenAddress == address(0)) {
            return (0,0,0);
        }

        LoanPosition memory loanPosition = loanPositions[loanPositionsIds[loanOrderHash][trader]];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            return (0,0,0);
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
    /// @return interestAmount The actual interest amount paid per day for this loan
    function getInterest(
        bytes32 loanOrderHash,
        address trader)
        public
        view
        returns (
            address,
            address,
            uint256,
            uint256,
            uint256,
            uint256)
    {

        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.loanTokenAddress == address(0)) {
            return (address(0),address(0),0,0,0,0);
        }

        // can still get interest for closed loans
        LoanPosition memory loanPosition = loanPositions[loanPositionsIds[loanOrderHash][trader]];
        if (loanPosition.trader != trader) {
            return (address(0),address(0),0,0,0,0);
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
            interestData.interestLastPaidDate,
            loanOrder.loanTokenAmount > 0 ? loanOrder.interestAmount
                .mul(loanPosition.loanTokenAmountFilled)
                .div(loanOrder.loanTokenAmount) : 0
        );
    }

    /// @dev Gets the aggregated current interest data for all loans for a given order.
    /// @param loanOrderHash A unique hash representing the loan order
    /// @return lender The lender for this loan order
    /// @return interestTokenAddress The interset token used in this loan order
    /// @return interestTotalAccrued The total amount of interest that has been earned so far
    /// @return interestPaidSoFar The amount of earned interest that has been withdrawn
    /// @return interestLastPaidDate The date of the last interest pay out, or 0 if no interest has been withdrawn yet
    /// @return interestAmount The actual interest amount paid per day, based on open loan positions
    function getInterestForOrder(
        bytes32 loanOrderHash)
        public
        view
        returns (
            address lender,
            address interestTokenAddress,
            uint256 interestTotalAccrued,
            uint256 interestPaidSoFar,
            uint256 interestLastPaidDate,
            uint256 interestAmount)
    {
        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.loanTokenAddress == address(0)) {
            return (address(0),address(0),0,0,0,0);
        }

        lender = orderLender[loanOrderHash];
        interestTokenAddress = loanOrder.interestTokenAddress;
        uint256 totalAmountFilled = 0;
        for (uint256 i=0; i < orderPositionList[loanOrderHash].length; i++) {

            // can still get interest for closed loans
            LoanPosition memory loanPosition = loanPositions[orderPositionList[loanOrderHash][i]];
            if (loanPosition.trader == address(0)) {
                continue;
            }

            totalAmountFilled = totalAmountFilled.add(loanPosition.loanTokenAmountFilled);

            InterestData memory interestData = _getInterestData(
                loanOrder,
                loanPosition
            );

            interestPaidSoFar = interestPaidSoFar.add(interestData.interestPaidSoFar);
            interestTotalAccrued = interestTotalAccrued.add(interestData.interestTotalAccrued);
            if (interestData.interestLastPaidDate > interestLastPaidDate)
                interestLastPaidDate = interestData.interestLastPaidDate;
        }
        interestAmount = loanOrder.loanTokenAmount > 0 ? loanOrder.interestAmount
            .mul(totalAmountFilled)
            .div(loanOrder.loanTokenAmount) : 0;
    }


    /*
    * Internal functions
    */

    // returns initialMarginAmount, maintenanceMarginAmount, currentMarginAmount
    // currentMarginAmount is a percentage -> i.e. 54350000000000000000 == 54.35%
    function _getMarginLevels(
        LoanOrder memory loanOrder,
        LoanPosition memory loanPosition)
        internal
        view
        returns (uint256, uint256, uint256)
    {
        return (
            loanOrder.initialMarginAmount,
            loanOrder.maintenanceMarginAmount,
            OracleInterface(oracleAddresses[loanOrder.oracleAddress]).getCurrentMarginAmount(
                loanOrder.loanTokenAddress,
                loanPosition.positionTokenAddressFilled,
                loanPosition.collateralTokenAddressFilled,
                loanPosition.loanTokenAmountFilled,
                loanPosition.positionTokenAmountFilled,
                loanPosition.collateralTokenAmountFilled)
        );
    }
}
