
pragma solidity 0.4.24;

import "../../oracle/BZxOracle.sol";


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

    function() public payable {} // solhint-disable-line no-empty-blocks

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
            expectedRate = 10**18;
            //expectedRate = (uint(block.blockhash(block.number-1)) % 100 + 1).mul(10**18);
            slippageRate = 0;
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
                destTokenAmount), "TestNetFaucet::_doTrade: trade failed");
        }
    }

    function _doTradeForEth(
        address /*sourceTokenAddress*/,
        uint sourceTokenAmount,
        address /*receiver*/,
        uint destEthAmountNeeded)
        internal
        returns (uint destTokenAmountReceived)
    {
        destTokenAmountReceived = destEthAmountNeeded < sourceTokenAmount ? destEthAmountNeeded : sourceTokenAmount;
    }

    function _doTradeWithEth(
        address /*destTokenAddress*/,
        uint sourceEthAmount,
        address, /*receiver*/
        uint destTokenAmountNeeded)
        internal
        returns (uint destTokenAmountReceived)
    {
        destTokenAmountReceived = destTokenAmountNeeded < sourceEthAmount ? destTokenAmountNeeded : sourceEthAmount;
    }
}
