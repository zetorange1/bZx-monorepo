/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.2;
//pragma experimental ABIEncoderV2;

import "../openzeppelin-solidity/SafeMath.sol";
import "../storage/BZxStorage.sol";
import "../BZxVault.sol";
import "../oracle/OracleInterface.sol";
import "./MathFunctions.sol";
import "./MiscFunctions.sol";


contract InterestFunctions is BZxStorage, MathFunctions, MiscFunctions {
    using SafeMath for uint256;

    function _setInterestPaidForPosition(
        LoanOrder memory loanOrder,
        LoanPosition memory loanPosition)
        internal
        returns (uint256 amountPaid, uint256 interestTotalAccrued)
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
        LoanOrder memory loanOrder,
        uint256 amountPaid,
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
        LoanOrder memory loanOrder,
        LoanPosition memory loanPosition,
        bool convert,
        bool emitEvent)
        internal
        returns (uint)
    {
        (uint256 amountPaid, uint256 interestTotalAccrued) = _setInterestPaidForPosition(
            loanOrder,
            loanPosition);

        if (amountPaid > 0) {
            _sendInterest(
                loanOrder,
                amountPaid,
                convert
            );

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
        }

        return amountPaid;
    }

    function _getInterestData(
        LoanOrder memory loanOrder,
        LoanPosition memory loanPosition)
        internal
        view
        returns (InterestData memory interestData)
    {
        uint256 interestTotalAccrued = 0;
        uint256 interestPaidSoFar = 0;
        uint256 interestLastPaidDate = 0;
        if (loanOrder.interestAmount > 0) {
            uint256 interestTime = block.timestamp;
            interestLastPaidDate = interestPaidDate[loanPosition.positionId];
            if (interestTime > loanPosition.loanEndUnixTimestampSec) {
                interestTime = loanPosition.loanEndUnixTimestampSec;
            }
            if (interestLastPaidDate == 0) {
                interestLastPaidDate = loanPosition.loanStartUnixTimestampSec;
            }

            interestPaidSoFar = interestPaid[loanPosition.positionId];
            if (loanPosition.active) {
                interestTotalAccrued = _safeGetPartialAmountFloor(
                    loanPosition.loanTokenAmountFilled, 
                    loanOrder.loanTokenAmount, 
                    interestTime
                        .sub(interestLastPaidDate)
                        .mul(loanOrder.interestAmount)
                        .div(86400)
                ).add(interestPaidSoFar);
            } else {
                // this is so, because remaining interest is paid out when the loan is closed
                interestTotalAccrued = interestPaidSoFar;
            }
        }

        interestData = InterestData({
            lender: orderLender[loanOrder.loanOrderHash],
            interestTokenAddress: loanOrder.interestTokenAddress,
            interestTotalAccrued: interestTotalAccrued,
            interestPaidSoFar: interestPaidSoFar,
            interestLastPaidDate: interestLastPaidDate > loanPosition.loanStartUnixTimestampSec ? interestLastPaidDate : 0
        });
    }
}