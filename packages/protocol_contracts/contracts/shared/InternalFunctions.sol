

pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../modules/BZxStorage.sol";
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

        totalInterestRequired = _getPartialAmountNoError(loanTokenAmountFilled, loanTokenAmount, maxDurationUnixTimestampSec.mul(interestAmount).div(86400));
    }

    /// @dev Checks if rounding error > 0.1%.
    /// @param numerator Numerator.
    /// @param denominator Denominator.
    /// @param target Value to multiply with numerator/denominator.
    /// @return Rounding error is present.
    function _isRoundingError(
        uint numerator, 
        uint denominator, 
        uint target)
        internal
        pure
        returns (bool)
    {
        uint remainder = mulmod(target, numerator, denominator);
        if (remainder == 0) return false; // No rounding error.

        uint errPercentageTimes1000000 = SafeMath.div(
            SafeMath.mul(remainder, 1000000),
            SafeMath.mul(numerator, target)
        );
        return errPercentageTimes1000000 > 1000;
    }

    /// @dev Calculates partial value given a numerator and denominator.
    /// @param numerator Numerator.
    /// @param denominator Denominator.
    /// @param target Value to calculate partial of.
    /// @return Partial value of target.
    function _getPartialAmount(
        uint numerator, 
        uint denominator, 
        uint target)
        internal
        pure
        returns (uint)
    {
        return numerator.mul(target).div(denominator);
    }

    function _getPartialAmountNoError(uint numerator, uint denominator, uint target)
        internal
        pure
        returns (uint)
    {
        require(!_isRoundingError(numerator, denominator, target), "rounding error");
        return _getPartialAmount(numerator, denominator, target);
    }

    function _getInterest(
        LoanOrder loanOrder,
        LoanPosition loanPosition)
        internal
        view
        returns (InterestData interestData)
    {
        uint interestTime = block.timestamp;
        if (interestTime > loanPosition.loanEndUnixTimestampSec) {
            interestTime = loanPosition.loanEndUnixTimestampSec;
        }

        uint interestTotalAccrued;
        if (loanPosition.active) {
            interestTotalAccrued = _getPartialAmountNoError(loanPosition.loanTokenAmountFilled, loanOrder.loanTokenAmount, interestTime.sub(loanPosition.loanStartUnixTimestampSec).mul(loanOrder.interestAmount).div(86400));
        } else {
            // this is so, because remaining interest is paid out when the loan is closed
            interestTotalAccrued = interestPaid[loanOrder.loanOrderHash][loanPosition.trader];
        }

        interestData = InterestData({
            lender: loanPosition.lender,
            interestTokenAddress: loanOrder.interestTokenAddress,
            interestTotalAccrued: interestTotalAccrued,
            interestPaidSoFar: interestPaid[loanOrder.loanOrderHash][loanPosition.trader]
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
                loanOrder.loanTokenAddress,
                loanPosition.positionTokenAddressFilled,
                loanPosition.collateralTokenAddressFilled,
                loanPosition.loanTokenAmountFilled,
                loanPosition.positionTokenAmountFilled,
                loanPosition.collateralTokenAmountFilled,
                loanOrder.maintenanceMarginAmount);
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
}