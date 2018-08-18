
pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

import "../modifiers/BZxOwnable.sol";
import "../modifiers/EMACollector.sol";
import "../modifiers/GasRefunder.sol";

import "../tokens/EIP20.sol";
import "../tokens/EIP20Wrapper.sol";
//import "./OracleInterface.sol";


// solhint-disable-next-line contract-name-camelcase
interface WETH_Interface {
    function deposit() external payable;
    function withdraw(uint wad) external;
}


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


contract BZxOracle is EIP20Wrapper, EMACollector, GasRefunder, BZxOwnable {
    using SafeMath for uint256;

    // this is the value the Kyber portal uses when setting a very high maximum number
    uint internal constant MAX_FOR_KYBER = 57896044618658097711785492504343953926634992332820282019728792003956564819968;

    address internal constant KYBER_ETH_TOKEN_ADDRESS = 0x00eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee;

    // Bounty hunters are remembursed from collateral
    // The oracle requires a minimum amount for a loan to be opened
    uint public minimumCollateralInEthAmount = 5**17 wei; // 0.5 ether

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


    // orderAddresses: loanTokenAddress, collateralTokenAddress, interestTokenAddress, taker
    // orderAmounts: loanTokenAmount, collateralTokenAmount, interestTokenAmount, gasUsed
    function didTakeOrder(
        bytes32 /* loanOrderHash */,
        address[4] orderAddresses,
        uint[4] orderAmounts)
        public
        onlyBZx
        updatesEMA(tx.gasprice)
        returns (bool)
    {
        uint collateralInEthAmount;
        if (orderAddresses[1] != wethContract) {
            (uint collateralToEthRate,) = _getExpectedRate(
                orderAddresses[1], // collateralTokenAddress
                wethContract,
                0
            );
            collateralInEthAmount = orderAmounts[1].mul(collateralToEthRate).div(10**18);
        } else {
            collateralInEthAmount = orderAmounts[1];
        }
        
        require(collateralInEthAmount >= minimumCollateralInEthAmount, "collateral below minimum for BZxOracle");

        return true;
    }

    function didTradePosition(
        bytes32 /* loanOrderHash */,
        address /* trader */,
        address /* tradeTokenAddress */,
        uint /* tradeTokenAmount */,
        uint /* gasUsed */)
        public
        onlyBZx
        updatesEMA(tx.gasprice)
        returns (bool)
    {
        return true;
    }

    function didPayInterest(
        bytes32 /* loanOrderHash */,
        address /* trader */,
        address lender,
        address interestTokenAddress,
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
            interestTokenAddress,
            lender,
            amountOwed.sub(interestFee))) {
            revert("BZxOracle::didPayInterest: _transferToken failed");
        }

        // TODO: Block withdrawal below a certain amount
        if (interestTokenAddress == wethContract) {
            // interest paid in WETH is withdrawn to Ether
            WETH_Interface(wethContract).withdraw(interestFee);
        } else if (convert && interestTokenAddress != bZRxTokenContract) {
            // interest paid in BZRX is retained as is, other tokens are sold for Ether
            _doTradeForEth(
                interestTokenAddress,
                interestFee,
                this, // BZxOracle receives the Ether proceeds
                MAX_FOR_KYBER // no limit on the dest amount
            );
        }

        return true;
    }

    function didDepositCollateral(
        bytes32 /* loanOrderHash */,
        address /* borrower */,
        uint /* gasUsed */)
        public
        onlyBZx
        updatesEMA(tx.gasprice)
        returns (bool)
    {
        return true;
    }

    function didWithdrawCollateral(
        bytes32 /* loanOrderHash */,
        address /* borrower */,
        uint /* gasUsed */)
        public
        onlyBZx
        updatesEMA(tx.gasprice)
        returns (bool)
    {
        return true;
    }

    function didChangeCollateral(
        bytes32 /* loanOrderHash */,
        address /* borrower */,
        uint /* gasUsed */)
        public
        onlyBZx
        updatesEMA(tx.gasprice)
        returns (bool)
    {
        return true;
    }

    function didWithdrawProfit(
        bytes32 /* loanOrderHash */,
        address /* borrower */,
        uint /* profitOrLoss */,
        uint /* gasUsed */)
        public
        onlyBZx
        updatesEMA(tx.gasprice)
        returns (bool)
    {
        return true;
    }
    
    function didCloseLoan(
        bytes32 /* loanOrderHash */,
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
        address loanTokenAddress,
        address positionTokenAddress,
        address collateralTokenAddress,
        uint loanTokenAmount,
        uint positionTokenAmount,
        uint collateralTokenAmount,
        uint maintenanceMarginAmount)
        public
        onlyBZx
        returns (uint destTokenAmount)
    {
        if (!shouldLiquidate(
            0x0,
            0x0,
            loanTokenAddress,
            positionTokenAddress,
            collateralTokenAddress,
            loanTokenAmount,
            positionTokenAmount,
            collateralTokenAmount,
            maintenanceMarginAmount)) {
            return 0;
        }
        
        destTokenAmount = _doTrade(
            positionTokenAddress,
            loanTokenAddress,
            positionTokenAmount,
            MAX_FOR_KYBER); // no limit on the dest amount
    }

    // note: bZx will only call this function if isLiquidation=true or loanTokenAmountNeeded > 0
    function processCollateral(
        address collateralTokenAddress,
        address loanTokenAddress,
        uint collateralTokenAmountUsable,
        uint loanTokenAmountNeeded,
        uint initialMarginAmount,
        uint maintenanceMarginAmount,
        bool isLiquidation)
        public
        onlyBZx
        returns (uint loanTokenAmountCovered, uint collateralTokenAmountUsed)
    {   
        require(isLiquidation || loanTokenAmountNeeded > 0, "!isLiquidation && loanTokenAmountNeeded == 0");
        
        uint collateralTokenBalance = EIP20(collateralTokenAddress).balanceOf.gas(4999)(this); // Changes to state require at least 5000 gas
        if (collateralTokenBalance < collateralTokenAmountUsable) { // sanity check
            revert("BZxOracle::processCollateral: collateralTokenBalance < collateralTokenAmountUsable");
        }

        uint etherAmountNeeded = 0;
        uint etherAmountReceived = 0;

        if (loanTokenAmountNeeded > 0) {
            if (loanTokenAddress == wethContract) {
                etherAmountNeeded = loanTokenAmountNeeded;
            } else {
                uint etherToLoan;
                (etherToLoan,) = _getExpectedRate(
                    wethContract,
                    loanTokenAddress, 
                    0
                );
                etherAmountNeeded = loanTokenAmountNeeded.mul(10**18).div(etherToLoan);
            }
        }

        // trade collateral token for ether
        etherAmountReceived = _doTradeForEth(
            collateralTokenAddress,
            collateralTokenAmountUsable,
            this, // BZxOracle receives the Ether proceeds
            !isLiquidation ? etherAmountNeeded : etherAmountNeeded.add(gasUpperBound.mul(emaValue).mul(bountyRewardPercent).div(100))
        );
        
        if (loanTokenAmountNeeded > 0) {
            if ((minInitialMarginAmount == 0 || initialMarginAmount >= minInitialMarginAmount) &&
                (minMaintenanceMarginAmount == 0 || maintenanceMarginAmount >= minMaintenanceMarginAmount)) {
                // cover losses with collateral proceeds + oracle insurance
                loanTokenAmountCovered = _doTradeWithEth(
                    loanTokenAddress,
                    address(this).balance, // maximum usable amount
                    vaultContract,
                    loanTokenAmountNeeded
                );
            } else {
                // cover losses with just collateral proceeds
                loanTokenAmountCovered = _doTradeWithEth(
                    loanTokenAddress,
                    etherAmountReceived, // maximum usable amount
                    vaultContract,
                    loanTokenAmountNeeded
                );
            }
        }

        collateralTokenAmountUsed = collateralTokenBalance.sub(EIP20(collateralTokenAddress).balanceOf.gas(4999)(this)); // Changes to state require at least 5000 gas
        
        if (collateralTokenAmountUsed < collateralTokenAmountUsable) {
            // send unused collateral token back to the vault
            if (!_transferToken(
                collateralTokenAddress,
                vaultContract,
                collateralTokenAmountUsable-collateralTokenAmountUsed)) {
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
            loanToPositionAmount = loanTokenAmount.mul(10**18).div(positionToLoanRate);
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
            collateralToLoanAmount = collateralTokenAmount.mul(collateralToLoanRate).div(10**18);
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
            positionToLoanAmount = positionTokenAmount.mul(positionToLoanRate).div(10**18);
        }

        return collateralToLoanAmount.add(positionToLoanAmount).sub(loanTokenAmount).mul(10**20).div(loanTokenAmount);
    }

    /*
    * Owner functions
    */

    function setMinimumCollateralInEthAmount(
        uint newValue) 
        public
        onlyOwner
    {
        require(newValue != minimumCollateralInEthAmount);
        minimumCollateralInEthAmount = newValue;
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
        } else {
            if (sourceTokenAddress == wethContract) {
                WETH_Interface(wethContract).withdraw(sourceTokenAmount);

                destTokenAmount = KyberNetwork_Interface(kyberContract).trade
                    .value(sourceTokenAmount)( // send Ether along 
                    KYBER_ETH_TOKEN_ADDRESS,
                    sourceTokenAmount,
                    destTokenAddress,
                    vaultContract, // bZxVault recieves the destToken
                    maxDestTokenAmount,
                    0, // no min coversation rate
                    address(0)
                );
            } else if (destTokenAddress == wethContract) {
                // re-up the Kyber spend approval if needed
                if (EIP20(sourceTokenAddress).allowance.gas(4999)(this, kyberContract) < 
                    MAX_FOR_KYBER) {
                    
                    eip20Approve(
                        sourceTokenAddress,
                        kyberContract,
                        MAX_FOR_KYBER);
                }

                destTokenAmount = KyberNetwork_Interface(kyberContract).trade(
                    sourceTokenAddress,
                    sourceTokenAmount,
                    KYBER_ETH_TOKEN_ADDRESS,
                    this, // BZxOracle receives the Ether proceeds
                    maxDestTokenAmount,
                    0, // no min coversation rate
                    address(0)
                );

                WETH_Interface(wethContract).deposit.value(destTokenAmount)();

                if (!_transferToken(
                    destTokenAddress,
                    vaultContract,
                    destTokenAmount)) {
                    revert("BZxOracle::_doTrade: _transferToken failed");
                }
            } else {
                // re-up the Kyber spend approval if needed
                if (EIP20(sourceTokenAddress).allowance.gas(4999)(this, kyberContract) < 
                    MAX_FOR_KYBER) {
                    
                    eip20Approve(
                        sourceTokenAddress,
                        kyberContract,
                        MAX_FOR_KYBER);
                }
                
                uint maxDestEtherAmount = maxDestTokenAmount;
                if (maxDestTokenAmount < MAX_FOR_KYBER) {
                    uint etherToDest;
                    (etherToDest,) = KyberNetwork_Interface(kyberContract).getExpectedRate(
                        KYBER_ETH_TOKEN_ADDRESS,
                        destTokenAddress, 
                        0
                    );
                    maxDestEtherAmount = maxDestTokenAmount.mul(10**18).div(etherToDest);
                }

                uint destEtherAmount = KyberNetwork_Interface(kyberContract).trade(
                    sourceTokenAddress,
                    sourceTokenAmount,
                    KYBER_ETH_TOKEN_ADDRESS,
                    this, // BZxOracle receives the Ether proceeds
                    maxDestEtherAmount,
                    0, // no min coversation rate
                    address(0)
                );

                destTokenAmount = KyberNetwork_Interface(kyberContract).trade
                    .value(destEtherAmount)( // send Ether along 
                    KYBER_ETH_TOKEN_ADDRESS,
                    destEtherAmount,
                    destTokenAddress,
                    vaultContract, // bZxVault recieves the destToken
                    maxDestTokenAmount,
                    0, // no min coversation rate
                    address(0)
                );
            }
        }
    }

    function _doTradeForEth(
        address sourceTokenAddress,
        uint sourceTokenAmount,
        address receiver,
        uint destEthAmountNeeded)
        internal
        returns (uint)
    {
        if (sourceTokenAddress == wethContract) {
            if (destEthAmountNeeded > sourceTokenAmount)
                destEthAmountNeeded = sourceTokenAmount;
            WETH_Interface(wethContract).withdraw(destEthAmountNeeded);

            if (receiver != address(this)) {
                if (!_transferEther(
                    receiver,
                    destEthAmountNeeded)) {
                    revert("BZxOracle::_doTradeForEth: _transferEther failed");
                }
            }
            
            return destEthAmountNeeded;
        } else {
            // re-up the Kyber spend approval if needed
            if (EIP20(sourceTokenAddress).allowance.gas(4999)(this, kyberContract) < 
                MAX_FOR_KYBER) {

                eip20Approve(
                    sourceTokenAddress,
                    kyberContract,
                    MAX_FOR_KYBER);
            }

            /*destEthAmountReceived = KyberNetwork_Interface(kyberContract).trade(
                sourceTokenAddress,
                sourceTokenAmount,
                KYBER_ETH_TOKEN_ADDRESS,
                receiver,
                destEthAmountNeeded,
                0, // no min coversation rate
                address(0)
            );*/


            /* the following code is to allow the Kyber trade to fail silently and not revert if it does, preventing a "bubble up" */
            
            // bytes4(keccak256("trade(address,uint256,address,address,uint256,uint256,address)")) = 0xcb3c28c7
            bool result = kyberContract.call
                .gas(gasleft())(
                0xcb3c28c7,
                sourceTokenAddress,
                sourceTokenAmount,
                KYBER_ETH_TOKEN_ADDRESS,
                receiver,
                destEthAmountNeeded,
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
        }
    }

    function _doTradeWithEth(
        address destTokenAddress,
        uint sourceEthAmount,
        address receiver,
        uint destTokenAmountNeeded)
        internal
        returns (uint)
    {
        if (destTokenAddress == wethContract) {
            if (destTokenAmountNeeded > sourceEthAmount)
                destTokenAmountNeeded = sourceEthAmount;
            if (destTokenAmountNeeded > address(this).balance)
                destTokenAmountNeeded = address(this).balance;
            
            WETH_Interface(wethContract).deposit.value(destTokenAmountNeeded)();
            if (receiver != address(this)) {
                if (!_transferToken(
                    wethContract,
                    receiver,
                    destTokenAmountNeeded)) {
                    revert("BZxOracle::_doTradeWithEth: _transferToken failed");
                }
            }
            
            return destTokenAmountNeeded;
        } else {
            if (sourceEthAmount == address(this).balance) {
                // only send a little more than needed, rather than the entire contract balance
                uint etherToDest;
                (etherToDest,) = KyberNetwork_Interface(kyberContract).getExpectedRate(
                    KYBER_ETH_TOKEN_ADDRESS,
                    destTokenAddress, 
                    0
                );
                // calculate amount of ETH to use with a 5% buffer (unused ETH is returned by Kyber)
                sourceEthAmount = destTokenAmountNeeded.mul(10**18).div(etherToDest).mul(105).div(100);
                if (sourceEthAmount > address(this).balance) {
                    sourceEthAmount = address(this).balance;
                }
            }
            
            /*destTokenAmountReceived = KyberNetwork_Interface(kyberContract).trade
                .value(sourceEthAmount)( // send Ether along 
                KYBER_ETH_TOKEN_ADDRESS,
                sourceEthAmount,
                destTokenAddress,
                receiver,
                destTokenAmountNeeded,
                0, // no min coversation rate
                address(0)
            );*/


            /* the following code is to allow the Kyber trade to fail silently and not revert if it does, preventing a "bubble up" */

            // bytes4(keccak256("trade(address,uint256,address,address,uint256,uint256,address)")) = 0xcb3c28c7
            bool result = kyberContract.call
                .gas(gasleft())
                .value(sourceEthAmount)( // send Ether along 
                0xcb3c28c7,
                KYBER_ETH_TOKEN_ADDRESS,
                sourceEthAmount,
                destTokenAddress,
                receiver,
                destTokenAmountNeeded,
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
