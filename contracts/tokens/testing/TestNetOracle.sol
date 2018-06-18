
pragma solidity ^0.4.24; // solhint-disable-line compiler-fixed

import "../../oracle/B0xOracle.sol";


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

    address public faucetContract;

    function() public payable {} // solhint-disable-line no-empty-blocks

    constructor(
        address _vaultContract,
        address _kyberContract,
        address _wethContract,
        address _b0xTokenContract)
        public
        B0xOracle(
            _vaultContract,
            _kyberContract,
            _wethContract,
            _b0xTokenContract)
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
        require(newAddress != faucetContract && newAddress != address(0));
        faucetContract = newAddress;
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
                faucetContract,
                sourceTokenAmount);
            require(Faucet(faucetContract).oracleExchange(
                destTokenAddress,
                vaultContract,
                destTokenAmount));
        }
    }

    function _doTradeForEth(
        address /*sourceTokenAddress*/,
        uint sourceTokenAmount,
        address /*receiver*/)
        internal
        returns (uint destTokenAmountReceived)
    {
        destTokenAmountReceived = sourceTokenAmount;
    }

    function _doTradeWithEth(
        address /*destTokenAddress*/,
        uint destTokenAmountNeeded,
        address /*receiver*/)
        internal
        returns (uint destTokenAmountReceived)
    {
        destTokenAmountReceived = destTokenAmountNeeded;
    }
}
