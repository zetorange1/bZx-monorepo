/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
 
pragma solidity 0.5.2;
pragma experimental ABIEncoderV2;

import "../openzeppelin-solidity/Math.sol";
import "../openzeppelin-solidity/SafeMath.sol";

import "../modifiers/BZxOwnable.sol";
import "../modifiers/EMACollector.sol";
import "../modifiers/GasRefunder.sol";

import "../tokens/EIP20.sol";
import "../tokens/EIP20Wrapper.sol";
import "./OracleInterface.sol";
import "./OracleNotifier.sol";

import "../shared/WETHInterface.sol";

// solhint-disable-next-line contract-name-camelcase
interface KyberNetworkInterface {
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
        uint256 srcAmount,
        address dest,
        address destAddress,
        uint256 maxDestAmount,
        uint256 minConversionRate,
        address walletId
    )
        external
        payable
        returns(uint256);

    /// @notice use token address ETH_TOKEN_ADDRESS for ether
    function getExpectedRate(
        address src,
        address dest,
        uint256 srcQty)
        external
        view
        returns (uint256 expectedRate, uint256 slippageRate);

    function kyberNetworkContract()
        external
        view
        returns (address);

    function getReserves()
        external
        view
        returns (address[] memory);

    function feeBurnerContract()
        external
        view
        returns (address);
}

