/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.4.24;
pragma experimental ABIEncoderV2;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

import "../storage/BZxStorage.sol";
import "./InternalFunctions.sol";


contract InterestFunctions is BZxStorage, InternalFunctions {
    using SafeMath for uint256;

    function _setInterestPaidForPosition(
        LoanOrder loanOrder,
        LoanPosition loanPosition)
        internal
        returns (uint amountPaid, uint interestTotalAccrued)
    {
        InterestData memory interestData = _getInterestData(
            loanOrder,
            loanPosition);

        interestTotalAccrued = interestData.interestTotalAccrued;
        if (interestData.interestPaidSoFar >= interestTotalAccrued) {
            amountPaid = 0;
        } else {
            amountPaid = interestTotalAccrued.sub(interestData.interestPaidSoFar);
            interestPaid[loanPosition.positionId] = interestTotalAccrued; // since this function will pay all remaining accured interest
            interestPaidDate[loanPosition.positionId] = block.timestamp;
        }
    }

    function _sendInterest(
        LoanOrder loanOrder,
        uint amountPaid,
        bool convert)
        internal
    {
        if (amountPaid == 0)
            return;
        
        // send the interest to the oracle for further processing (amountPaid > 0)
        if (! BZxVault(vaultContract).withdrawToken(
            loanOrder.interestTokenAddress,
            oracleAddresses[loanOrder.oracleAddress],
            amountPaid
        )) {
            revert("BZxLoanHealth::_sendInterest: BZxVault.withdrawToken failed");
        }

        // calls the oracle to signal processing of the interest (ie: paying the lender, retaining fees)
        if (! OracleInterface(oracleAddresses[loanOrder.oracleAddress]).didPayInterest(
            loanOrder,
            orderLender[loanOrder.loanOrderHash],
            amountPaid,
            convert,
            gasUsed // initial used gas, collected in modifier
        )) {
            revert("BZxLoanHealth::_sendInterest: OracleInterface.didPayInterest failed");
        }
    }

    function _payInterestForPosition(
        LoanOrder loanOrder,
        LoanPosition loanPosition,
        bool convert,
        bool emitEvent)
        internal
        returns (uint)
    {
        (uint amountPaid, uint interestTotalAccrued) = _setInterestPaidForPosition(
            loanOrder,
            loanPosition);

        if (amountPaid > 0) {
            _sendInterest(
                loanOrder,
                amountPaid,
                convert
            );
        }

        if (emitEvent) {
            emit LogPayInterestForPosition(
                loanOrder.loanOrderHash,
                orderLender[loanOrder.loanOrderHash],
                loanPosition.trader,
                amountPaid,
                interestTotalAccrued,
                loanPosition.positionId
            );
        }
        
        return amountPaid;
    }
}