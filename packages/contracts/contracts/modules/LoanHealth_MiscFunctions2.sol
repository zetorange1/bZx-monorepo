/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.2;
pragma experimental ABIEncoderV2;

import "../openzeppelin-solidity/Math.sol";

import "../proxy/BZxProxiable.sol";
import "../shared/MiscFunctions.sol";

import "../BZxVault.sol";
import "../oracle/OracleInterface.sol";


contract LoanHealth_MiscFunctions2 is BZxStorage, BZxProxiable, MiscFunctions {
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
        targets[bytes4(keccak256("payInterest(bytes32)"))] = _target;
        targets[bytes4(keccak256("getMarginLevels(bytes32,address)"))] = _target;
        targets[bytes4(keccak256("getLenderInterestForToken(address,address)"))] = _target;
        targets[bytes4(keccak256("getLenderInterestForOrder(bytes32)"))] = _target;
        targets[bytes4(keccak256("getTraderInterestForLoan(bytes32,address)"))] = _target;
    }

    /// @dev Pays the lender the total amount of interest accrued for a loan order
    /// @dev Note that this function can be safely called by anyone.
    /// @param loanOrderHash A unique hash representing the loan order
    /// @return The amount of interest paid out
    function payInterest(
        bytes32 loanOrderHash)
        external
        nonReentrant
        returns (uint256)
    {
        LoanOrder memory loanOrder = orders[loanOrderHash];
        return _payInterest(loanOrder, lenderOrderInterest[loanOrderHash], lenderTokenInterest[orderLender[loanOrderHash]][loanOrder.interestTokenAddress], true);
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

    /// @dev Gets current lender interest data totals for all loans with a specific interest token
    /// @param lender The lender address
    /// @param interestTokenAddress The interest token address
    /// @return interestPaid The total amount of interest that has been paid to a lender so far
    /// @return interestPaidDate The date of the last interest pay out, or 0 if no interest has been withdrawn yet
    /// @return interestOwedPerDay The amount of interest the lender is earning per day
    /// @return interestUnPaid The total amount of interest the lender is owned and not yet withdrawn
    function getLenderInterestForToken(
        address lender,
        address interestTokenAddress)
        public
        view
        returns (
            uint256,
            uint256,
            uint256,
            uint256)
    {
        LenderInterest memory interestTokenDataLender = lenderTokenInterest[lender][interestTokenAddress];

        return (
            interestTokenDataLender.interestPaid,
            interestTokenDataLender.interestPaid > 0 ? interestTokenDataLender.interestPaidDate : 0,
            interestTokenDataLender.interestOwedPerDay,
            interestTokenDataLender.interestPaidDate > 0 ? block.timestamp.sub(interestTokenDataLender.interestPaidDate).mul(interestTokenDataLender.interestOwedPerDay).div(86400) : 0
        );
    }

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
            address,
            address,
            uint256,
            uint256,
            uint256,
            uint256)
    {
        address lender = orderLender[loanOrderHash];
        LenderInterest memory interestDataLender = lenderOrderInterest[loanOrderHash];

        return (
            lender,
            orders[loanOrderHash].interestTokenAddress,
            interestDataLender.interestPaid,
            interestDataLender.interestPaid > 0 ? interestDataLender.interestPaidDate : 0,
            interestDataLender.interestOwedPerDay,
            interestDataLender.interestPaidDate > 0 ? block.timestamp.sub(interestDataLender.interestPaidDate).mul(interestDataLender.interestOwedPerDay).div(86400) : 0
        );
    }

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
            address,
            uint256,
            uint256,
            uint256,
            uint256)
    {
        uint256 positionId = loanPositionsIds[loanOrderHash][trader];
        TraderInterest memory interestDataTrader = traderLoanInterest[positionId];

        return (
            orders[loanOrderHash].interestTokenAddress,
            interestDataTrader.interestOwedPerDay,
            interestDataTrader.interestUpdatedDate > 0 && interestDataTrader.interestOwedPerDay > 0 ?
                interestDataTrader.interestPaid.add(
                    block.timestamp.sub(interestDataTrader.interestUpdatedDate).mul(interestDataTrader.interestOwedPerDay).div(86400)
                ) : interestDataTrader.interestPaid,
            interestDataTrader.interestDepositTotal,
            loanPositions[positionId].loanEndUnixTimestampSec > block.timestamp ? loanPositions[positionId].loanEndUnixTimestampSec.sub(block.timestamp).mul(interestDataTrader.interestOwedPerDay).div(86400) : 0
        );
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
