
pragma solidity ^0.4.24;

import '../../oracle/B0xOracle.sol';

contract Faucet {
    function oracleExchange(
            address getToken,
            address receiver,
            uint getTokenAmount)
            public
            returns (bool);
}

contract TestNetOracle is B0xOracle {
    using SafeMath for uint256;

    address public FAUCET_CONTRACT;

    function() public payable {}

    constructor(
        address _vault_contract,
        address _kyber_contract,
        address _weth_contract)
        B0xOracle(
            _vault_contract,
            _kyber_contract,
            _weth_contract)
        public
        payable
    {}

    /*
    * Public View functions
    */

    function getTradeRate(
        address sourceTokenAddress,
        address destTokenAddress)
        public
        view 
        returns (uint rate)
    {   
        if (sourceTokenAddress == destTokenAddress) {
            rate = 10**18;
        } else {
            rate = 10**18;
            //rate = (uint(block.blockhash(block.number-1)) % 100 + 1).mul(10**18);
        }
    }

    /*
    * Owner functions
    */

    function setFaucetContractAddress(
        address newAddress) 
        public
        onlyOwner
    {
        require(newAddress != FAUCET_CONTRACT && newAddress != address(0));
        FAUCET_CONTRACT = newAddress;
    }

    /*
    * Internal functions
    */

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
            uint tradeRate = getTradeRate(sourceTokenAddress, destTokenAddress);
            destTokenAmount = sourceTokenAmount.mul(tradeRate).div(10**18);
            if (destTokenAmount > maxDestTokenAmount) {
                destTokenAmount = maxDestTokenAmount;
            }
            _transferToken(
                sourceTokenAddress,
                FAUCET_CONTRACT,
                sourceTokenAmount);
            require(Faucet(FAUCET_CONTRACT).oracleExchange(
                destTokenAddress,
                VAULT_CONTRACT,
                destTokenAmount));
        }
    }
}
