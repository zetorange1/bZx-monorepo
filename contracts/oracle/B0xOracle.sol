
pragma solidity ^0.4.19;

import 'zeppelin-solidity/contracts/math/SafeMath.sol';

import '../modifiers/B0xOwnable.sol';

import '../modifiers/EMACollector.sol';
import '../modifiers/GasRefunder.sol';
import '../B0xVault.sol';
import '../shared/B0xTypes.sol';
import '../shared/Debugger.sol';

import '../tokens/EIP20.sol';
import '../interfaces/Oracle_Interface.sol';


// used for getting data from b0x
contract B0xInterface {
    function getLoanOrderParts (
        bytes32 loanOrderHash)
        public
        view
        returns (address[6],uint[8]);

    function getLoanParts (
        bytes32 loanOrderHash,
        address trader)
        public
        view
        returns (address,uint[4],bool);

    function getTradeParts (
        bytes32 loanOrderHash,
        address trader)
        public
        view
        returns (address,uint[4],bool);
}

contract B0xOracle is Oracle_Interface, EMACollector, GasRefunder, B0xTypes, Debugger, B0xOwnable {
    using SafeMath for uint256;

    //uint constant MAX_UINT = 2**256 - 1;

    // Percentage of interest retained as fee
    // This will always be between 0 and 100
    uint public interestFeePercent = 10;

    // Percentage of liquidation level that will trigger a liquidation of positions
    // This can never be less than 100
    uint public liquidationThresholdPercent = 110;

    // Percentage of gas refund paid to non-bounty hunters
    uint public gasRewardPercent = 90;

    // Percentage of gas refund paid to bounty hunters after successfully liquidating a trade
    uint public bountyRewardPercent = 110;

    address public VAULT_CONTRACT;
    address public KYBER_CONTRACT;

    mapping (bytes32 => GasData[]) public gasRefunds; // // mapping of loanOrderHash to array of GasData

    // Only the owner can directly deposit ether
    function() public payable onlyOwner {}

    function B0xOracle(
        address _vault_contract,
        address _kyber_contract) 
        public
        payable
    {
        VAULT_CONTRACT = _vault_contract;
        KYBER_CONTRACT = _kyber_contract;


        // settings for EMACollector
        emaValue = 20 * 10**9 wei; // set an initial price average for gas (20 gwei)
        emaPeriods = 10; // set periods to use for EMA calculation
    }

    // standard functions

    function didTakeOrder(
        address taker,
        bytes32 loanOrderHash,
        uint gasUsed)
        public
        onlyB0x
        updatesEMA(tx.gasprice)
        returns (bool)
    {
        gasRefunds[loanOrderHash].push(GasData({
            payer: taker,
            gasUsed: gasUsed.sub(msg.gas),
            isPaid: false
        }));

        return true;
    }

    function didOpenTrade(
        bytes32 /* loanOrderHash */,
        address /* trader */,
        address /* tradeTokenAddress */,
        uint /* tradeTokenAmount */,
        uint /* gasUsed */)
        public
        onlyB0x
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
        uint /* gasUsed */)
        public
        onlyB0x
        updatesEMA(tx.gasprice)
        returns (bool)
    {
        // interestFeePercent is only editable by owner
        uint interestFee = amountOwed.mul(interestFeePercent).div(100);

        // Transfers the interest to the lender, less the interest fee.
        // The fee is retained by the oracle.
        if (!EIP20(interestTokenAddress).transfer(lender, amountOwed.sub(interestFee)))
            revert();

        return true;
    }

    function didCloseTrade(
        bytes32 loanOrderHash,
        address tradeCloser,
        bool isLiquidation,
        uint gasUsed)
        public
        onlyB0x
        //refundsGas(taker, emaValue, gasUsed, 0) // refunds based on collected gas price EMA
        updatesEMA(tx.gasprice)
        returns (bool)
    {
        // sends gas refunds owed from earlier transactions
        for (uint i=0; i < gasRefunds[loanOrderHash].length; i++) {
            GasData storage gasData = gasRefunds[loanOrderHash][i];
            if (!gasData.isPaid) {
                if (sendRefund(
                    gasData.payer,
                    gasData.gasUsed,
                    emaValue,
                    gasRewardPercent))               
                        gasData.isPaid = true;
            }
        }

        // sends gas and bounty reward to bounting hunter
        if (isLiquidation) {
            calculateAndSendRefund(
                tradeCloser,
                gasUsed,
                emaValue,
                bountyRewardPercent);
        }
        
        return true;
    }

    function didDepositCollateral(
        address /* taker */,
        bytes32 /* loanOrderHash */,
        uint /* gasUsed */)
        public
        onlyB0x
        updatesEMA(tx.gasprice)
        returns (bool)
    {
        return true;
    }

    function didChangeCollateral(
        address /* taker */,
        bytes32 /* loanOrderHash */,
        uint /* gasUsed */)
        public
        onlyB0x
        updatesEMA(tx.gasprice)
        returns (bool)
    {
        return true;
    }

    function verifyAndDoTrade(
        bytes32 loanOrderHash,
        address trader,
        address sourceTokenAddress,
        address destTokenAddress,
        uint sourceTokenAmount,
        bool isLiquidation)
        public
        onlyB0x
        returns (uint destTokenAmount)
    {
        if (isLiquidation && !shouldLiquidate(loanOrderHash, trader)) {
            revert();
        }
        
        // temporary simulated trade for demo
        uint tradeRate = getTradeRate(sourceTokenAddress, destTokenAddress);
        destTokenAmount = sourceTokenAmount.mul(tradeRate);
        if (!EIP20(destTokenAddress).transfer(b0xContractAddress, destTokenAmount)) {
            revert();
        }

        // when Kyber is live we'll use the below code instead of the above
        /*destTokenAmount = tradeOnKyber(
            sourceTokenAddress,
            destTokenAddress,
            sourceTokenAmount,
            b0xContractAddress // b0x contract receives the recieves the destToken
        );*/
    }



    function shouldLiquidate(
        bytes32 loanOrderHash,
        address trader)
        public
        view
        returns (bool)
    {
        return (getMarginRatio(loanOrderHash, trader) <= (uint(liquidationThresholdPercent)));
    }

    function isTradeSupported(
        address sourceTokenAddress,
        address destTokenAddress)
        public
        view 
        returns (bool)
    {
        return (getTradeRate(sourceTokenAddress, destTokenAddress) > 0);
    }

    function getTradeRate(
        address /* sourceTokenAddress */,
        address /* destTokenAddress */)
        public
        view 
        returns (uint rate)
    {   
        // temporary simulated rate for demo
        rate = (uint(block.blockhash(block.number-1)) % 100 + 1) * 10**16;

        /*bytes32 pair = keccak256(sourceTokenAddress, destTokenAddress);

        if (pairConversionRate[pair] == 0) {
            pairConversionRate[pair] = (uint(block.blockhash(block.number-1)) % 100 + 1) * 10**16;
        } else {
            if (uint(block.blockhash(block.number-1)) % 2 == 0) {
                pairConversionRate[pair] = pairConversionRate[pair].sub(pairConversionRate[pair]/100);
            } else {
                pairConversionRate[pair] = pairConversionRate[pair].add(pairConversionRate[pair]/100);
            }
        }
        
        rate = pairConversionRate[pair];*/

        
        // when Kyber is live we'll use the below code instead of the above
        /*
        rate = findBestRateOnKyber(
            address sourceTokenAddress,
            address destTokenAddress);
        */
    }

    /*
     * Kyber.network interaction functions
     * Note: Note used for internal testnet
     */

    // Note: This function is necessary because the KyberNetwork contract method for finding best rate is internal to that contract.
    /*function findBestRateOnKyber(
        address sourceTokenAddress,
        address destTokenAddress)
        public
        view 
        returns (uint rate)
    {
        uint bestRate;
        //uint bestReserveBalance = 0;
        uint numReserves = KyberNetwork_Interface(KYBER_CONTRACT).getNumReserves();

        for(uint i = 0 ; i < numReserves ; i++) {
            var (rate,expBlock,balance) = KyberNetwork_Interface(KYBER_CONTRACT).getRate(sourceTokenAddress, destTokenAddress, i);

            if((expBlock >= block.number) && (balance > 0) && (rate > bestRate)) {
                bestRate = rate;
                //bestReserveBalance = balance;
            }
        }

        //reserveBalance = bestReserveBalance;
        rate = bestRate;
    }

    function tradeOnKyber(
        address sourceTokenAddress,
        address destTokenAddress,
        uint sourceTokenAmount,
        address destAddress
        )
        internal
        returns (uint destTokenAmount)
    {
        destTokenAmount = KyberNetwork_Interface(KYBER_CONTRACT).trade(
            sourceTokenAddress,
            sourceTokenAmount,
            destTokenAddress,
            destAddress, // this address recieves the destToken
            MAX_UINT, // no limit to the amount of tokens we can buy
            0, // no min coversation rate
            true // throws on failure
        );
    }*/


    // Should return a ratio of currentMarginAmount / maintenanceMarginAmount for this particular loan/trade
    // TODO: implement this
    function getMarginRatio(
        bytes32 /* loanOrderHash */,
        address /* trader */)
        public
        view
        returns (uint level)
    {
        level = 200;

        /*maintenanceMarginAmount
        tradeTokenAddress;
        tradeTokenAmount;
        collateralTokenAddress
        collateralTokenAmountFilled*/
    }

    function getLoanOrder (
        bytes32 loanOrderHash)
        internal
        view
        returns (LoanOrder)
    {
        var (addrs, uints) = B0xInterface(b0xContractAddress).getLoanOrderParts(loanOrderHash);

        return buildLoanOrderStruct(loanOrderHash, addrs, uints);
    }

    function getLoan (
        bytes32 loanOrderHash,
        address trader)
        internal
        view
        returns (Loan)
    {
        var (lender, uints, active) = B0xInterface(b0xContractAddress).getLoanParts(loanOrderHash, trader);

        return buildLoanStruct(lender, uints, active);
    }

    function getTrade (
        bytes32 loanOrderHash,
        address trader)
        internal
        view
        returns (Trade)
    {
        var (tradeTokenAddress, uints, active) = B0xInterface(b0xContractAddress).getTradeParts(loanOrderHash, trader);

        return buildTradeStruct(tradeTokenAddress, uints, active);
    }



    function getDecimals(EIP20 token) 
        internal
        view 
        returns(uint)
    {
        return token.decimals();
    }

    function setInterestFeePercent(
        uint newRate) 
        public
        onlyOwner
    {
        require(newRate != interestFeePercent && newRate >= 0 && newRate <= 100);
        interestFeePercent = newRate;
    }

    function setLiquidationThresholdPercent(
        uint newValue) 
        public
        onlyOwner
    {
        require(newValue != liquidationThresholdPercent && liquidationThresholdPercent >= 100);
        liquidationThresholdPercent = newValue;
    }

    function setGasRewardPercent(
        uint newValue) 
        public
        onlyOwner
    {
        require(newValue != gasRewardPercent);
        gasRewardPercent = newValue;
    }

    function setBountyRewardPercent(
        uint newValue) 
        public
        onlyOwner
    {
        require(newValue != bountyRewardPercent);
        bountyRewardPercent = newValue;
    }

    function setVaultContractAddress(
        address newAddress) 
        public
        onlyOwner
    {
        require(newAddress != VAULT_CONTRACT && newAddress != address(0));
        VAULT_CONTRACT = newAddress;
    }

    function setKyberContractAddress(
        address newAddress) 
        public
        onlyOwner
    {
        require(newAddress != KYBER_CONTRACT && newAddress != address(0));
        KYBER_CONTRACT = newAddress;
    }

    function setEMAPeriods (
        uint _newEMAPeriods)
        public
        onlyOwner {
        require(_newEMAPeriods > 1 && _newEMAPeriods != emaPeriods);
        emaPeriods = _newEMAPeriods;
    }
}
