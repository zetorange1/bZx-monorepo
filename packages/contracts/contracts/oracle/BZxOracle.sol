/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
 
pragma solidity 0.4.24;
pragma experimental ABIEncoderV2;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

import "../modifiers/BZxOwnable.sol";
import "../modifiers/EMACollector.sol";
import "../modifiers/GasRefunder.sol";

import "../tokens/EIP20.sol";
import "../tokens/EIP20Wrapper.sol";
import "./OracleInterface.sol";
import "../storage/BZxObjects.sol";

import "../shared/WETHInterface.sol";


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


contract BZxOracle is OracleInterface, EIP20Wrapper, EMACollector, GasRefunder, BZxOwnable {
    using SafeMath for uint256;

    // this is the value the Kyber portal uses when setting a very high maximum number
    uint internal constant MAX_FOR_KYBER = 57896044618658097711785492504343953926634992332820282019728792003956564819968;

    address internal constant KYBER_ETH_TOKEN_ADDRESS = 0x00eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee;

    mapping (address => uint) internal decimals;

    // Bounty hunters are remembursed from collateral
    // The oracle requires a minimum amount
    uint public minimumCollateralInWethAmount = 0.5 ether;

    // If true, the collateral must not be below minimumCollateralInWethAmount for the loan to be opened
    // If false, the loan can be opened, but it won't be insured by the insurance fund if collateral is below minimumCollateralInWethAmount
    bool public enforceMinimum = false;

    // Percentage of interest retained as fee
    // This will always be between 0 and 100
    uint public interestFeePercent = 10;

    // Percentage of EMA-based gas refund paid to bounty hunters after successfully liquidating a position
    uint public bountyRewardPercent = 110;

    // An upper bound estimation on the liquidation gas cost
    uint public gasUpperBound = 600000;

    // A threshold of minimum initial margin for loan to be insured by the guarantee fund
    // A value of 0 indicates that no threshold exists for this parameter.
    uint public minInitialMarginAmount = 0;

    // A threshold of minimum maintenance margin for loan to be insured by the guarantee fund
    // A value of 0 indicates that no threshold exists for this parameter.
    uint public minMaintenanceMarginAmount = 25;

    bool public isManualTradingAllowed = true;
/* solhint-disable var-name-mixedcase */
    address public vaultContract;
    address public kyberContract;
    address public wethContract;
    address public bZRxTokenContract;
/* solhint-enable var-name-mixedcase */

    mapping (uint => uint) public collateralInWethAmounts; // mapping of position ids to initial collateralInWethAmounts

    constructor(
        address _vaultContract,
        address _kyberContract,
        address _wethContract,
        address _bZRxTokenContract)
        public
        payable
    {
        vaultContract = _vaultContract;
        kyberContract = _kyberContract;
        wethContract = _wethContract;
        bZRxTokenContract = _bZRxTokenContract;

        // settings for EMACollector
        emaValue = 8 * 10**9 wei; // set an initial price average for gas (8 gwei)
        emaPeriods = 10; // set periods to use for EMA calculation
    }

    // The contract needs to be able to receive Ether from Kyber trades
    function() public payable {}


    function didTakeOrder(
        BZxObjects.LoanOrder memory /* loanOrder */,
        BZxObjects.LoanOrderAux /* loanOrderAux */,
        BZxObjects.LoanPosition loanPosition,
        address /* taker */,
        uint /* gasUsed */)
        public
        onlyBZx
        updatesEMA(tx.gasprice)
        returns (bool)
    {
        uint collateralInWethAmount;
        if (loanPosition.collateralTokenAddressFilled != wethContract) {
            (uint ethToCollateralRate,) = _getExpectedRate(
                wethContract,
                loanPosition.collateralTokenAddressFilled,
                0
            );
            collateralInWethAmount = loanPosition.collateralTokenAmountFilled.mul(_getDecimalPrecision(wethContract, loanPosition.collateralTokenAddressFilled)).div(ethToCollateralRate);
        } else {
            collateralInWethAmount = loanPosition.collateralTokenAmountFilled;
        }

        require(!enforceMinimum || collateralInWethAmount >= minimumCollateralInWethAmount, "collateral below minimum for BZxOracle");
        collateralInWethAmounts[loanPosition.positionId] = collateralInWethAmount;

        return true;
    }

    function didTradePosition(
        BZxObjects.LoanOrder memory loanOrder,
        BZxObjects.LoanPosition memory loanPosition,
        uint /* gasUsed */)
        public
        onlyBZx
        updatesEMA(tx.gasprice)
        returns (bool)
    {
        require (
            getCurrentMarginAmount(
                loanOrder.loanTokenAddress,
                loanPosition.positionTokenAddressFilled,
                loanPosition.collateralTokenAddressFilled,
                loanPosition.loanTokenAmountFilled,
                loanPosition.positionTokenAmountFilled,
                loanPosition.collateralTokenAmountFilled) > loanOrder.maintenanceMarginAmount.mul(10**18),
            "BZxOracle::didTradePosition: trade triggers liquidation"
        );

        return true;
    }

    function didPayInterest(
        BZxObjects.LoanOrder memory loanOrder,
        address lender,
        uint amountOwed,
        bool convert,
        uint /* gasUsed */)
        public
        onlyBZx
        updatesEMA(tx.gasprice)
        returns (bool)
    {
        // interestFeePercent is only editable by owner
        uint interestFee = amountOwed.mul(interestFeePercent).div(100);

        // Transfers the interest to the lender, less the interest fee.
        // The fee is retained by the oracle.
        if (!_transferToken(
            loanOrder.interestTokenAddress,
            lender,
            amountOwed.sub(interestFee))) {
            revert("BZxOracle::didPayInterest: _transferToken failed");
        }

        // TODO: Block withdrawal below a certain amount
        if (loanOrder.interestTokenAddress == wethContract) {
            // interest paid in WETH is withdrawn to Ether
            //WETHInterface(wethContract).withdraw(interestFee);
        } else if (convert && loanOrder.interestTokenAddress != bZRxTokenContract) {
            // interest paid in BZRX is retained as is, other tokens are sold for WETH
            _doTradeForWeth(
                loanOrder.interestTokenAddress,
                interestFee,
                this, // BZxOracle receives the WETH proceeds
                MAX_FOR_KYBER // no limit on the dest amount
            );
        }

        return true;
    }

    function didDepositCollateral(
        BZxObjects.LoanOrder memory /* loanOrder */,
        BZxObjects.LoanPosition memory /* loanPosition */,
        uint /* gasUsed */)
        public
        onlyBZx
        updatesEMA(tx.gasprice)
        returns (bool)
    {
        return true;
    }

    function didWithdrawCollateral(
        BZxObjects.LoanOrder memory /* loanOrder */,
        BZxObjects.LoanPosition memory /* loanPosition */,
        uint /* gasUsed */)
        public
        onlyBZx
        updatesEMA(tx.gasprice)
        returns (bool)
    {
        return true;
    }

    function didChangeCollateral(
        BZxObjects.LoanOrder memory /* loanOrder */,
        BZxObjects.LoanPosition memory /* loanPosition */,
        uint /* gasUsed */)
        public
        onlyBZx
        updatesEMA(tx.gasprice)
        returns (bool)
    {
        return true;
    }

    function didWithdrawProfit(
        BZxObjects.LoanOrder memory /* loanOrder */,
        BZxObjects.LoanPosition memory /* loanPosition */,
        uint /* profitAmount */,
        uint /* gasUsed */)
        public
        onlyBZx
        updatesEMA(tx.gasprice)
        returns (bool)
    {
        return true;
    }

    function didCloseLoan(
        BZxObjects.LoanOrder memory /* loanOrder */,
        BZxObjects.LoanPosition memory /* loanPosition */,
        address loanCloser,
        bool isLiquidation,
        uint gasUsed)
        public
        onlyBZx
        updatesEMA(tx.gasprice)
        returns (bool)
    {
        // sends gas and bounty reward to bounty hunter
        if (isLiquidation) {
            calculateAndSendRefund(
                loanCloser,
                gasUsed,
                emaValue,
                bountyRewardPercent);
        }

        return true;
    }
    
    function didChangeTraderOwnership(
        BZxObjects.LoanOrder memory /* loanOrder */,
        BZxObjects.LoanPosition memory /* loanPosition */,
        address /* oldTrader */,
        uint /* gasUsed */)
        public
        onlyBZx
        updatesEMA(tx.gasprice)
        returns (bool)
    {
        return true;
    }

    function didChangeLenderOwnership(
        BZxObjects.LoanOrder memory /* loanOrder */,
        address /* oldLender */,
        address /* newLender */,
        uint /* gasUsed */)
        public
        onlyBZx
        updatesEMA(tx.gasprice)
        returns (bool)
    {
        return true;
    }

    function didIncreaseLoanableAmount(
        BZxObjects.LoanOrder memory /* loanOrder */,
        address /* lender */,
        uint /* loanTokenAmountAdded */,
        uint /* totalNewFillableAmount */,
        uint /* gasUsed */)
        public
        onlyBZx
        updatesEMA(tx.gasprice)
        returns (bool)
    {
        return true;
    }


    function doManualTrade(
        address sourceTokenAddress,
        address destTokenAddress,
        uint sourceTokenAmount)
        public
        onlyBZx
        returns (uint destTokenAmount)
    {
        if (isManualTradingAllowed) {
            destTokenAmount = _doTrade(
                sourceTokenAddress,
                destTokenAddress,
                sourceTokenAmount,
                MAX_FOR_KYBER); // no limit on the dest amount
        }
        else {
            revert("Manual trading is disabled.");
        }
    }

    function doTrade(
        address sourceTokenAddress,
        address destTokenAddress,
        uint sourceTokenAmount)
        public
        onlyBZx
        returns (uint destTokenAmount)
    {
        destTokenAmount = _doTrade(
            sourceTokenAddress,
            destTokenAddress,
            sourceTokenAmount,
            MAX_FOR_KYBER); // no limit on the dest amount
    }

    function verifyAndLiquidate(
        BZxObjects.LoanOrder memory loanOrder,
        BZxObjects.LoanPosition memory loanPosition)
        public
        onlyBZx
        returns (uint destTokenAmount)
    {
        if (!shouldLiquidate(
            0x0,
            0x0,
            loanOrder.loanTokenAddress,
            loanPosition.positionTokenAddressFilled,
            loanPosition.collateralTokenAddressFilled,
            loanPosition.loanTokenAmountFilled,
            loanPosition.positionTokenAmountFilled,
            loanPosition.collateralTokenAmountFilled,
            loanOrder.maintenanceMarginAmount)) {
            return 0;
        }

        destTokenAmount = _doTrade(
            loanPosition.positionTokenAddressFilled,
            loanOrder.loanTokenAddress,
            loanPosition.positionTokenAmountFilled,
            MAX_FOR_KYBER); // no limit on the dest amount
    }

    // note: bZx will only call this function if isLiquidation=true or loanTokenAmountNeeded > 0
    function processCollateral(
        BZxObjects.LoanOrder memory loanOrder,
        BZxObjects.LoanPosition memory loanPosition,
        uint loanTokenAmountNeeded,
        bool isLiquidation) 
        public
        onlyBZx
        returns (uint loanTokenAmountCovered, uint collateralTokenAmountUsed)
    {
        require(isLiquidation || loanTokenAmountNeeded > 0, "!isLiquidation && loanTokenAmountNeeded == 0");

        uint collateralTokenBalance = EIP20(loanPosition.collateralTokenAddressFilled).balanceOf.gas(4999)(this); // Changes to state require at least 5000 gas
        if (collateralTokenBalance < loanPosition.collateralTokenAmountFilled) { // sanity check
            revert("BZxOracle::processCollateral: collateralTokenBalance < loanPosition.collateralTokenAmountFilled");
        }

        uint wethAmountReceived = _getWethFromCollateral(
            loanPosition.collateralTokenAddressFilled,
            loanOrder.loanTokenAddress,
            loanPosition.collateralTokenAmountFilled,
            loanTokenAmountNeeded,
            isLiquidation
        );

        if (loanTokenAmountNeeded > 0) {
            //uint wethBalanceBefore = EIP20(wethContract).balanceOf.gas(4999)(this);
            
            if (collateralInWethAmounts[loanPosition.positionId] >= minimumCollateralInWethAmount && 
                (minInitialMarginAmount == 0 || loanOrder.initialMarginAmount >= minInitialMarginAmount) &&
                (minMaintenanceMarginAmount == 0 || loanOrder.maintenanceMarginAmount >= minMaintenanceMarginAmount)) {
                // cover losses with collateral proceeds + oracle insurance
                loanTokenAmountCovered = _doTradeWithWeth(
                    loanOrder.loanTokenAddress,
                    MAX_FOR_KYBER, // maximum usable amount
                    vaultContract,
                    loanTokenAmountNeeded
                );
            } else {
                // cover losses with just collateral proceeds
                loanTokenAmountCovered = _doTradeWithWeth(
                    loanOrder.loanTokenAddress,
                    wethAmountReceived, // maximum usable amount
                    vaultContract,
                    loanTokenAmountNeeded
                );
            }

            /*require(wethBalanceBefore >= EIP20(wethContract).balanceOf.gas(4999)(this), "wethBalanceBefore < wethBalanceNow");
            uint wethAmountUsed = wethBalanceBefore - address(this).balance;
            if (wethAmountReceived > wethAmountUsed) {
                // deposit excess ETH back to WETH
                WETHInterface(wethContract).deposit.value(wethAmountReceived-wethAmountUsed)();
            }*/
        }

        collateralTokenAmountUsed = collateralTokenBalance.sub(EIP20(loanPosition.collateralTokenAddressFilled).balanceOf.gas(4999)(this)); // Changes to state require at least 5000 gas

        if (collateralTokenAmountUsed < loanPosition.collateralTokenAmountFilled) {
            // send unused collateral token back to the vault
            if (!_transferToken(
                loanPosition.collateralTokenAddressFilled,
                vaultContract,
                loanPosition.collateralTokenAmountFilled-collateralTokenAmountUsed)) {
                revert("BZxOracle::processCollateral: _transferToken failed");
            }
        }
    }

    /*
    * Public View functions
    */

    function shouldLiquidate(
        bytes32 /* loanOrderHash */,
        address /* trader */,
        address loanTokenAddress,
        address positionTokenAddress,
        address collateralTokenAddress,
        uint loanTokenAmount,
        uint positionTokenAmount,
        uint collateralTokenAmount,
        uint maintenanceMarginAmount)
        public
        view
        returns (bool)
    {
        return (
            getCurrentMarginAmount(
                loanTokenAddress,
                positionTokenAddress,
                collateralTokenAddress,
                loanTokenAmount,
                positionTokenAmount,
                collateralTokenAmount) <= maintenanceMarginAmount.mul(10**18)
            );
    }

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

    function getTradeData(
        address sourceTokenAddress,
        address destTokenAddress,
        uint sourceTokenAmount)
        public
        view
        returns (uint sourceToDestRate, uint destTokenAmount)
    {
        (sourceToDestRate,) = _getExpectedRate(
            sourceTokenAddress,
            destTokenAddress,
            sourceTokenAmount);

        destTokenAmount = sourceTokenAmount
                            .mul(sourceToDestRate)
                            .div(_getDecimalPrecision(sourceTokenAddress, destTokenAddress));
    }

    // returns bool isProfit, uint profitOrLoss
    // the position's profit/loss denominated in positionToken
    function getProfitOrLoss(
        address positionTokenAddress,
        address loanTokenAddress,
        uint positionTokenAmount,
        uint loanTokenAmount)
        public
        view
        returns (bool isProfit, uint profitOrLoss)
    {
        uint loanToPositionAmount;
        if (positionTokenAddress == loanTokenAddress) {
            loanToPositionAmount = loanTokenAmount;
        } else {
            (uint positionToLoanRate,) = _getExpectedRate(
                positionTokenAddress,
                loanTokenAddress,
                0);
            if (positionToLoanRate == 0) {
                return;
            }
            loanToPositionAmount = loanTokenAmount.mul(_getDecimalPrecision(positionTokenAddress, loanTokenAddress)).div(positionToLoanRate);
        }

        if (positionTokenAmount > loanToPositionAmount) {
            isProfit = true;
            profitOrLoss = positionTokenAmount - loanToPositionAmount;
        } else {
            isProfit = false;
            profitOrLoss = loanToPositionAmount - positionTokenAmount;
        }
    }

    /// @return The current margin amount (a percentage -> i.e. 54350000000000000000 == 54.35%)
    function getCurrentMarginAmount(
        address loanTokenAddress,
        address positionTokenAddress,
        address collateralTokenAddress,
        uint loanTokenAmount,
        uint positionTokenAmount,
        uint collateralTokenAmount)
        public
        view
        returns (uint)
    {
        uint collateralToLoanAmount;
        if (collateralTokenAddress == loanTokenAddress) {
            collateralToLoanAmount = collateralTokenAmount;
        } else {
            (uint collateralToLoanRate,) = _getExpectedRate(
                collateralTokenAddress,
                loanTokenAddress,
                0);
            if (collateralToLoanRate == 0) {
                return 0;
            }
            collateralToLoanAmount = collateralTokenAmount.mul(collateralToLoanRate).div(_getDecimalPrecision(collateralTokenAddress, loanTokenAddress));
        }

        uint positionToLoanAmount;
        if (positionTokenAddress == loanTokenAddress) {
            positionToLoanAmount = positionTokenAmount;
        } else {
            (uint positionToLoanRate,) = _getExpectedRate(
                positionTokenAddress,
                loanTokenAddress,
                0);
            if (positionToLoanRate == 0) {
                return 0;
            }
            positionToLoanAmount = positionTokenAmount.mul(positionToLoanRate).div(_getDecimalPrecision(positionTokenAddress, loanTokenAddress));
        }

        return collateralToLoanAmount.add(positionToLoanAmount).sub(loanTokenAmount).mul(10**20).div(loanTokenAmount);
    }

    function setDecimals(
        EIP20 token)
        public
    {
        decimals[token] = token.decimals();
    }

    function setDecimalsBatch(
        EIP20[] tokens)
        public
    {
        for (uint i=0; i < tokens.length; i++) {
            decimals[tokens[i]] = tokens[i].decimals();
        }
    }

    /*
    * Owner functions
    */

    function setMinimumCollateralInWethAmount(
        uint newValue,
        bool enforce)
        public
        onlyOwner
    {
        if (newValue != minimumCollateralInWethAmount)
            minimumCollateralInWethAmount = newValue;

        if (enforce != enforceMinimum)
            enforceMinimum = enforce;
    }

    function setInterestFeePercent(
        uint newRate)
        public
        onlyOwner
    {
        require(newRate != interestFeePercent && newRate <= 100);
        interestFeePercent = newRate;
    }

    function setBountyRewardPercent(
        uint newValue)
        public
        onlyOwner
    {
        require(newValue != bountyRewardPercent);
        bountyRewardPercent = newValue;
    }

    function setGasUpperBound(
        uint newValue)
        public
        onlyOwner
    {
        require(newValue != gasUpperBound);
        gasUpperBound = newValue;
    }

    function setMarginThresholds(
        uint newInitialMargin,
        uint newMaintenanceMargin)
        public
        onlyOwner
    {
        require(newInitialMargin >= newMaintenanceMargin);
        minInitialMarginAmount = newInitialMargin;
        minMaintenanceMarginAmount = newMaintenanceMargin;
    }

    function setManualTradingAllowed (
        bool _isManualTradingAllowed)
        public
        onlyOwner
    {
        if (isManualTradingAllowed != _isManualTradingAllowed)
            isManualTradingAllowed = _isManualTradingAllowed;
    }

    function setVaultContractAddress(
        address newAddress)
        public
        onlyOwner
    {
        require(newAddress != vaultContract && newAddress != address(0));
        vaultContract = newAddress;
    }

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

    function setBZRxTokenContractAddress(
        address newAddress)
        public
        onlyOwner
    {
        require(newAddress != bZRxTokenContract && newAddress != address(0));
        bZRxTokenContract = newAddress;
    }

    function setEMAValue (
        uint _newEMAValue)
        public
        onlyOwner {
        require(_newEMAValue != emaValue);
        emaValue = _newEMAValue;
    }

    function setEMAPeriods (
        uint _newEMAPeriods)
        public
        onlyOwner {
        require(_newEMAPeriods > 1 && _newEMAPeriods != emaPeriods);
        emaPeriods = _newEMAPeriods;
    }

    function transferEther(
        address to,
        uint value)
        public
        onlyOwner
        returns (bool)
    {
        return (_transferEther(
            to,
            value
        ));
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

    function _getWethFromCollateral(
        address collateralTokenAddress,
        address loanTokenAddress,
        uint collateralTokenAmountUsable,
        uint loanTokenAmountNeeded,
        bool isLiquidation)
        internal
        returns (uint wethAmountReceived)
    {
        uint wethAmountNeeded = 0;

        if (loanTokenAmountNeeded > 0) {
            if (loanTokenAddress == wethContract) {
                wethAmountNeeded = loanTokenAmountNeeded;
            } else {
                (uint wethToLoan,) = _getExpectedRate(
                    wethContract,
                    loanTokenAddress,
                    0
                );
                wethAmountNeeded = loanTokenAmountNeeded.mul(_getDecimalPrecision(wethContract, loanTokenAddress)).div(wethToLoan);
            }
        }

        // trade collateral token for WETH
        wethAmountReceived = _doTradeForWeth(
            collateralTokenAddress,
            collateralTokenAmountUsable,
            this, // BZxOracle receives the Ether proceeds
            !isLiquidation ? wethAmountNeeded : wethAmountNeeded.add(gasUpperBound.mul(emaValue).mul(bountyRewardPercent).div(100))
        );
    }

    function _getDecimalPrecision(
        address sourceToken,
        address destToken)
        internal
        view
        returns(uint)
    {
        uint sourceTokenDecimals = decimals[sourceToken];
        if (sourceTokenDecimals == 0)
            sourceTokenDecimals = EIP20(sourceToken).decimals();

        uint destTokenDecimals = decimals[destToken];
        if (destTokenDecimals == 0)
            destTokenDecimals = EIP20(destToken).decimals();

        if (destTokenDecimals >= sourceTokenDecimals)
            return 10**(SafeMath.sub(18, destTokenDecimals-sourceTokenDecimals));
        else
            return 10**(SafeMath.add(18, sourceTokenDecimals-destTokenDecimals));
    }

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
            (expectedRate, slippageRate) = KyberNetwork_Interface(kyberContract).getExpectedRate(
                sourceTokenAddress,
                destTokenAddress,
                sourceTokenAmount
            );
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
            if (maxDestTokenAmount < sourceTokenAmount) {
                destTokenAmount = maxDestTokenAmount;
            } else {
                destTokenAmount = sourceTokenAmount;
            }

            if (!_transferToken(
                destTokenAddress,
                vaultContract,
                destTokenAmount)) {
                revert("BZxOracle::_doTrade: _transferToken failed");
            }
        } else {
            // re-up the Kyber spend approval if needed
            uint tempAllowance = EIP20(sourceTokenAddress).allowance.gas(4999)(this, kyberContract);
            if (tempAllowance < sourceTokenAmount) {
                if (tempAllowance > 0) {
                    // reset approval to 0
                    eip20Approve(
                        sourceTokenAddress,
                        kyberContract,
                        0);
                }

                eip20Approve(
                    sourceTokenAddress,
                    kyberContract,
                    MAX_FOR_KYBER);
            }

            destTokenAmount = KyberNetwork_Interface(kyberContract).trade(
                sourceTokenAddress,
                sourceTokenAmount,
                destTokenAddress,
                this, // BZxOracle receives the Ether proceeds
                maxDestTokenAmount,
                0, // no min coversation rate
                address(0)
            );
        }
    }

    function _doTradeForWeth(
        address sourceTokenAddress,
        uint sourceTokenAmount,
        address receiver,
        uint destWethAmountNeeded)
        internal
        returns (uint destWethAmountReceived)
    {
        if (sourceTokenAddress == wethContract) {
            if (destWethAmountNeeded > sourceTokenAmount)
                destWethAmountNeeded = sourceTokenAmount;
            //WETHInterface(wethContract).withdraw(destWethAmountNeeded);

            if (receiver != address(this)) {
                if (!_transferToken(
                    wethContract,
                    receiver,
                    destWethAmountNeeded)) {
                    revert("BZxOracle::_doTradeForWeth: _transferToken failed");
                }
            }

            destWethAmountReceived = destWethAmountNeeded;
        } else {
            // re-up the Kyber spend approval if needed
            uint tempAllowance = EIP20(sourceTokenAddress).allowance.gas(4999)(this, kyberContract);
            if (tempAllowance < sourceTokenAmount) {
                if (tempAllowance > 0) {
                    // reset approval to 0
                    eip20Approve(
                        sourceTokenAddress,
                        kyberContract,
                        0);
                }

                eip20Approve(
                    sourceTokenAddress,
                    kyberContract,
                    MAX_FOR_KYBER);
            }

            /* the following code is to allow the Kyber trade to fail silently and not revert if it does, preventing a "bubble up" */

            bool result = kyberContract.call(
                bytes4(keccak256("trade(address,uint256,address,address,uint256,uint256,address)")),
                sourceTokenAddress,
                sourceTokenAmount,
                wethContract,
                receiver,
                destWethAmountNeeded,
                0, // no min coversation rate
                address(0)
            );

            assembly {
                switch result
                case 0 {
                    destWethAmountReceived := 0
                }
                default {
                    returndatacopy(0, 0, 0x20) 
                    destWethAmountReceived := mload(0)
                }
            }
        }
    }

    function _doTradeWithWeth(
        address destTokenAddress,
        uint sourceWethAmount,
        address receiver,
        uint destTokenAmountNeeded)
        internal
        returns (uint destTokenAmountReceived)
    {
        uint wethBalance = EIP20(wethContract).balanceOf.gas(4999)(this);
        if (destTokenAddress == wethContract) {
            if (destTokenAmountNeeded > sourceWethAmount)
                destTokenAmountNeeded = sourceWethAmount;
            if (destTokenAmountNeeded > wethBalance)
                destTokenAmountNeeded = wethBalance;

            //WETHInterface(wethContract).deposit.value(destTokenAmountNeeded)();
            if (receiver != address(this)) {
                if (!_transferToken(
                    wethContract,
                    receiver,
                    destTokenAmountNeeded)) {
                    revert("BZxOracle::_doTradeWithWeth: _transferToken failed");
                }
            }

            destTokenAmountReceived = destTokenAmountNeeded;
        } else {
            if (sourceWethAmount > wethBalance) {
                sourceWethAmount = wethBalance;
            }

            // re-up the Kyber spend approval if needed
            uint tempAllowance = EIP20(wethContract).allowance.gas(4999)(this, kyberContract);
            if (tempAllowance < sourceWethAmount) {
                if (tempAllowance > 0) {
                    // reset approval to 0
                    eip20Approve(
                        wethContract,
                        kyberContract,
                        0);
                }

                eip20Approve(
                    wethContract,
                    kyberContract,
                    MAX_FOR_KYBER);
            }

            /* the following code is to allow the Kyber trade to fail silently and not revert if it does, preventing a "bubble up" */

            bool result = kyberContract.call(
                bytes4(keccak256("trade(address,uint256,address,address,uint256,uint256,address)")),
                wethContract,
                sourceWethAmount,
                destTokenAddress,
                receiver,
                destTokenAmountNeeded,
                0, // no min coversation rate
                address(0)
            );

            assembly {
                switch result
                case 0 {
                    destTokenAmountReceived := 0
                }
                default {
                    returndatacopy(0, 0, 0x20) 
                    destTokenAmountReceived := mload(0)
                }
            }
        }
    }

    function _transferEther(
        address to,
        uint value)
        internal
        returns (bool)
    {
        uint amount = value;
        if (amount > address(this).balance) {
            amount = address(this).balance;
        }

        return (to.send(amount)); // solhint-disable-line check-send-result, multiple-sends
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
