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

    uint256 public slippageMultiplier = 100 ether;

    constructor(
        address _vaultContract,
        address _kyberContract,
        address _wethContract,
        address _bZRxTokenContract,
        address _oracleNotifier,
        address _feeWallet)
        public
        BZxOracle(
            _vaultContract,
            _kyberContract,
            _wethContract,
            _bZRxTokenContract,
            _oracleNotifier,
            _feeWallet)
        payable
    {}

    function()
        external
        payable
    {
        if (msg.sender == bZxContractAddress) {
            updateEMA(tx.gasprice);
        }

        // always returns true
        assembly {
            mstore(0, 1)
            return(0, 32)
        }
    }

    function liquidatePosition(
        BZxObjects.LoanOrder memory loanOrder,
        BZxObjects.LoanPosition memory loanPosition,
        uint256 maxDestTokenAmount)
        public
        onlyBZx
        returns (uint256 destTokenAmountReceived, uint256 sourceTokenAmountUsed)
    {
        (destTokenAmountReceived, sourceTokenAmountUsed) = _trade(
            loanPosition.positionTokenAddressFilled,
            loanOrder.loanTokenAddress,
            vaultContract,
            vaultContract,
            loanPosition.positionTokenAmountFilled,
            maxDestTokenAmount < 10**28 ? maxDestTokenAmount : 10**28,
            0); // minConversionRate
        require(destTokenAmountReceived > 0, "destTokenAmountReceived == 0");
    }

    function getTradeData(
        address sourceTokenAddress,
        address destTokenAddress,
        uint256 sourceTokenAmount)
        public
        view
        returns (uint256 sourceToDestRate, uint256 sourceToDestPrecision, uint256 destTokenAmount)
    {
        uint256 sourceTokenDecimals = decimals[sourceTokenAddress];
        if (sourceTokenDecimals == 0)
            sourceTokenDecimals = EIP20(sourceTokenAddress).decimals();
        sourceTokenDecimals = sourceTokenDecimals >= 2 ?
            sourceTokenDecimals-2 :
            sourceTokenDecimals;

        if (sourceTokenAmount < 10**28) {
            (sourceToDestRate,) = _getExpectedRate(
                sourceTokenAddress,
                destTokenAddress,
                sourceTokenAmount
            );

            if (sourceTokenAmount > 10**sourceTokenDecimals) {
                // simulate slippage (slippage percent: 100 ether-slippageMultiplier)
                sourceToDestRate = sourceToDestRate.mul(slippageMultiplier).div(100 ether);
            }

            sourceToDestPrecision = _getDecimalPrecision(sourceTokenAddress, destTokenAddress);

            destTokenAmount = sourceTokenAmount
                                .mul(sourceToDestRate)
                                .div(sourceToDestPrecision);
        } else {
            (sourceToDestRate,) = _getExpectedRate(
                sourceTokenAddress,
                destTokenAddress,
                10**sourceTokenDecimals
            );

            sourceToDestPrecision = _getDecimalPrecision(sourceTokenAddress, destTokenAddress);
        }
    }

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

    function setSlippageMultiplier(
        uint256 _slippageMultiplier)
        public
        onlyOwner
    {
        require (slippageMultiplier != _slippageMultiplier && _slippageMultiplier <= 100 ether);
        slippageMultiplier = _slippageMultiplier;
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
        address returnToSenderAddress,
        uint256 sourceTokenAmount,
        uint256 maxDestTokenAmount,
        uint256 /* minConversionRate */)
        internal
        returns (uint256 destTokenAmountReceived, uint256 sourceTokenAmountUsed)
    {
        if (sourceTokenAmount == 0 || maxDestTokenAmount == 0) {
            return (0,0);
        }

        if (maxDestTokenAmount > 10**28)
            maxDestTokenAmount = 10**28;
        
        if (sourceTokenAddress == destTokenAddress) {
            if (maxDestTokenAmount < sourceTokenAmount) {
                destTokenAmountReceived = maxDestTokenAmount;
                sourceTokenAmountUsed = maxDestTokenAmount;
            } else {
                destTokenAmountReceived = sourceTokenAmount;
                sourceTokenAmountUsed = sourceTokenAmount;
            }

            if (receiverAddress == returnToSenderAddress) {
                if (receiverAddress != address(this))
                    if (!_transferToken(
                        destTokenAddress,
                        receiverAddress,
                        sourceTokenAmount)) {
                        revert("TestNetOracle::_trade: _transferToken failed");
                    }
            } else {
                if (receiverAddress != address(this))
                    if (!_transferToken(
                        destTokenAddress,
                        receiverAddress,
                        destTokenAmountReceived)) {
                        revert("TestNetOracle::_trade: _transferToken failed");
                    }

                if (returnToSenderAddress != address(this))
                    if (sourceTokenAmountUsed < sourceTokenAmount) {
                        // send unused source token back
                        if (!_transferToken(
                            sourceTokenAddress,
                            returnToSenderAddress,
                            sourceTokenAmount-sourceTokenAmountUsed)) {
                            revert("TestNetOracle::_trade: _transferToken failed");
                        }
                    }
            }
        } else {
            (uint256 tradeRate, uint256 precision,) = getTradeData(sourceTokenAddress, destTokenAddress, sourceTokenAmount);
            destTokenAmountReceived = sourceTokenAmount.mul(tradeRate).div(precision);

            if (destTokenAmountReceived > maxDestTokenAmount) {
                destTokenAmountReceived = maxDestTokenAmount;
                sourceTokenAmountUsed = destTokenAmountReceived.mul(precision).div(tradeRate);
            } else {
                sourceTokenAmountUsed = sourceTokenAmount;
            }

            if (sourceTokenAmountUsed == 0 || destTokenAmountReceived == 0) {
                sourceTokenAmountUsed = 0;
                destTokenAmountReceived = 0;
            } else {
                _transferToken(
                    sourceTokenAddress,
                    faucetContract,
                    sourceTokenAmountUsed);
                require(Faucet(faucetContract).oracleExchange(
                    destTokenAddress,
                    receiverAddress,
                    destTokenAmountReceived), "TestNetOracle::_trade: trade failed");
            }

            if (returnToSenderAddress != address(this)) {
                if (sourceTokenAmountUsed < sourceTokenAmount) {
                    // send unused source token back
                    if (!_transferToken(
                        sourceTokenAddress,
                        returnToSenderAddress,
                        sourceTokenAmount-sourceTokenAmountUsed)) {
                        revert("TestNetOracle::_trade: _transferToken failed");
                    }
                }
            }
        }
    }
}
