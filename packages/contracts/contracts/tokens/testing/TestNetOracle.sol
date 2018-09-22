/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.4.24;
pragma experimental ABIEncoderV2;

import "../../oracle/BZxOracle.sol";


contract Faucet {
    function oracleExchange(
        address getToken,
        address receiver,
        uint getTokenAmount)
        public
        returns (bool);
}


contract TestNetOracle is BZxOracle {
    using SafeMath for uint256;

    address public faucetContract;

    constructor(
        address _vaultContract,
        address _kyberContract,
        address _wethContract,
        address _bZRxTokenContract)
        public
        BZxOracle(
            _vaultContract,
            _kyberContract,
            _wethContract,
            _bZRxTokenContract)
        payable
    {}

    function() public payable {} // solhint-disable-line no-empty-blocks

    /*
    * Owner functions
    */

    function setFaucetContractAddress(
        address newAddress) 
        public
        onlyOwner
    {
        require(newAddress != faucetContract && newAddress != address(0));
        faucetContract = newAddress;
    }

    /*
    * Internal functions
    */

    function _getExpectedRate(
        address sourceTokenAddress,
        address destTokenAddress,
        uint /* sourceTokenAmount */)
        internal
        view 
        returns (uint expectedRate, uint slippageRate)
    {
        if (sourceTokenAddress == destTokenAddress) {
            expectedRate = 10**18;
            slippageRate = 0;
        } else {
            expectedRate = 10**18;
            //expectedRate = (uint(block.blockhash(block.number-1)) % 100 + 1).mul(10**18);
            slippageRate = 0;
        }
    }

    function _doTrade(
        address sourceTokenAddress,
        address destTokenAddress,
        uint sourceTokenAmount,
        uint maxDestTokenAmount)
        internal
        returns (uint destTokenAmount)
    {
        if (sourceTokenAddress == destTokenAddress) {
            if (maxDestTokenAmount < MAX_FOR_KYBER) {
                destTokenAmount = maxDestTokenAmount;
            } else {
                destTokenAmount = sourceTokenAmount;
            }

            if (maxDestTokenAmount < sourceTokenAmount) {
                destTokenAmount = maxDestTokenAmount;
            } else {
                destTokenAmount = sourceTokenAmount;
            }

            if (!_transferToken(
                destTokenAddress,
                vaultContract,
                destTokenAmount)) {
                revert("TestNetOracle::_doTrade: _transferToken failed");
            }
        } else {
            (uint tradeRate,) = getTradeData(sourceTokenAddress, destTokenAddress, 0);
            destTokenAmount = sourceTokenAmount.mul(tradeRate).div(_getDecimalPrecision(sourceTokenAddress, destTokenAddress));
            if (destTokenAmount > maxDestTokenAmount) {
                destTokenAmount = maxDestTokenAmount;
            }
            _transferToken(
                sourceTokenAddress,
                faucetContract,
                sourceTokenAmount);
            require(Faucet(faucetContract).oracleExchange(
                destTokenAddress,
                vaultContract,
                destTokenAmount), "TestNetOracle::_doTrade: trade failed");
        }
    }

    function _doTradeForEth(
        address /*sourceTokenAddress*/,
        uint /* sourceTokenAmount */,
        address /*receiver*/,
        uint /* destEthAmountNeeded */)
        internal
        returns (uint destTokenAmountReceived)
    {
        destTokenAmountReceived = 0;//destEthAmountNeeded < sourceTokenAmount ? destEthAmountNeeded : sourceTokenAmount;
    }

    function _doTradeWithEth(
        address destTokenAddress,
        uint sourceEthAmount,
        address receiver,
        uint destTokenAmountNeeded)
        internal
        returns (uint destTokenAmountReceived)
    {
        destTokenAmountReceived = destTokenAmountNeeded < sourceEthAmount ? destTokenAmountNeeded : sourceEthAmount;
        require(Faucet(faucetContract).oracleExchange(
            destTokenAddress,
            receiver,
            destTokenAmountReceived), "TestNetOracle::_doTrade: trade failed");
    }
}