contract BZxOracle is OracleInterface, OracleNotifier, EIP20Wrapper, EMACollector, GasRefunder, BZxOwnable {
    using SafeMath for uint256;

    // this is the value the Kyber portal uses when setting a very high maximum number
    uint256 internal constant MAX_FOR_KYBER = 57896044618658097711785492504343953926634992332820282019728792003956564819968;

    mapping (address => uint256) internal decimals;

    // Bounty hunters are remembursed from collateral
    // The oracle requires a minimum amount
    uint256 public minimumCollateralInWethAmount = 0.5 ether;

    // If true, the collateral must not be below minimumCollateralInWethAmount for the loan to be opened
    // If false, the loan can be opened, but it won't be insured by the insurance fund if collateral is below minimumCollateralInWethAmount
    bool public enforceMinimum = false;

    // Percentage of interest retained as fee
    // This will always be between 0 and 100%
    uint256 public interestFeePercent = 10 * 10**18;

    // Percentage of EMA-based gas refund paid to bounty hunters after successfully liquidating a position
    uint256 public bountyRewardPercent = 110 * 10**18;

    // An upper bound estimation on the liquidation gas cost
    uint256 public gasUpperBound = 1000000;

    // A threshold of minimum initial margin for loan to be insured by the guarantee fund
    // A value of 0 indicates that no threshold exists for this parameter.
    uint256 public minInitialMarginAmount = 0;

    // A threshold of minimum maintenance margin for loan to be insured by the guarantee fund
    // A value of 0 indicates that no threshold exists for this parameter.
    uint256 public minMaintenanceMarginAmount = 25 * 10**18;

/* solhint-disable var-name-mixedcase */
    address public vaultContract;
    address public kyberContract;
    address public wethContract;
    address public bZRxTokenContract;
/* solhint-enable var-name-mixedcase */

    mapping (uint256 => uint256) public collateralInWethAmounts; // mapping of position ids to initial collateralInWethAmounts

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
    function() external payable {}


    function didAddOrder(
        BZxObjects.LoanOrder memory loanOrder,
        BZxObjects.LoanOrderAux memory /* loanOrderAux */,
        bytes memory oracleData,
        address /* takerAddress */,
        uint256 /* gasUsed */)
        public
        onlyBZx
        updatesEMA(tx.gasprice)
        returns (bool)
    {
        _setNotifications(
            loanOrder.loanOrderHash,
            oracleData
        );

        return true;
    }

    function didTakeOrder(
        BZxObjects.LoanOrder memory loanOrder,
        BZxObjects.LoanOrderAux memory loanOrderAux,
        BZxObjects.LoanPosition memory loanPosition,
        address taker,
        uint256 /* gasUsed */)
        public
        onlyBZx
        updatesEMA(tx.gasprice)
        returns (bool)
    {
        uint256 collateralInWethAmount;
        if (loanPosition.collateralTokenAddressFilled != wethContract) {
            (uint256 collateralToWethRate,) = _getExpectedRate(
                loanPosition.collateralTokenAddressFilled,
                wethContract,
                loanPosition.collateralTokenAmountFilled
            );
            collateralInWethAmount = loanPosition.collateralTokenAmountFilled.mul(collateralToWethRate).div(_getDecimalPrecision(loanPosition.collateralTokenAddressFilled, wethContract));
        } else {
            collateralInWethAmount = loanPosition.collateralTokenAmountFilled;
        }

        require(!enforceMinimum || collateralInWethAmount >= minimumCollateralInWethAmount, "collateral below minimum for BZxOracle");
        collateralInWethAmounts[loanPosition.positionId] = collateralInWethAmount;

        if (takeOrderNotifier[loanOrder.loanOrderHash] != address(0)) {
            OracleNotifierInterface(takeOrderNotifier[loanOrder.loanOrderHash]).takeOrderNotifier(
                loanOrder,
                loanOrderAux,
                loanPosition,
                taker
            );
        }

        return true;
    }

    function didTradePosition(
        BZxObjects.LoanOrder memory loanOrder,
        BZxObjects.LoanPosition memory loanPosition,
        uint256 /* gasUsed */)
        public
        onlyBZx
        updatesEMA(tx.gasprice)
        returns (bool)
    {
        /*
        // this is handled by the base protocol
        require (
            getCurrentMarginAmount(
                loanOrder.loanTokenAddress,
                loanPosition.positionTokenAddressFilled,
                loanPosition.collateralTokenAddressFilled,
                loanPosition.loanTokenAmountFilled,
                loanPosition.positionTokenAmountFilled,
                loanPosition.collateralTokenAmountFilled) > loanOrder.maintenanceMarginAmount,
            "BZxOracle::didTradePosition: trade triggers liquidation"
        );
        */

        if (tradePositionNotifier[loanOrder.loanOrderHash] != address(0)) {
            OracleNotifierInterface(tradePositionNotifier[loanOrder.loanOrderHash]).tradePositionNotifier(
                loanOrder,
                loanPosition
            );
        }

        return true;
    }

    // will not update the EMA
    function didPayInterest(
        BZxObjects.LoanOrder memory loanOrder,
        address lender,
        uint256 amountOwed,
        uint256 /* gasUsed */)
        public
        onlyBZx
        returns (bool)
    {
        // interestFeePercent is only editable by owner
        uint256 interestFee = amountOwed.mul(interestFeePercent).div(10**20);

        // Transfers the interest to the lender, less the interest fee.
        // The fee is retained by the oracle.
        uint256 amountPaid = amountOwed.sub(interestFee);
        if (!_transferToken(
            loanOrder.interestTokenAddress,
            lender,
            amountPaid)) {
            revert("BZxOracle::didPayInterest: _transferToken failed");
        }

        if (loanOrder.interestTokenAddress != wethContract && loanOrder.interestTokenAddress != bZRxTokenContract) {
            // interest paid in WETH or BZRX is retained as is, other tokens are sold for WETH
            _tradeForWeth(
                loanOrder.interestTokenAddress,
                interestFee,
                address(this), // BZxOracle receives the WETH proceeds
                MAX_FOR_KYBER // no limit on the dest amount
            );
        }

        if (payInterestNotifier[loanOrder.loanOrderHash] != address(0)) {
            OracleNotifierInterface(payInterestNotifier[loanOrder.loanOrderHash]).payInterestNotifier(
                loanOrder,
                lender,
                amountPaid
            );
        }

        return true;
    }

    // will not update the EMA
    function didPayInterestByLender(
        address lender,
        address interestTokenAddress,
        uint256 amountOwed,
        uint256 /* gasUsed */)
        public
        onlyBZx
        returns (bool)
    {
        // interestFeePercent is only editable by owner
        uint256 interestFee = amountOwed.mul(interestFeePercent).div(10**20);

        // Transfers the interest to the lender, less the interest fee.
        // The fee is retained by the oracle.
        uint256 amountPaid = amountOwed.sub(interestFee);
        if (!_transferToken(
            interestTokenAddress,
            lender,
            amountPaid)) {
            revert("BZxOracle::didPayInterestByLender: _transferToken failed");
        }

        if (interestTokenAddress != wethContract && interestTokenAddress != bZRxTokenContract) {
            // interest paid in WETH or BZRX is retained as is, other tokens are sold for WETH
            _tradeForWeth(
                interestTokenAddress,
                interestFee,
                address(this), // BZxOracle receives the WETH proceeds
                MAX_FOR_KYBER // no limit on the dest amount
            );
        }

        return true;
    }

    function didDepositCollateral(
        BZxObjects.LoanOrder memory /* loanOrder */,
        BZxObjects.LoanPosition memory /* loanPosition */,
        uint256 /* depositAmount */,
        uint256 /* gasUsed */)
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
        uint256 /* withdrawAmount */,
        uint256 /* gasUsed */)
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
        uint256 /* gasUsed */)
        public
        onlyBZx
        updatesEMA(tx.gasprice)
        returns (bool)
    {
        return true;
    }

    function didWithdrawPosition(
        BZxObjects.LoanOrder memory /* loanOrder */,
        BZxObjects.LoanPosition memory /* loanPosition */,
        uint256 /* withdrawAmount */,
        uint256 /* gasUsed */)
        public
        onlyBZx
        updatesEMA(tx.gasprice)
        returns (bool)
    {
        return true;
    }

    function didDepositPosition(
        BZxObjects.LoanOrder memory /* loanOrder */,
        BZxObjects.LoanPosition memory /* loanPosition */,
        uint256 /* depositAmount */,
        uint256 /* gasUsed */)
        public
        onlyBZx
        updatesEMA(tx.gasprice)
        returns (bool)
    {
        return true;
    }

    function didCloseLoan(
        BZxObjects.LoanOrder memory loanOrder,
        BZxObjects.LoanPosition memory loanPosition,
        address payable loanCloser,
        uint256 closeAmount,
        bool isLiquidation,
        uint256 gasUsed)
        public
        onlyBZx
        updatesEMA(tx.gasprice)
        returns (bool)
    {
        // sends gas and bounty reward to bounty hunter
        if (isLiquidation) {
            (uint256 refundAmount, uint256 finalGasUsed) = getGasRefund(
                gasUsed,
                emaValue,
                bountyRewardPercent
            );

            if (refundAmount > 0) {
                // refunds are paid in ETH
                uint256 wethBalance = EIP20(wethContract).balanceOf.gas(4999)(address(this));
                if (refundAmount > wethBalance)
                    refundAmount = wethBalance;

                WETHInterface(wethContract).withdraw(refundAmount);

                sendGasRefund(
                    loanCloser,
                    refundAmount,
                    finalGasUsed,
                    emaValue
                );
            }
        }

        if (closeLoanNotifier[loanOrder.loanOrderHash] != address(0)) {
            OracleNotifierInterface(closeLoanNotifier[loanOrder.loanOrderHash]).closeLoanNotifier(
                loanOrder,
                loanPosition,
                loanCloser,
                closeAmount,
                isLiquidation
            );
        }

        return true;
    }
    
    function didChangeTraderOwnership(
        BZxObjects.LoanOrder memory /* loanOrder */,
        BZxObjects.LoanPosition memory /* loanPosition */,
        address /* oldTrader */,
        uint256 /* gasUsed */)
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
        uint256 /* gasUsed */)
        public
        onlyBZx
        updatesEMA(tx.gasprice)
        returns (bool)
    {
        return true;
    }

    function didUpdateLoanAsLender(
        BZxObjects.LoanOrder memory /* loanOrder */,
        address /* lender */,
        uint256 /* loanTokenAmountAdded */,
        uint256 /* totalNewFillableAmount */,
        uint256 /* newExpirationTimestamp */,
        uint256 /* gasUsed */)
        public
        onlyBZx
        updatesEMA(tx.gasprice)
        returns (bool)
    {
        return true;
    }

    function trade(
        address sourceTokenAddress,
        address destTokenAddress,
        uint256 sourceTokenAmount,
        uint256 maxDestTokenAmount)
        public
        onlyBZx
        returns (uint256 destTokenAmountReceived, uint256 sourceTokenAmountUsed)
    {
        (destTokenAmountReceived, sourceTokenAmountUsed) = _trade(
            sourceTokenAddress,
            destTokenAddress,
            sourceTokenAmount,
            maxDestTokenAmount < MAX_FOR_KYBER ? maxDestTokenAmount : MAX_FOR_KYBER);
    }

    function tradePosition(
        BZxObjects.LoanOrder memory loanOrder,
        BZxObjects.LoanPosition memory loanPosition,
        address destTokenAddress,
        uint256 maxDestTokenAmount,
        bool ensureHealthy)
        public
        onlyBZx
        returns (uint256 destTokenAmountReceived, uint256 sourceTokenAmountUsed)
    {
        (destTokenAmountReceived, sourceTokenAmountUsed) = _trade(
            loanPosition.positionTokenAddressFilled,
            destTokenAddress,
            loanPosition.positionTokenAmountFilled,
            maxDestTokenAmount < MAX_FOR_KYBER ? maxDestTokenAmount : MAX_FOR_KYBER);

        if (ensureHealthy) {
            loanPosition.positionTokenAddressFilled = destTokenAddress;
            loanPosition.positionTokenAmountFilled = destTokenAmountReceived;

            // trade can't trigger liquidation
            if (shouldLiquidate(
                loanOrder,
                loanPosition)) {
                revert("BZxOracle::tradePosition: trade triggers liquidation");
            }
        }
    }

    function verifyAndLiquidate(
        BZxObjects.LoanOrder memory loanOrder,
        BZxObjects.LoanPosition memory loanPosition)
        public
        onlyBZx
        returns (uint256 destTokenAmountReceived, uint256 sourceTokenAmountUsed)
    {
        if (!shouldLiquidate(
            loanOrder,
            loanPosition)) {

            // send unused source token back
            if (!_transferToken(
                loanPosition.positionTokenAddressFilled,
                vaultContract,
                loanPosition.positionTokenAmountFilled)) {
                revert("BZxOracle::verifyAndLiquidate: _transferToken failed");
            }

            return (0,0);
        }

        (destTokenAmountReceived, sourceTokenAmountUsed) = _trade(
            loanPosition.positionTokenAddressFilled,
            loanOrder.loanTokenAddress,
            loanPosition.positionTokenAmountFilled,
            MAX_FOR_KYBER); // no limit on the dest amount
    }

    // note: bZx will only call this function if isLiquidation=true or loanTokenAmountNeeded > 0
    function processCollateral(
        BZxObjects.LoanOrder memory loanOrder,
        BZxObjects.LoanPosition memory loanPosition,
        uint256 loanTokenAmountNeeded,
        bool isLiquidation) 
        public
        onlyBZx
        returns (uint256 loanTokenAmountCovered, uint256 collateralTokenAmountUsed)
    {
        require(isLiquidation || loanTokenAmountNeeded > 0, "!isLiquidation && loanTokenAmountNeeded == 0");

        uint256 collateralTokenBalance = EIP20(loanPosition.collateralTokenAddressFilled).balanceOf.gas(4999)(address(this)); // Changes to state require at least 5000 gas
        if (collateralTokenBalance < loanPosition.collateralTokenAmountFilled) { // sanity check
            revert("BZxOracle::processCollateral: collateralTokenBalance < loanPosition.collateralTokenAmountFilled");
        }

        uint256 wethAmountReceived = _getWethFromCollateral(
            loanPosition.collateralTokenAddressFilled,
            loanOrder.loanTokenAddress,
            loanPosition.collateralTokenAmountFilled,
            loanTokenAmountNeeded,
            isLiquidation
        );

        if (loanTokenAmountNeeded > 0) {
            if (collateralInWethAmounts[loanPosition.positionId] >= minimumCollateralInWethAmount && 
                (minInitialMarginAmount == 0 || loanOrder.initialMarginAmount >= minInitialMarginAmount) &&
                (minMaintenanceMarginAmount == 0 || loanOrder.maintenanceMarginAmount >= minMaintenanceMarginAmount)) {
                // cover losses with collateral proceeds + oracle insurance
                loanTokenAmountCovered = _tradeWithWeth(
                    loanOrder.loanTokenAddress,
                    MAX_FOR_KYBER, // maximum usable amount
                    vaultContract,
                    loanTokenAmountNeeded
                );
            } else {
                // cover losses with just collateral proceeds
                loanTokenAmountCovered = _tradeWithWeth(
                    loanOrder.loanTokenAddress,
                    wethAmountReceived, // maximum usable amount
                    vaultContract,
                    loanTokenAmountNeeded
                );
            }
        }

        collateralTokenAmountUsed = collateralTokenBalance.sub(EIP20(loanPosition.collateralTokenAddressFilled).balanceOf.gas(4999)(address(this))); // Changes to state require at least 5000 gas

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
        BZxObjects.LoanOrder memory loanOrder,
        BZxObjects.LoanPosition memory loanPosition)
        public
        view
        returns (bool)
    {
        return (
            getCurrentMarginAmount(
                loanOrder.loanTokenAddress,
                loanPosition.positionTokenAddressFilled,
                loanPosition.collateralTokenAddressFilled,
                loanPosition.loanTokenAmountFilled,
                loanPosition.positionTokenAmountFilled,
                loanPosition.collateralTokenAmountFilled) <= loanOrder.maintenanceMarginAmount
            );
    }

    function isTradeSupported(
        address sourceTokenAddress,
        address destTokenAddress,
        uint256 sourceTokenAmount)
        public
        view
        returns (bool)
    {
        (uint256 rate, uint256 slippage) = _getExpectedRate(
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
        uint256 sourceTokenAmount)
        public
        view
        returns (uint256 sourceToDestRate, uint256 sourceToDestPrecision, uint256 destTokenAmount)
    {
        (sourceToDestRate,) = _getExpectedRate(
            sourceTokenAddress,
            destTokenAddress,
            sourceTokenAmount);

        sourceToDestPrecision = _getDecimalPrecision(sourceTokenAddress, destTokenAddress);

        destTokenAmount = sourceTokenAmount
                            .mul(sourceToDestRate)
                            .div(sourceToDestPrecision);
    }

    function getPositionOffset(
        BZxObjects.LoanOrder memory loanOrder,
        BZxObjects.LoanPosition memory loanPosition)
        public
        view
        returns (bool isPositive, uint256 positionOffsetAmount, uint256 loanOffsetAmount, uint256 collateralOffsetAmount)
    {
        uint256 collateralToLoanAmount;
        uint256 collateralToLoanRatePrecise;
        if (loanPosition.collateralTokenAddressFilled == loanOrder.loanTokenAddress) {
            collateralToLoanAmount = loanPosition.collateralTokenAmountFilled;
            collateralToLoanRatePrecise = 10**18;
        } else {
            (collateralToLoanRatePrecise,) = _getExpectedRate(
                loanPosition.collateralTokenAddressFilled,
                loanOrder.loanTokenAddress,
                loanPosition.collateralTokenAmountFilled);
            if (collateralToLoanRatePrecise == 0) {
                return (false,0,0,0);
            }
            collateralToLoanRatePrecise = collateralToLoanRatePrecise.mul(10**18).div(_getDecimalPrecision(loanPosition.collateralTokenAddressFilled, loanOrder.loanTokenAddress));
            collateralToLoanAmount = loanPosition.collateralTokenAmountFilled.mul(collateralToLoanRatePrecise).div(10**18);
        }

        uint256 positionToLoanAmount;
        uint256 positionToLoanRatePrecise;
        if (loanPosition.positionTokenAddressFilled == loanOrder.loanTokenAddress) {
            positionToLoanAmount = loanPosition.positionTokenAmountFilled;
            positionToLoanRatePrecise = 10**18;
        } else {
            (positionToLoanRatePrecise,) = _getExpectedRate(
                loanPosition.positionTokenAddressFilled,
                loanOrder.loanTokenAddress,
                loanPosition.positionTokenAmountFilled);
            if (positionToLoanRatePrecise == 0) {
                return (false,0,0,0);
            }
            positionToLoanRatePrecise = positionToLoanRatePrecise.mul(10**18).div(_getDecimalPrecision(loanPosition.positionTokenAddressFilled, loanOrder.loanTokenAddress));
            positionToLoanAmount = loanPosition.positionTokenAmountFilled.mul(positionToLoanRatePrecise).div(10**18);
        }

        positionToLoanAmount = positionToLoanAmount.add(collateralToLoanAmount);
        uint256 initialCombinedCollateral = loanPosition.loanTokenAmountFilled.add(loanPosition.loanTokenAmountFilled.mul(loanOrder.initialMarginAmount).div(10**20));

        isPositive = false;
        if (positionToLoanAmount > initialCombinedCollateral) {
            loanOffsetAmount = positionToLoanAmount.sub(initialCombinedCollateral);
            isPositive = true;
        } else if (positionToLoanAmount < initialCombinedCollateral) {
            loanOffsetAmount = initialCombinedCollateral.sub(positionToLoanAmount);
        }

        positionOffsetAmount = loanOffsetAmount.mul(10**18).div(positionToLoanRatePrecise);
        collateralOffsetAmount = loanOffsetAmount.mul(10**18).div(collateralToLoanRatePrecise);
    }

    /// @return The current margin amount (a percentage -> i.e. 54350000000000000000 == 54.35%)
    function getCurrentMarginAmount(
        address loanTokenAddress,
        address positionTokenAddress,
        address collateralTokenAddress,
        uint256 loanTokenAmount,
        uint256 positionTokenAmount,
        uint256 collateralTokenAmount)
        public
        view
        returns (uint256)
    {
        uint256 collateralToLoanAmount;
        if (collateralTokenAddress == loanTokenAddress) {
            collateralToLoanAmount = collateralTokenAmount;
        } else {
            (uint256 collateralToLoanRate,) = _getExpectedRate(
                collateralTokenAddress,
                loanTokenAddress,
                collateralTokenAmount);
            if (collateralToLoanRate == 0) {
                return 0;
            }
            collateralToLoanAmount = collateralTokenAmount.mul(collateralToLoanRate).div(_getDecimalPrecision(collateralTokenAddress, loanTokenAddress));
        }

        uint256 positionToLoanAmount;
        uint256 positionToLoanRate;
        if (positionTokenAddress == loanTokenAddress) {
            positionToLoanAmount = positionTokenAmount;
            positionToLoanRate = 10**18;
        } else {
            (positionToLoanRate,) = _getExpectedRate(
                positionTokenAddress,
                loanTokenAddress,
                positionTokenAmount);
            if (positionToLoanRate == 0) {
                return 0;
            }
            positionToLoanAmount = positionTokenAmount.mul(positionToLoanRate).div(_getDecimalPrecision(positionTokenAddress, loanTokenAddress));
        }

        if (positionToLoanAmount >= loanTokenAmount) {
            return collateralToLoanAmount.add(positionToLoanAmount).sub(loanTokenAmount).mul(10**20).div(loanTokenAmount);
        } else {
            uint256 offset = loanTokenAmount.sub(positionToLoanAmount);
            if (collateralToLoanAmount > offset) {
                return collateralToLoanAmount.sub(offset).mul(10**20).div(loanTokenAmount);
            } else {
                return 0;
            }
        }
    }

    function setDecimals(
        EIP20 token)
        public
    {
        decimals[address(token)] = token.decimals();
    }

    function setDecimalsBatch(
        EIP20[] memory tokens)
        public
    {
        for (uint256 i=0; i < tokens.length; i++) {
            decimals[address(tokens[i])] = tokens[i].decimals();
        }
    }

    function claimFees()
        public
    {
        address kyberNetworkContract = KyberNetworkInterface(kyberContract).kyberNetworkContract();
        address[] memory reserves = KyberNetworkInterface(kyberNetworkContract).getReserves();
        address feeBurnerAddress = KyberNetworkInterface(kyberNetworkContract).feeBurnerContract();
        for(uint256 i=0; i < reserves.length; i++) {
            (bool result,) = feeBurnerAddress.call(
                abi.encodeWithSignature(
                    "sendFeeToWallet(address,address)",
                    address(this),
                    reserves[i]
                )
            );
            require(result, "sendFeeToWallet failed");
        }
    }

    /*
    * Owner functions
    */

    function setMinimumCollateralInWethAmount(
        uint256 newValue,
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
        uint256 newRate)
        public
        onlyOwner
    {
        require(newRate != interestFeePercent && newRate <= 100 * 10**18);
        interestFeePercent = newRate;
    }

    function setBountyRewardPercent(
        uint256 newValue)
        public
        onlyOwner
    {
        require(newValue != bountyRewardPercent);
        bountyRewardPercent = newValue;
    }

    function setGasUpperBound(
        uint256 newValue)
        public
        onlyOwner
    {
        require(newValue != gasUpperBound);
        gasUpperBound = newValue;
    }

    function setMarginThresholds(
        uint256 newInitialMargin,
        uint256 newMaintenanceMargin)
        public
        onlyOwner
    {
        require(newInitialMargin >= newMaintenanceMargin);
        minInitialMarginAmount = newInitialMargin;
        minMaintenanceMarginAmount = newMaintenanceMargin;
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
        uint256 _newEMAValue)
        public
        onlyOwner
    {
        require(_newEMAValue != emaValue);
        emaValue = _newEMAValue;
    }

    function setEMAPeriods (
        uint256 _newEMAPeriods)
        public
        onlyOwner
    {
        require(_newEMAPeriods > 1 && _newEMAPeriods != emaPeriods);
        emaPeriods = _newEMAPeriods;
    }

    function transferEther(
        address payable to,
        uint256 value)
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
        uint256 value)
        public
        onlyOwner
        returns (bool)
    {
        uint256 balance = EIP20(tokenAddress).balanceOf.gas(4999)(address(this));
        if (value > balance) {
            return EIP20(tokenAddress).transfer(
                to,
                balance
            );
        } else {
            return EIP20(tokenAddress).transfer(
                to,
                value
            );
        }
    }

    function tradeOwnedAsset(
        address sourceTokenAddress,
        address destTokenAddress,
        uint256 sourceTokenAmount)
        public
        onlyOwner
        returns (uint256 destTokenAmountReceived)
    {
        // re-up the Kyber spend approval if needed
        uint256 tempAllowance = EIP20(sourceTokenAddress).allowance.gas(4999)(address(this), kyberContract);
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

        destTokenAmountReceived = KyberNetworkInterface(kyberContract).trade(
            sourceTokenAddress,
            sourceTokenAmount,
            destTokenAddress,
            address(this),
            MAX_FOR_KYBER,
            0,
            address(this)
        );
    }

    /*
    * Internal functions
    */

    function _getWethFromCollateral(
        address collateralTokenAddress,
        address loanTokenAddress,
        uint256 collateralTokenAmountUsable,
        uint256 loanTokenAmountNeeded,
        bool isLiquidation)
        internal
        returns (uint256 wethAmountReceived)
    {
        uint256 wethAmountNeeded = 0;

        if (loanTokenAmountNeeded > 0) {
            if (loanTokenAddress == wethContract) {
                wethAmountNeeded = loanTokenAmountNeeded;
            } else {
                (uint256 loanToWethRate,) = _getExpectedRate(
                    loanTokenAddress,
                    wethContract,
                    loanTokenAmountNeeded
                );
                wethAmountNeeded = loanTokenAmountNeeded.mul(loanToWethRate).div(_getDecimalPrecision(loanTokenAddress, wethContract));
            }
        }

        // trade collateral token for WETH
        wethAmountReceived = _tradeForWeth(
            collateralTokenAddress,
            collateralTokenAmountUsable,
            address(this), // BZxOracle receives the WETH proceeds
            !isLiquidation ? wethAmountNeeded : wethAmountNeeded.add(gasUpperBound.mul(emaValue).mul(bountyRewardPercent).div(10**20))
        );
    }

    function _getDecimalPrecision(
        address sourceToken,
        address destToken)
        internal
        view
        returns(uint256)
    {
        uint256 sourceTokenDecimals = decimals[sourceToken];
        if (sourceTokenDecimals == 0)
            sourceTokenDecimals = EIP20(sourceToken).decimals();

        uint256 destTokenDecimals = decimals[destToken];
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
        uint256 sourceTokenAmount)
        internal
        view
        returns (uint256 expectedRate, uint256 slippageRate)
    {
        if (sourceTokenAddress == destTokenAddress) {
            expectedRate = 10**18;
            slippageRate = 10**18;
        } else {
            (expectedRate, slippageRate) = KyberNetworkInterface(kyberContract).getExpectedRate(
                sourceTokenAddress,
                destTokenAddress,
                sourceTokenAmount
            );
        }
    }

    function _trade(
        address sourceTokenAddress,
        address destTokenAddress,
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

            if (!_transferToken(
                destTokenAddress,
                vaultContract,
                destTokenAmountReceived)) {
                revert("BZxOracle::_trade: _transferToken failed");
            }

            if (sourceTokenAmountUsed < sourceTokenAmount) {
                // send unused source token back
                if (!_transferToken(
                    sourceTokenAddress,
                    vaultContract,
                    sourceTokenAmount-sourceTokenAmountUsed)) {
                    revert("BZxOracle::_trade: _transferToken failed");
                }
            }
        } else {
            // re-up the Kyber spend approval if needed
            uint256 tempAllowance = EIP20(sourceTokenAddress).allowance.gas(4999)(address(this), kyberContract);
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

            uint256 sourceBalanceBefore = EIP20(sourceTokenAddress).balanceOf.gas(4999)(address(this));

            destTokenAmountReceived = KyberNetworkInterface(kyberContract).trade(
                sourceTokenAddress,
                sourceTokenAmount,
                destTokenAddress,
                vaultContract, // BZxVault receives the trade proceeds
                maxDestTokenAmount,
                0, // no min coversation rate
                address(this)
            );

            sourceTokenAmountUsed = sourceBalanceBefore.sub(EIP20(sourceTokenAddress).balanceOf.gas(4999)(address(this)));
            if (sourceTokenAmountUsed < sourceTokenAmount) {
                // send unused source token back
                if (!_transferToken(
                    sourceTokenAddress,
                    vaultContract,
                    sourceTokenAmount-sourceTokenAmountUsed)) {
                    revert("BZxOracle::_trade: _transferToken failed");
                }
            }
        }
    }

    function _tradeForWeth(
        address sourceTokenAddress,
        uint256 sourceTokenAmount,
        address receiver,
        uint256 destWethAmountNeeded)
        internal
        returns (uint256 destWethAmountReceived)
    {
        if (sourceTokenAddress == wethContract) {
            if (destWethAmountNeeded > sourceTokenAmount)
                destWethAmountNeeded = sourceTokenAmount;

            if (receiver != address(this)) {
                if (!_transferToken(
                    wethContract,
                    receiver,
                    destWethAmountNeeded)) {
                    revert("BZxOracle::_tradeForWeth: _transferToken failed");
                }
            }

            destWethAmountReceived = destWethAmountNeeded;
        } else {
            // re-up the Kyber spend approval if needed
            uint256 tempAllowance = EIP20(sourceTokenAddress).allowance.gas(4999)(address(this), kyberContract);
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

            (bool result, bytes memory data) = kyberContract.call.gas(gasleft())(
                abi.encodeWithSignature(
                    "trade(address,uint256,address,address,uint256,uint256,address)",
                    sourceTokenAddress,
                    sourceTokenAmount,
                    wethContract,
                    receiver,
                    destWethAmountNeeded,
                    0, // no min coversation rate
                    address(this)
                )
            );

            assembly {
                switch result
                case 0 {
                    destWethAmountReceived := 0
                }
                default {
                    destWethAmountReceived := mload(add(data, 32))
                }
            }

            /*assembly {
                switch result
                case 0 {
                    destWethAmountReceived := 0
                }
                default {
                    returndatacopy(0, 0, 0x20) 
                    destWethAmountReceived := mload(0)
                }
            }*/
        }
    }

    function _tradeWithWeth(
        address destTokenAddress,
        uint256 sourceWethAmount,
        address receiver,
        uint256 destTokenAmountNeeded)
        internal
        returns (uint256 destTokenAmountReceived)
    {
        uint256 wethBalance = EIP20(wethContract).balanceOf.gas(4999)(address(this));
        if (destTokenAddress == wethContract) {
            if (destTokenAmountNeeded > sourceWethAmount)
                destTokenAmountNeeded = sourceWethAmount;
            if (destTokenAmountNeeded > wethBalance)
                destTokenAmountNeeded = wethBalance;

            if (receiver != address(this)) {
                if (!_transferToken(
                    wethContract,
                    receiver,
                    destTokenAmountNeeded)) {
                    revert("BZxOracle::_tradeWithWeth: _transferToken failed");
                }
            }

            destTokenAmountReceived = destTokenAmountNeeded;
        } else {
            if (sourceWethAmount > wethBalance) {
                sourceWethAmount = wethBalance;
            }

            // re-up the Kyber spend approval if needed
            uint256 tempAllowance = EIP20(wethContract).allowance.gas(4999)(address(this), kyberContract);
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

            (bool result, bytes memory data) = kyberContract.call.gas(gasleft())(
                abi.encodeWithSignature(
                    "trade(address,uint256,address,address,uint256,uint256,address)",
                    wethContract,
                    sourceWethAmount,
                    destTokenAddress,
                    receiver,
                    destTokenAmountNeeded,
                    0, // no min coversation rate
                    address(this)
                )
            );

            assembly {
                switch result
                case 0 {
                    destTokenAmountReceived := 0
                }
                default {
                    destTokenAmountReceived := mload(add(data, 32))
                }
            }

            /*assembly {
                switch result
                case 0 {
                    destTokenAmountReceived := 0
                }
                default {
                    returndatacopy(0, 0, 0x20) 
                    destTokenAmountReceived := mload(0)
                }
            }*/
        }
    }

    function _transferEther(
        address payable to,
        uint256 value)
        internal
        returns (bool)
    {
        uint256 amount = value;
        if (amount > address(this).balance) {
            amount = address(this).balance;
        }

        return (to.send(amount)); // solhint-disable-line check-send-result, multiple-sends
    }

    function _transferToken(
        address tokenAddress,
        address to,
        uint256 value)
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
