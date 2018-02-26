
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
import '../interfaces/KyberNetwork_Interface.sol';

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

    address constant KYBER_ETH_TOKEN_ADDRESS = 0x00eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee;

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
        bytes32 loanOrderHash,
        address taker,
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
        bytes32 /* loanOrderHash */,
        address /* borrower */,
        uint /* gasUsed */)
        public
        onlyB0x
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
        
        if (KYBER_CONTRACT == address(0)) {
            uint tradeRate = getTradeRate(sourceTokenAddress, destTokenAddress);
            destTokenAmount = sourceTokenAmount.mul(tradeRate).div(10**18);
            if (!EIP20(destTokenAddress).transfer(b0xContractAddress, destTokenAmount)) {
                revert();
            }
        }
        else {
            uint destEtherAmount = KyberNetwork_Interface(KYBER_CONTRACT).trade(
                sourceTokenAddress,
                sourceTokenAmount,
                KYBER_ETH_TOKEN_ADDRESS,
                this, // B0xOracle receives the Ether proceeds
                MAX_UINT, // no limit on the dest amount 
                0, // no min coversation rate
                this
            );

            destTokenAmount = KyberNetwork_Interface(KYBER_CONTRACT).trade
                .value(destEtherAmount)( // send Ether along 
                KYBER_ETH_TOKEN_ADDRESS,
                destEtherAmount,
                destTokenAddress,
                b0xContractAddress, // b0x recieves the destToken
                MAX_UINT, // no limit to the amount of tokens we can buy
                0, // no min coversation rate
                this
            );
        }
    }

    // TODO
    function shouldLiquidate(
        bytes32 loanOrderHash,
        address trader)
        public
        view
        returns (bool)
    {
        return false;
        /*
        LoanOrder memory loanOrder = getLoanOrder(loanOrderHash);
        
        if (block.timestamp >= loanOrder.expirationUnixTimestampSec) {
            return true;
        }
        else {
            return (_getMarginRatio(loanOrder, trader) <= (uint(liquidationThresholdPercent)));
        }
        */
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
        address sourceTokenAddress,
        address destTokenAddress)
        public
        view 
        returns (uint rate)
    {   
        if (KYBER_CONTRACT == address(0)) {
            rate = (uint(block.blockhash(block.number-1)) % 100 + 1).mul(10**18);
        }
        else {
            var (, sourceToEther) = KyberNetwork_Interface(KYBER_CONTRACT).findBestRate(
                sourceTokenAddress, 
                KYBER_ETH_TOKEN_ADDRESS, 
                0
            );
            var (, etherToDest) = KyberNetwork_Interface(KYBER_CONTRACT).findBestRate(
                KYBER_ETH_TOKEN_ADDRESS, 
                destTokenAddress, 
                0
            );
            
            rate = sourceToEther.mul(etherToDest).div(10**18);
        }
    }

    // TODO
    function getMarginRatio(
        bytes32 /* loanOrderHash */,
        address /* trader */)
        public
        view
        returns (uint level)
    {
        level = 200;
        /*LoanOrder memory loanOrder = getLoanOrder(loanOrderHash);
        Loan memory loan = getLoan(loanOrderHash, trader);

        level = _getMarginRatio(
            trader,
            tradeTokenAddress,
            tradeTokenAmount,
            loanOrder.loanTokenAddress,
            loanOrder.collateralTokenAddress,
            loan.collateralTokenAmountFilled,
            loan.loanTokenAmountFilled
            loanOrder.maintenanceMarginAmount
        );*/
    }


    // Should return a ratio of currentMarginAmount / maintenanceMarginAmount for this particular loan/trade
    // TODO
    function _getMarginRatio(
        address /* trader */,
        address /* collateralTokenAddress */,
        address /* tradeTokenAddress */,
        uint /* collateralTokenAmountFilled */,
        uint /* tradeTokenAmount */,
        uint /* maintenanceMarginAmount */)
        internal
        view
        returns (uint level)
    {
        level = 200;
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
