/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.2;
pragma experimental ABIEncoderV2;

import "./BZxOracle.sol";


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

    mapping (address => mapping (address => uint)) public rates;

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

    function() external payable {} // solhint-disable-line no-empty-blocks

    /*
    * Owner functions
    */

    function setRates(
        address sourceTokenAddress,
        address destTokenAddress,
        uint rate)
        public
        onlyOwner
    {
        if (sourceTokenAddress != destTokenAddress) {
            rates[sourceTokenAddress][destTokenAddress] = rate;
            rates[destTokenAddress][sourceTokenAddress] = SafeMath.div(10**36, rate);
        }
    }

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
            if (rates[sourceTokenAddress][destTokenAddress] != 0) {
                expectedRate = rates[sourceTokenAddress][destTokenAddress];
            } else {
                uint sourceToEther = rates[sourceTokenAddress][wethContract] != 0 ?
                    rates[sourceTokenAddress][wethContract] :
                    10**18;
                uint etherToDest = rates[wethContract][destTokenAddress] != 0 ?
                    rates[wethContract][destTokenAddress] :
                    10**18;

                expectedRate = sourceToEther.mul(etherToDest).div(10**18);
            }
            slippageRate = 0;
        }
    }

    function _doTrade(
        address sourceTokenAddress,
        address destTokenAddress,
        uint sourceTokenAmount,
        uint maxDestTokenAmount)
        internal
        returns (uint destTokenAmountReceived, uint sourceTokenAmountUsed)
    {
        if (maxDestTokenAmount > MAX_FOR_KYBER)
            maxDestTokenAmount = MAX_FOR_KYBER;
        
        if (sourceTokenAddress == destTokenAddress) {
            if (maxDestTokenAmount < sourceTokenAmount) {
                destTokenAmountReceived = maxDestTokenAmount;
                sourceTokenAmountUsed = maxDestTokenAmount;
            } else {
                destTokenAmountReceived = sourceTokenAmount;
                sourceTokenAmountUsed = sourceTokenAmount;
            }

            if (!_transferToken(
                destTokenAddress,
                vaultContract,
                destTokenAmountReceived)) {
                revert("TestNetOracle::_doTrade: _transferToken failed");
            }

            if (sourceTokenAmountUsed < sourceTokenAmount) {
                // send unused source token back
                if (!_transferToken(
                    sourceTokenAddress,
                    vaultContract,
                    sourceTokenAmount-sourceTokenAmountUsed)) {
                    revert("TestNetOracle::_doTrade: _transferToken failed");
                }
            }
        } else {
            (uint tradeRate,) = getTradeData(sourceTokenAddress, destTokenAddress, 0);
            uint precision = _getDecimalPrecision(sourceTokenAddress, destTokenAddress);
            destTokenAmountReceived = sourceTokenAmount.mul(tradeRate).div(precision);

            if (destTokenAmountReceived > maxDestTokenAmount) {
                destTokenAmountReceived = maxDestTokenAmount;
                sourceTokenAmountUsed = destTokenAmountReceived.mul(precision).div(tradeRate);
            } else {
                sourceTokenAmountUsed = sourceTokenAmount;
            }

            _transferToken(
                sourceTokenAddress,
                faucetContract,
                sourceTokenAmountUsed);
            require(Faucet(faucetContract).oracleExchange(
                destTokenAddress,
                vaultContract,
                destTokenAmountReceived), "TestNetOracle::_doTrade: trade failed");

            if (sourceTokenAmountUsed < sourceTokenAmount) {
                // send unused source token back
                if (!_transferToken(
                    sourceTokenAddress,
                    vaultContract,
                    sourceTokenAmount-sourceTokenAmountUsed)) {
                    revert("TestNetOracle::_doTrade: _transferToken failed");
                }
            }
        }
    }

    function _doTradeForWeth(
        address /*sourceTokenAddress*/,
        uint /* sourceTokenAmount */,
        address /*receiver*/,
        uint /* destEthAmountNeeded */)
        internal
        returns (uint destTokenAmountReceived)
    {
        destTokenAmountReceived = 0;//destEthAmountNeeded < sourceTokenAmount ? destEthAmountNeeded : sourceTokenAmount;
    }

    function _doTradeWithWeth(
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
