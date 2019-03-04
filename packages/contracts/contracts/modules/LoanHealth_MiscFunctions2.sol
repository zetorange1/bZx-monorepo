/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.3;
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
        targets[bytes4(keccak256("payInterestForOrder(bytes32)"))] = _target;
        targets[bytes4(keccak256("payInterestForOracle(address,address)"))] = _target;
        targets[bytes4(keccak256("getMarginLevels(bytes32,address)"))] = _target;
        targets[bytes4(keccak256("getLenderInterestForOracle(address,address,address)"))] = _target;
        targets[bytes4(keccak256("getLenderInterestForOrder(bytes32)"))] = _target;
        targets[bytes4(keccak256("getTraderInterestForLoan(bytes32,address)"))] = _target;
    }

    /// @dev Pays the lender the total amount of interest accrued for a loan order
    /// @dev Note that this function can be safely called by anyone.
    /// @param loanOrderHash A unique hash representing the loan order
    /// @return The amount of interest paid out
    function payInterestForOrder(
        bytes32 loanOrderHash)
        external
        nonReentrant
        returns (uint256)
    {
        LoanOrder memory loanOrder = orders[loanOrderHash];
        return _payInterestForOrder(loanOrder, lenderOracleInterest[orderLender[loanOrderHash]][loanOrder.oracleAddress][loanOrder.interestTokenAddress], lenderOrderInterest[loanOrderHash], true);
    }

    /// @dev Pays the lender the total amount of interest for open loans using a particular oracle and interest token
    /// @dev Note that this function can be only be called by a lender for their loans.
    /// @param oracleAddress The oracle address
    /// @param interestTokenAddress The interest token address
    /// @return The amount of interest paid out
    function payInterestForOracle(
        address oracleAddress,
        address interestTokenAddress)
        external
        nonReentrant
        returns (uint256)
    {
        address oracleRef = oracleAddresses[oracleAddress];
        LenderInterest storage oracleInterest = lenderOracleInterest[msg.sender][oracleAddress][interestTokenAddress];

        uint256 interestOwedNow = 0;
        if (oracleInterest.interestOwedPerDay > 0 && oracleInterest.interestPaidDate > 0 && interestTokenAddress != address(0)) {
            interestOwedNow = block.timestamp.sub(oracleInterest.interestPaidDate).mul(oracleInterest.interestOwedPerDay).div(86400);
            if (interestOwedNow > tokenInterestOwed[msg.sender][interestTokenAddress])
                interestOwedNow = tokenInterestOwed[msg.sender][interestTokenAddress];

            if (interestOwedNow > 0) {
                oracleInterest.interestPaid = oracleInterest.interestPaid.add(interestOwedNow);
                tokenInterestOwed[msg.sender][interestTokenAddress] = tokenInterestOwed[msg.sender][interestTokenAddress].sub(interestOwedNow);

                // send the interest to the oracle for further processing
                if (! BZxVault(vaultContract).withdrawToken(
                    interestTokenAddress,
                    oracleRef,
                    interestOwedNow
                )) {
                    revert("payInterestForOracle: BZxVault.withdrawToken failed");
                }

                // calls the oracle to signal processing of the interest (ie: paying the lender, retaining fees)
                if (! OracleInterface(oracleRef).didPayInterestByLender(
                    msg.sender,
                    interestTokenAddress,
                    interestOwedNow,
                    gasUsed // initial used gas, collected in modifier
                )) {
                    revert("payInterestForOracle: OracleInterface.didPayInterestByLender failed");
                }

                emit LogPayInterestForOracle(
                    msg.sender,
                    oracleRef,
                    interestTokenAddress,
                    interestOwedNow,
                    oracleInterest.interestPaid
                );
            }
        }

        oracleInterest.interestPaidDate = block.timestamp;

        return interestOwedNow;
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

    /// @dev Gets current lender interest data totals for all loans with a specific oracle and interest token
    /// @param lender The lender address
    /// @param oracleAddress The oracle address
    /// @param interestTokenAddress The interest token address
    /// @return interestPaid The total amount of interest that has been paid to a lender so far
    /// @return interestPaidDate The date of the last interest pay out, or 0 if no interest has been withdrawn yet
    /// @return interestOwedPerDay The amount of interest the lender is earning per day
    /// @return interestUnPaid The total amount of interest the lender is owned and not yet withdrawn
    function getLenderInterestForOracle(
        address lender,
        address oracleAddress,
        address interestTokenAddress)
        public
        view
        returns (
            uint256,
            uint256,
            uint256,
            uint256)
    {
        LenderInterest memory oracleInterest = lenderOracleInterest[lender][oracleAddress][interestTokenAddress];

        uint256 interestUnPaid = block.timestamp.sub(oracleInterest.interestPaidDate).mul(oracleInterest.interestOwedPerDay).div(86400);
        if (interestUnPaid > tokenInterestOwed[lender][interestTokenAddress])
            interestUnPaid = tokenInterestOwed[lender][interestTokenAddress];

        return (
            oracleInterest.interestPaid,
            oracleInterest.interestPaid > 0 ? oracleInterest.interestPaidDate : 0,
            oracleInterest.interestOwedPerDay,
            oracleInterest.interestPaidDate > 0 ? interestUnPaid : 0
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
        LoanOrder memory loanOrder = orders[loanOrderHash];
        address lender = orderLender[loanOrderHash];
        address oracleAddress = loanOrder.oracleAddress;
        address interestTokenAddress = loanOrder.interestTokenAddress;

        LenderInterest memory lenderInterest = lenderOrderInterest[loanOrderHash];
        LenderInterest memory oracleInterest = lenderOracleInterest[lender][oracleAddress][interestTokenAddress];

        uint256 interestPaid = lenderInterest.interestPaid;
        uint256 interestPaidDate = oracleInterest.interestPaidDate; // oracleInterest always >= lenderInterest
        if (oracleInterest.interestPaidDate > lenderInterest.interestPaidDate) {
            interestPaid = interestPaid.add(oracleInterest.interestPaidDate.sub(lenderInterest.interestPaidDate).mul(lenderInterest.interestOwedPerDay).div(86400));
        }

        uint256 interestUnPaid = block.timestamp.sub(interestPaidDate).mul(lenderInterest.interestOwedPerDay).div(86400);
        if (interestUnPaid > tokenInterestOwed[lender][interestTokenAddress])
            interestUnPaid = tokenInterestOwed[lender][interestTokenAddress];

        return (
            lender,
            interestTokenAddress,
            interestPaid,
            interestPaid > 0 ? interestPaidDate : 0,
            lenderInterest.interestOwedPerDay,
            interestPaidDate > 0 ? interestUnPaid : 0
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
        TraderInterest memory traderInterest = traderLoanInterest[positionId];

        return (
            orders[loanOrderHash].interestTokenAddress,
            traderInterest.interestOwedPerDay,
            traderInterest.interestUpdatedDate > 0 && traderInterest.interestOwedPerDay > 0 ?
                traderInterest.interestPaid.add(
                    block.timestamp.sub(traderInterest.interestUpdatedDate).mul(traderInterest.interestOwedPerDay).div(86400)
                ) : traderInterest.interestPaid,
            traderInterest.interestDepositTotal,
            loanPositions[positionId].loanEndUnixTimestampSec > block.timestamp ? loanPositions[positionId].loanEndUnixTimestampSec.sub(block.timestamp).mul(traderInterest.interestOwedPerDay).div(86400) : 0
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
