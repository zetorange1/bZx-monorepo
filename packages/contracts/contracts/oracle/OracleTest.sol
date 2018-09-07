/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
 
pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

import "../tokens/EIP20Wrapper.sol";


// solhint-disable-next-line contract-name-camelcase
interface KyberNetwork_Interface {
    /// @notice use token address ETH_TOKEN_ADDRESS for ether
    /// @dev makes a trade between src and dest token and send dest token to destAddress
    /// @param src Src token
    /// @param srcAmount amount of src tokens
    /// @param dest   Destination token
    /// @param destAddress Address to send tokens to
    /// @param maxDestAmount A limit on the amount of dest tokens
    /// @param minConversionRate The minimal conversion rate. If actual rate is lower, trade is canceled.
    /// @param walletId is the wallet ID to send part of the fees
    /// @return amount of actual dest tokens
    function trade(
        address src,
        uint srcAmount,
        address dest,
        address destAddress,
        uint maxDestAmount,
        uint minConversionRate,
        address walletId
    )
        external
        payable
        returns(uint);

    /// @notice use token address ETH_TOKEN_ADDRESS for ether
    function getExpectedRate(
        address src,
        address dest,
        uint srcQty)
        external
        view
        returns (uint expectedRate, uint slippageRate);
}


contract OracleTest is EIP20Wrapper, Ownable {
    using SafeMath for uint256;

    // this is the value the Kyber portal uses when setting a very high maximum number
    uint internal constant MAX_FOR_KYBER = 57896044618658097711785492504343953926634992332820282019728792003956564819968;

    address internal constant KYBER_ETH_TOKEN_ADDRESS = 0x00eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee;

/* solhint-disable var-name-mixedcase */
    address public kyberContract = 0x818E6FECD516Ecc3849DAf6845e3EC868087B755;
    address public wethContract = 0xc778417E063141139Fce010982780140Aa0cD5Ab;
/* solhint-enable var-name-mixedcase */

    constructor() public payable {}

    function() public payable {}

    function testTrade(
        address destTokenAddress,
        uint sourceEthAmount)
        public
        onlyOwner
    {
        bool result = kyberContract.call
            .gas(gasleft())
            .value(sourceEthAmount)( // send Ether along
            bytes4(keccak256("trade(address,uint256,address,address,uint256,uint256,address)")),
            KYBER_ETH_TOKEN_ADDRESS,
            sourceEthAmount,
            destTokenAddress,
            this,
            MAX_FOR_KYBER,
            0, // no min coversation rate
            address(0)
        );

        assembly {
            let size := returndatasize
            let ptr := mload(0x40)
            returndatacopy(ptr, 0, size)
            switch result
            case 0 { return(0, 0x20) }
            default { return(ptr, size) }
        }

        /*function trade(
            address src,
            uint srcAmount,
            address dest,
            address destAddress,
            uint maxDestAmount,
            uint minConversionRate,
            address walletId
        );*/
    }

    function testTradeBad()
        public
        onlyOwner
    {
        bool result = kyberContract.call
            .gas(gasleft())
            .value(10**16)( // send Ether along
            bytes4(keccak256("trade(address,uint256,address,address,uint256,uint256,address)")),
            KYBER_ETH_TOKEN_ADDRESS,
            10**16,
            0x0000000000000000000000000000000000000001,
            this,
            100 ether,
            0, // no min coversation rate
            address(0)
        );

        assembly {
            let size := returndatasize
            let ptr := mload(0x40)
            returndatacopy(ptr, 0, size)
            switch result
            case 0 { return(0, 0x20) }
            default { return(ptr, size) }
        }

        /*function trade(
            address src,
            uint srcAmount,
            address dest,
            address destAddress,
            uint maxDestAmount,
            uint minConversionRate,
            address walletId
        );*/
    }

    function testTradeGood()
        public
        onlyOwner
    {
        bool result = kyberContract.call
            .gas(gasleft())
            .value(10**16)( // send Ether along
            bytes4(keccak256("trade(address,uint256,address,address,uint256,uint256,address)")),
            KYBER_ETH_TOKEN_ADDRESS,
            10**16,
            0xDb0040451F373949A4Be60dcd7b6B8D6E42658B6,
            this,
            100 ether,
            0, // no min coversation rate
            address(0)
        );

        assembly {
            let size := returndatasize
            let ptr := mload(0x40)
            returndatacopy(ptr, 0, size)
            switch result
            case 0 { return(0, 0x20) }
            default { return(ptr, size) }
        }

        /*function trade(
            address src,
            uint srcAmount,
            address dest,
            address destAddress,
            uint maxDestAmount,
            uint minConversionRate,
            address walletId
        );*/
    }

    /*
    * Public View functions
    */

    function isTradeSupported(
        address sourceTokenAddress,
        address destTokenAddress,
        uint sourceTokenAmount)
        public
        view
        returns (bool)
    {
        (uint rate, uint slippage) = _getExpectedRate(
            sourceTokenAddress,
            destTokenAddress,
            sourceTokenAmount);

        if (rate > 0 && (sourceTokenAmount == 0 || slippage > 0))
            return true;
        else
            return false;
    }

    function getTradeRate(
        address sourceTokenAddress,
        address destTokenAddress,
        uint sourceTokenAmount)
        public
        view
        returns (uint rate)
    {
        (rate,) = _getExpectedRate(
            sourceTokenAddress,
            destTokenAddress,
            sourceTokenAmount);
    }

    /*
    * Owner functions
    */

    function setKyberContractAddress(
        address newAddress)
        public
        onlyOwner
    {
        require(newAddress != kyberContract && newAddress != address(0));
        kyberContract = newAddress;
    }

    function setWethContractAddress(
        address newAddress)
        public
        onlyOwner
    {
        require(newAddress != wethContract && newAddress != address(0));
        wethContract = newAddress;
    }

    function transferEther(
        address to,
        uint value)
        public
        onlyOwner
        returns (bool)
    {
        uint amount = value;
        if (amount > address(this).balance) {
            amount = address(this).balance;
        }

        return (to.send(amount)); // solhint-disable-line check-send-result, multiple-sends
    }

    function transferToken(
        address tokenAddress,
        address to,
        uint value)
        public
        onlyOwner
        returns (bool)
    {
        return (_transferToken(
            tokenAddress,
            to,
            value
        ));
    }

    /*
    * Internal functions
    */

    // ref: https://github.com/KyberNetwork/smart-contracts/blob/master/integration.md#rate-query
    function _getExpectedRate(
        address sourceTokenAddress,
        address destTokenAddress,
        uint sourceTokenAmount)
        internal
        view
        returns (uint expectedRate, uint slippageRate)
    {
        if (sourceTokenAddress == destTokenAddress) {
            expectedRate = 10**18;
            slippageRate = 0;
        } else {
            if (sourceTokenAddress == wethContract) {
                (expectedRate, slippageRate) = KyberNetwork_Interface(kyberContract).getExpectedRate(
                    KYBER_ETH_TOKEN_ADDRESS,
                    destTokenAddress,
                    sourceTokenAmount
                );
            } else if (destTokenAddress == wethContract) {
                (expectedRate, slippageRate) = KyberNetwork_Interface(kyberContract).getExpectedRate(
                    sourceTokenAddress,
                    KYBER_ETH_TOKEN_ADDRESS,
                    sourceTokenAmount
                );
            } else {
                (uint sourceToEther, uint sourceToEtherSlippage) = KyberNetwork_Interface(kyberContract).getExpectedRate(
                    sourceTokenAddress,
                    KYBER_ETH_TOKEN_ADDRESS,
                    sourceTokenAmount
                );
                if (sourceTokenAmount > 0) {
                    sourceTokenAmount = sourceTokenAmount.mul(sourceToEther).div(10**18);
                }

                (uint etherToDest, uint etherToDestSlippage) = KyberNetwork_Interface(kyberContract).getExpectedRate(
                    KYBER_ETH_TOKEN_ADDRESS,
                    destTokenAddress,
                    sourceTokenAmount
                );

                expectedRate = sourceToEther.mul(etherToDest).div(10**18);
                slippageRate = sourceToEtherSlippage.mul(etherToDestSlippage).div(10**18);
            }
        }
    }

    function _transferToken(
        address tokenAddress,
        address to,
        uint value)
        internal
        returns (bool)
    {
        eip20Transfer(
            tokenAddress,
            to,
            value);

        return true;
    }
}
