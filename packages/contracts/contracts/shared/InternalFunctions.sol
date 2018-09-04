/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.4.24;
pragma experimental ABIEncoderV2;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../storage/BZxStorage.sol";
import "../BZxVault.sol";
import "../oracle/OracleInterface.sol";


contract InternalFunctions is BZxStorage {
    using SafeMath for uint256;

    function _getInitialCollateralRequired(
        address loanTokenAddress,
        address collateralTokenAddress,
        address oracleAddress,
        uint loanTokenAmountFilled,
        uint initialMarginAmount)
        internal
        view
        returns (uint collateralTokenAmount)
    {
        (,collateralTokenAmount) = OracleInterface(oracleAddresses[oracleAddress]).getTradeData(
            loanTokenAddress,
            collateralTokenAddress,
            loanTokenAmountFilled
        );
        if (collateralTokenAmount == 0) {
            return 0;
        }
        
        collateralTokenAmount = collateralTokenAmount
                                    .mul(initialMarginAmount)
                                    .div(100);
    }
    
    function _getTotalInterestRequired(
        uint loanTokenAmount,
        uint loanTokenAmountFilled,
        uint interestAmount,
        uint maxDurationUnixTimestampSec)
        internal
        pure
        returns (uint totalInterestRequired)
    {
        if (interestAmount == 0) 
            return 0;

        totalInterestRequired = _safeGetPartialAmountFloor(loanTokenAmountFilled, loanTokenAmount, maxDurationUnixTimestampSec.mul(interestAmount).div(86400));
    }

    /// @dev source: https://github.com/0xProject/0x-monorepo/blob/99fbf384fdcae26eb608f9e0c95a852b7cb7bd99/packages/contracts/src/2.0.0/protocol/Exchange/libs/LibMath.sol
    /// @dev Calculates partial value given a numerator and denominator rounded down.
    ///      Reverts if rounding error is >= 0.1%
    /// @param numerator Numerator.
    /// @param denominator Denominator.
    /// @param target Value to calculate partial of.
    /// @return Partial value of target rounded down.
    function _safeGetPartialAmountFloor(
        uint256 numerator,
        uint256 denominator,
        uint256 target
    )
        internal
        pure
        returns (uint256 partialAmount)
    {
        require(
            denominator > 0,
            "DIVISION_BY_ZERO"
        );

        require(
            !_isRoundingErrorFloor(
                numerator,
                denominator,
                target
            ),
            "ROUNDING_ERROR"
        );
        
        partialAmount = SafeMath.div(
            SafeMath.mul(numerator, target),
            denominator
        );
        return partialAmount;
    }

    /// @dev source: https://github.com/0xProject/0x-monorepo/blob/99fbf384fdcae26eb608f9e0c95a852b7cb7bd99/packages/contracts/src/2.0.0/protocol/Exchange/libs/LibMath.sol
    /// @dev Checks if rounding error >= 0.1% when rounding down.
    /// @param numerator Numerator.
    /// @param denominator Denominator.
    /// @param target Value to multiply with numerator/denominator.
    /// @return Rounding error is present.
    function _isRoundingErrorFloor(
        uint256 numerator,
        uint256 denominator,
        uint256 target
    )
        internal
        pure
        returns (bool isError)
    {
        require(
            denominator > 0,
            "DIVISION_BY_ZERO"
        );
        
        // The absolute rounding error is the difference between the rounded
        // value and the ideal value. The relative rounding error is the
        // absolute rounding error divided by the absolute value of the
        // ideal value. This is undefined when the ideal value is zero.
        //
        // The ideal value is `numerator * target / denominator`.
        // Let's call `numerator * target % denominator` the remainder.
        // The absolute error is `remainder / denominator`.
        //
        // When the ideal value is zero, we require the absolute error to
        // be zero. Fortunately, this is always the case. The ideal value is
        // zero iff `numerator == 0` and/or `target == 0`. In this case the
        // remainder and absolute error are also zero. 
        if (target == 0 || numerator == 0) {
            return false;
        }
        
        // Otherwise, we want the relative rounding error to be strictly
        // less than 0.1%.
        // The relative error is `remainder / (numerator * target)`.
        // We want the relative error less than 1 / 1000:
        //        remainder / (numerator * denominator)  <  1 / 1000
        // or equivalently:
        //        1000 * remainder  <  numerator * target
        // so we have a rounding error iff:
        //        1000 * remainder  >=  numerator * target
        uint256 remainder = mulmod(
            target,
            numerator,
            denominator
        );
        isError = SafeMath.mul(1000, remainder) >= SafeMath.mul(numerator, target);
        return isError;
    }

    function _getInterestData(
        LoanOrder loanOrder,
        LoanPosition loanPosition)
        internal
        view
        returns (InterestData interestData)
    {
        uint interestTotalAccrued = 0;
        uint interestPaidSoFar = 0;
        if (loanOrder.interestAmount > 0) {
            uint interestTime = block.timestamp;
            if (interestTime > loanPosition.loanEndUnixTimestampSec) {
                interestTime = loanPosition.loanEndUnixTimestampSec;
            }

            interestPaidSoFar = interestPaid[loanOrder.loanOrderHash][loanPositionsIds[loanOrder.loanOrderHash][loanPosition.trader]];
            if (loanPosition.active) {
                interestTotalAccrued = _safeGetPartialAmountFloor(loanPosition.loanTokenAmountFilled, loanOrder.loanTokenAmount, interestTime.sub(loanPosition.loanStartUnixTimestampSec).mul(loanOrder.interestAmount).div(86400));
            } else {
                // this is so, because remaining interest is paid out when the loan is closed
                interestTotalAccrued = interestPaidSoFar;
            }
        }

        interestData = InterestData({
            lender: orderLender[loanOrder.loanOrderHash],
            interestTokenAddress: loanOrder.interestTokenAddress,
            interestTotalAccrued: interestTotalAccrued,
            interestPaidSoFar: interestPaidSoFar
        });
    }

    function _tradePositionWithOracle(
        LoanOrder loanOrder,
        LoanPosition memory loanPosition,
        address tradeTokenAddress,
        bool isLiquidation,
        bool isManual)
        internal
        returns (uint)
    {
        // transfer the current position token to the Oracle contract
        if (!BZxVault(vaultContract).withdrawToken(
            loanPosition.positionTokenAddressFilled,
            oracleAddresses[loanOrder.oracleAddress],
            loanPosition.positionTokenAmountFilled)) {
            revert("InternalFunctions::_tradePositionWithOracle: BZxVault.withdrawToken failed");
        }

        uint tradeTokenAmountReceived;
        if (isLiquidation && block.timestamp < loanPosition.loanEndUnixTimestampSec) { // checks for non-expired loan
            tradeTokenAmountReceived = OracleInterface(oracleAddresses[loanOrder.oracleAddress]).verifyAndLiquidate(
                loanOrder,
                loanPosition);
        } else if (isManual) {
            tradeTokenAmountReceived = OracleInterface(oracleAddresses[loanOrder.oracleAddress]).doManualTrade(
                loanPosition.positionTokenAddressFilled,
                tradeTokenAddress,
                loanPosition.positionTokenAmountFilled);
        } 
        else {
            tradeTokenAmountReceived = OracleInterface(oracleAddresses[loanOrder.oracleAddress]).doTrade(
                loanPosition.positionTokenAddressFilled,
                tradeTokenAddress,
                loanPosition.positionTokenAmountFilled);
        }

        return tradeTokenAmountReceived;
    }

    function _emitMarginLog(
        LoanOrder loanOrder,
        LoanPosition loanPosition)
        internal
    {
        uint initialMarginAmount;
        uint maintenanceMarginAmount;
        uint currentMarginAmount;
        (initialMarginAmount, maintenanceMarginAmount, currentMarginAmount) = _getMarginLevels(
            loanOrder,
            loanPosition
        );

        emit LogMarginLevels(
            loanOrder.loanOrderHash,
            loanPosition.trader,
            initialMarginAmount,
            maintenanceMarginAmount,
            currentMarginAmount
        );
    }

    // returns initialMarginAmount, maintenanceMarginAmount, currentMarginAmount
    // currentMarginAmount is a percentage -> i.e. 54350000000000000000 == 54.35%
    function _getMarginLevels(
        LoanOrder loanOrder,
        LoanPosition loanPosition)
        internal
        view
        returns (uint, uint, uint)
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

    function _removeLoanOrder(
        bytes32 loanOrderHash,
        address addr)
        internal
    {
        if (orderListIndex[loanOrderHash][addr].isSet) {
            assert(orderList[addr].length > 0);

            uint index = orderListIndex[loanOrderHash][addr].index;
            if (orderList[addr].length > 1) {
                // replace order in list with last order in array
                orderList[addr][index] = orderList[addr][orderList[addr].length - 1];

                // update the position of this replacement
                orderListIndex[orderList[addr][index]][addr].index = index;
            }

            // trim array and clear storage
            orderList[addr].length--;
            orderListIndex[loanOrderHash][addr].index = 0;
            orderListIndex[loanOrderHash][addr].isSet = false;
        }
    }
}