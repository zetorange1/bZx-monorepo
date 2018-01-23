pragma solidity ^0.4.18;

import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import './interfaces/Exchange0x_Wrapper_Interface.sol';
import './interfaces/Exchange0x_Interface.sol';
import './interfaces/EIP20.sol';
import './modifiers/B0xOwnable.sol';
import './Helpers.sol';


contract Exchange0x_Wrapper is Exchange0x_Wrapper_Interface, Helpers, B0xOwnable {
    using SafeMath for uint256;

    address public VAULT_CONTRACT;
    address public ZRX_TOKEN_CONTRACT;
    address public EXCHANGE_CONTRACT;

    event LogErrorText(string errorTxt, uint errorValue, bytes32 indexed orderHash);

    // Only the owner (b0x contract) can directly deposit ether
    function() 
        public {
        revert();
    }

    function Exchange0x_Wrapper(
        address _vault,
        address _exchange, 
        address _zrxToken) 
        public 
    {
        VAULT_CONTRACT = _vault;
        EXCHANGE_CONTRACT = _exchange;
        ZRX_TOKEN_CONTRACT = _zrxToken;

        // for testing only!
        DEBUG_MODE = true;
    }

   function take0xTrade(
        bytes32 loanOrderHash, // b0x will only pass in a valid loanOrderHash, so no check needed
        address oracleAddress,
        uint loanTokenAmountToUse,
        bytes orderData0x, // 0x order arguments converted to hex, padded to 32 bytes, and concatenated
        bytes signature)
        public
        onlyB0x
        returns (
            address tradeTokenAddress,
            uint tradeTokenAmount,
            uint loanTokenUsedAmount)
    {
        // address[5], uint[6], uint8, bytes32, bytes32
        var (orderAddresses0x, orderValues0x) = getOrderValuesFromData(orderData0x);

    /*
        orderAddresses0x[0], // maker
        orderAddresses0x[1], // taker
        orderAddresses0x[2], // makerToken
        orderAddresses0x[3], // takerToken
        orderAddresses0x[4], // feeRecipient
        orderValues0x[0],    // makerTokenAmount
        orderValues0x[1],    // takerTokenAmount
        orderValues0x[2],    // makerFee
        orderValues0x[3],    // takerFee
        orderValues0x[4],    // expirationTimestampInSec
        orderValues0x[5]     // salt
    */

        loanTokenUsedAmount = _take0xTrade(
            loanOrderHash,
            loanTokenAmountToUse,
            orderAddresses0x,
            orderValues0x,
            signature);

        if (tradeTokenAmount == 0) {
            LogErrorText("error: 0x trade did not fill!", 0, loanOrderHash);
            voidOrRevert(); return;
        }

        tradeTokenAmount = getPartialAmount(
            loanTokenUsedAmount,
            orderValues0x[1], // takerTokenAmount (aka loanTokenAmount)
            orderValues0x[0] // makerTokenAmount (aka tradeTokenAmount)
        );

        // transfer the tradeToken to the oracle
        if (!EIP20(orderAddresses0x[2]).transfer(oracleAddress, tradeTokenAmount))
            revert();

        if (loanTokenUsedAmount < loanTokenAmountToUse) {
            // transfer the unused loanToken back to the vault
            if (!EIP20(orderAddresses0x[3]).transfer(VAULT_CONTRACT, loanTokenAmountToUse-loanTokenUsedAmount))
                revert();
        }

        return (
            orderAddresses0x[2], // makerToken (aka tradeTokenAddress)
            tradeTokenAmount,
            loanTokenUsedAmount
        );
    }

   function _take0xTrade(
        bytes32 loanOrderHash,
        uint loanTokenAmountToUse,
        address[5] orderAddresses0x,
        uint[6] orderValues0x,
        bytes signature)
        private
        returns (uint) 
    {
        if (orderAddresses0x[4] != address(0) && // feeRecipient
                orderValues0x[3] > 0 // takerFee
        ) {
            if (!EIP20(ZRX_TOKEN_CONTRACT).transferFrom(msg.sender, this, orderValues0x[3])) {
                LogErrorText("error: b0x can't transfer ZRX from trader", 0, loanOrderHash);
                return intOrRevert(0);
            }
        }

        var (v, r, s) = getSignatureParts(signature);

        // 0x order will fail if loanTokenAmountToUse is too high
        uint loanTokenUsedAmount = Exchange0x_Interface(EXCHANGE_CONTRACT).fillOrder(
            orderAddresses0x,
            orderValues0x,
            loanTokenAmountToUse,
            true,
            v,
            r,
            s);
        if (loanTokenUsedAmount == 0) {
            LogErrorText("error: 0x order failed!", 0, loanOrderHash);
            return intOrRevert(0);
        }

        return loanTokenUsedAmount;
    }

    function getOrderValuesFromData(
        bytes orderData0x)
        public
        pure
        returns (
            address[5] orderAddresses,
            uint[6] orderValues) 
    {
        address maker;
        address taker;
        address makerToken;
        address takerToken;
        address feeRecipient;
        uint makerTokenAmount;
        uint takerTokenAmount;
        uint makerFee;
        uint takerFee;
        uint expirationTimestampInSec;
        uint salt;
        assembly {
            maker := mload(add(orderData0x, 32))
            taker := mload(add(orderData0x, 64))
            makerToken := mload(add(orderData0x, 96))
            takerToken := mload(add(orderData0x, 128))
            feeRecipient := mload(add(orderData0x, 160))
            makerTokenAmount := mload(add(orderData0x, 192))
            takerTokenAmount := mload(add(orderData0x, 224))
            makerFee := mload(add(orderData0x, 256))
            takerFee := mload(add(orderData0x, 288))
            expirationTimestampInSec := mload(add(orderData0x, 320))
            salt := mload(add(orderData0x, 352))
        }
        orderAddresses = [
            maker,
            taker,
            makerToken,
            takerToken,
            feeRecipient
        ];
        orderValues = [
            makerTokenAmount,
            takerTokenAmount,
            makerFee,
            takerFee,
            expirationTimestampInSec,
            salt
        ];
    }

    /// @param signature ECDSA signature in raw bytes (rsv).
    function getSignatureParts(
        bytes signature)
        public
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

    /// @dev Calculates partial value given a numerator and denominator.
    /// @param numerator Numerator.
    /// @param denominator Denominator.
    /// @param target Value to calculate partial of.
    /// @return Partial value of target.
    function getPartialAmount(uint numerator, uint denominator, uint target)
        public
        pure
        returns (uint)
    {
        return SafeMath.div(SafeMath.mul(numerator, target), denominator);
    }

    function setVault (
        address _vault)
        public
        onlyOwner {
        VAULT_CONTRACT = _vault;
    }

    function set0xExchange (
        address _exchange)
        public
        onlyOwner {
        EXCHANGE_CONTRACT = _exchange;
    }

    function setZRXToken (
        address _zrxToken)
        public
        onlyOwner {
        ZRX_TOKEN_CONTRACT = _zrxToken;
    }
}
