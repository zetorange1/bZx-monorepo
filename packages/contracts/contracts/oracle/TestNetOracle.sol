/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.3;
pragma experimental ABIEncoderV2;

import "./BZxOracle.sol";


contract Faucet {
    function oracleExchange(
        address getToken,
        address receiver,
        uint256 getTokenAmount)
        public
        returns (bool);
}


contract TestNetOracle is BZxOracle {
    using SafeMath for uint256;

    address public faucetContract;

    mapping (address => mapping (address => uint256)) public rates;

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
        uint256 rate)
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
        uint256 /* sourceTokenAmount */)
        internal
        view 
        returns (uint256 expectedRate, uint256 slippageRate)
    {
        if (sourceTokenAddress == destTokenAddress) {
            expectedRate = 10**18;
            slippageRate = 0;
        } else {
            if (rates[sourceTokenAddress][destTokenAddress] != 0) {
                expectedRate = rates[sourceTokenAddress][destTokenAddress];
            } else {
                uint256 sourceToEther = rates[sourceTokenAddress][wethContract] != 0 ?
                    rates[sourceTokenAddress][wethContract] :
                    10**18;
                uint256 etherToDest = rates[wethContract][destTokenAddress] != 0 ?
                    rates[wethContract][destTokenAddress] :
                    10**18;

                expectedRate = sourceToEther.mul(etherToDest).div(10**18);
            }
            slippageRate = 0;
        }
    }

    function _trade(
        address sourceTokenAddress,
        address destTokenAddress,
        address receiverAddress,
        uint256 sourceTokenAmount,
        uint256 maxDestTokenAmount)
        internal
        returns (uint256 destTokenAmountReceived, uint256 sourceTokenAmountUsed)
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

            if (receiverAddress != address(this)) {
                if (!_transferToken(
                    destTokenAddress,
                    receiverAddress,
                    destTokenAmountReceived)) {
                    revert("TestNetOracle::_trade: _transferToken failed");
                }

                if (sourceTokenAmountUsed < sourceTokenAmount) {
                    // send unused source token back
                    if (!_transferToken(
                        sourceTokenAddress,
                        receiverAddress,
                        sourceTokenAmount-sourceTokenAmountUsed)) {
                        revert("TestNetOracle::_trade: _transferToken failed");
                    }
                }
            }
        } else {
            (uint256 tradeRate, uint256 precision,) = getTradeData(sourceTokenAddress, destTokenAddress, 0);
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
                receiverAddress,
                destTokenAmountReceived), "TestNetOracle::_trade: trade failed");

            if (receiverAddress != address(this)) {
                if (sourceTokenAmountUsed < sourceTokenAmount) {
                    // send unused source token back
                    if (!_transferToken(
                        sourceTokenAddress,
                        receiverAddress,
                        sourceTokenAmount-sourceTokenAmountUsed)) {
                        revert("TestNetOracle::_trade: _transferToken failed");
                    }
                }
            }
        }
    }
}
