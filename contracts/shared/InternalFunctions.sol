

pragma solidity ^0.4.24; // solhint-disable-line compiler-fixed

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../modules/B0xStorage.sol";
import "../B0xVault.sol";
import "../oracle/OracleInterface.sol";


contract InternalFunctions is B0xStorage {
    using SafeMath for uint256;

    // Allowed 0x signature types.
    enum SignatureType {
        Illegal,    // 0x00, default value
        Invalid,    // 0x01
        EIP712,     // 0x02
        EthSign,    // 0x03
        Caller,     // 0x04
        Wallet,     // 0x05
        Validator,  // 0x06
        PreSigned,  // 0x07
        Trezor      // 0x08
    }

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
        /*uint loanToCollateralRate = OracleInterface(oracleAddress).getTradeRate(
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

        uint collateralToLoanRate = OracleInterface(oracleAddress).getTradeRate(
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
        require(!_isRoundingError(numerator, denominator, target), "rounding error");
        return _getPartialAmount(numerator, denominator, target);
    }

    /// @dev Verifies that an order signature is valid.
    /// @param signer address of signer.
    /// @param hash Signed Keccak-256 hash.
    /// @param signature ECDSA signature in raw bytes (rsv) + signatureType.
    /// @return Validity of order signature.
    function _isValidSignature(
        address signer,
        bytes32 hash,
        bytes signature)
        internal
        pure
        returns (bool)
    {
        SignatureType signatureType;
        uint8 v;
        bytes32 r;
        bytes32 s;
        (signatureType, v, r, s) = _getSignatureParts(signature);

        // Signature using EIP712
        if (signatureType == SignatureType.EIP712) {
            return signer == ecrecover(
                hash,
                v,
                r,
                s
            );            

        // Signed using web3.eth_sign
        } else if (signatureType == SignatureType.EthSign) {
            return signer == ecrecover(
                keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash)),
                v,
                r,
                s
            );

        // Signature from Trezor hardware wallet.
        // It differs from web3.eth_sign in the encoding of message length
        // (Bitcoin varint encoding vs ascii-decimal, the latter is not
        // self-terminating which leads to ambiguities).
        // See also:
        // https://en.bitcoin.it/wiki/Protocol_documentation#Variable_length_integer
        // https://github.com/trezor/trezor-mcu/blob/master/firmware/ethereum.c#L602
        // https://github.com/trezor/trezor-mcu/blob/master/firmware/crypto.c#L36
        } else if (signatureType == SignatureType.Trezor) {
            return signer == ecrecover(
                keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n\x41", hash)),
                v,
                r,
                s
            );
        }

        // Anything else is illegal (We do not return false because
        // the signature may actually be valid, just not in a format
        // that we currently support. In this case returning false
        // may lead the caller to incorrectly believe that the
        // signature was invalid.)
        revert("UNSUPPORTED_SIGNATURE_TYPE");
    }

    /// @param signature ECDSA signature in raw bytes (rsv).
    /// @dev This supports 0x V2 SignatureType
    function _getSignatureParts(
        bytes signature)
        internal
        pure
        returns (
            SignatureType signatureType,
            uint8 v,
            bytes32 r,
            bytes32 s)
    {
        require(
            signature.length == 66,
            "INVALID_SIGNATURE_LENGTH"
        );

        uint8 t;
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := mload(add(signature, 65))
            t := mload(add(signature, 66))
        }
        signatureType = SignatureType(t);
        if (v < 27) {
            v = v + 27;
        }
    }

    function _getInterest(
        LoanOrder loanOrder,
        LoanPosition loanPosition)
        internal
        view
        returns (InterestData interestData)
    {
        uint interestTime = block.timestamp;
        if (interestTime > loanOrder.expirationUnixTimestampSec) {
            interestTime = loanOrder.expirationUnixTimestampSec;
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
        if (!B0xVault(vaultContract).withdrawToken(
            loanPosition.positionTokenAddressFilled,
            loanOrder.oracleAddress,
            loanPosition.positionTokenAmountFilled)) {
            revert("InternalFunctions::_tradePositionWithOracle: B0xVault.withdrawToken failed");
        }

        uint tradeTokenAmountReceived;
        if (isLiquidation) {
            tradeTokenAmountReceived = OracleInterface(loanOrder.oracleAddress).verifyAndLiquidate(
                loanOrder.loanTokenAddress,
                loanPosition.positionTokenAddressFilled,
                loanPosition.collateralTokenAddressFilled,
                loanPosition.loanTokenAmountFilled,
                loanPosition.positionTokenAmountFilled,
                loanPosition.collateralTokenAmountFilled,
                loanOrder.maintenanceMarginAmount);
        } else if (isManual) {
            tradeTokenAmountReceived = OracleInterface(loanOrder.oracleAddress).doManualTrade(
                loanPosition.positionTokenAddressFilled,
                tradeTokenAddress,
                loanPosition.positionTokenAmountFilled);
        } 
        else {
            tradeTokenAmountReceived = OracleInterface(loanOrder.oracleAddress).doTrade(
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
            OracleInterface(loanOrder.oracleAddress).getCurrentMarginAmount(
                loanOrder.loanTokenAddress,
                loanPosition.positionTokenAddressFilled,
                loanPosition.collateralTokenAddressFilled,
                loanPosition.loanTokenAmountFilled,
                loanPosition.positionTokenAmountFilled,
                loanPosition.collateralTokenAmountFilled)
        );
    }
}