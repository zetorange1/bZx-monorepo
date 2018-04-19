

pragma solidity ^0.4.22;

import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import '../modules/B0xStorage.sol';
import '../B0xVault.sol';
import "../interfaces/Oracle_Interface.sol";

contract InternalFunctions is B0xStorage {
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
        /*uint loanToCollateralRate = Oracle_Interface(oracleAddress).getTradeRate(
            loanTokenAddress,
            collateralTokenAddress
        );
        if (loanToCollateralRate == 0) {
            return 0;
        }
        
        collateralTokenAmount = loanTokenAmountFilled
                                    .mul(loanToCollateralRate)
                                    .div(10**18)
                                    .mul(initialMarginAmount)
                                    .div(100);*/

        uint collateralToLoanRate = Oracle_Interface(oracleAddress).getTradeRate(
            collateralTokenAddress,
            loanTokenAddress
        );
        if (collateralToLoanRate == 0) {
            return 0;
        }
        
        collateralTokenAmount = loanTokenAmountFilled
                                    .mul(10**18)
                                    .div(collateralToLoanRate)
                                    .mul(initialMarginAmount)
                                    .div(100);
    }

    function _getTotalInterestRequired(
        uint loanTokenAmount,
        uint loanTokenAmountFilled,
        uint interestAmount,
        uint expirationUnixTimestampSec,
        uint loanStartUnixTimestampSec)
        internal
        pure
        returns (uint totalInterestRequired)
    {
        totalInterestRequired = _getPartialAmountNoError(loanTokenAmountFilled, loanTokenAmount, expirationUnixTimestampSec.sub(loanStartUnixTimestampSec).mul(interestAmount).div(86400));
    }

    /// @dev Checks if rounding error > 0.1%.
    /// @param numerator Numerator.
    /// @param denominator Denominator.
    /// @param target Value to multiply with numerator/denominator.
    /// @return Rounding error is present.
    function _isRoundingError(uint numerator, uint denominator, uint target)
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
    function _getPartialAmount(uint numerator, uint denominator, uint target)
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
        require(!_isRoundingError(numerator, denominator, target));
        return _getPartialAmount(numerator, denominator, target);
    }

    /// @dev Verifies that an order signature is valid.
    /// @param signer address of signer.
    /// @param hash Signed Keccak-256 hash.
    /// @param signature ECDSA signature in raw bytes (rsv).
    /// @return Validity of order signature.
    function _isValidSignature(
        address signer,
        bytes32 hash,
        bytes signature)
        internal
        pure
        returns (bool)
    {
        uint8 v;
	    bytes32 r;
        bytes32 s;
        (v, r, s) = _getSignatureParts(signature);
        return signer == ecrecover(
            keccak256("\x19Ethereum Signed Message:\n32", hash),
            v,
            r,
            s
        );
    }

    /// @param signature ECDSA signature in raw bytes (rsv).
    function _getSignatureParts(
        bytes signature)
        internal
        pure
        returns (
            uint8 v,
            bytes32 r,
            bytes32 s)
    {
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := mload(add(signature, 65))
        }
        if (v < 27) {
            v = v + 27;
        }
    }

    // Note: The oracle has to fill all the source token, or the trade should fail
    function _tradePositionWithOracle(
        LoanOrder loanOrder,
        LoanPosition memory loanPosition,
        address tradeTokenAddress,
        bool isLiquidation)
        internal
        returns (uint)
    {
        // transfer the current position token to the Oracle contract
        if (!B0xVault(VAULT_CONTRACT).transferToken(
            loanPosition.positionTokenAddressFilled,
            loanOrder.oracleAddress,
            loanPosition.positionTokenAmountFilled)) {
            return intOrRevert(0,1441);
        }

        uint tradeTokenAmountReceived;
        if (isLiquidation) {
            tradeTokenAmountReceived = Oracle_Interface(loanOrder.oracleAddress).verifyAndLiquidate(
                loanOrder.loanTokenAddress,
                loanPosition.positionTokenAddressFilled,
                loanPosition.collateralTokenAddressFilled,
                loanPosition.loanTokenAmountFilled,
                loanPosition.positionTokenAmountFilled,
                loanPosition.collateralTokenAmountFilled,
                loanOrder.maintenanceMarginAmount);
        } else {
            tradeTokenAmountReceived = Oracle_Interface(loanOrder.oracleAddress).doTrade(
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
            Oracle_Interface(loanOrder.oracleAddress).getCurrentMarginAmount(
                loanOrder.loanTokenAddress,
                loanPosition.positionTokenAddressFilled,
                loanPosition.collateralTokenAddressFilled,
                loanPosition.loanTokenAmountFilled,
                loanPosition.positionTokenAmountFilled,
                loanPosition.collateralTokenAmountFilled)
        );
    }
}