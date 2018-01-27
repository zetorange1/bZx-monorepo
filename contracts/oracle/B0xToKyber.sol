
pragma solidity 0.4.18;

import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import 'zeppelin-solidity/contracts/ownership/Ownable.sol';

import '../tokens/EIP20.sol';

contract B0xToKyber is Ownable {
    using SafeMath for uint256;

    mapping(bytes32 => uint) pairConversionRate;

    /*
     * Public functions
     */

    // NOTE: this is intentionally not a view function to ease testing
    // This function creates bogus rates to simulate price changes
    // TODO: connect to KyberNetwork.getPrice
    function getKyberRate(
        address source,
        address dest)
        public
        returns (uint rate)
    {
        bytes32 pair = keccak256(source,dest);

        if (pairConversionRate[pair] == 0) {
            pairConversionRate[pair] = (uint(block.blockhash(block.number-1)) % 100 + 1) * 10**16;
        } else {
            if (uint(block.blockhash(block.number-1)) % 2 == 0) {
                pairConversionRate[pair] = pairConversionRate[pair].sub(pairConversionRate[pair]/100);
            } else {
                pairConversionRate[pair] = pairConversionRate[pair].add(pairConversionRate[pair]/100);
            }
        }
        
        rate = pairConversionRate[pair];
    }
    
    // This function simulates a trade with Kyber
    // TODO: connect to KyberNetwork.trade
    function tradeOnKyber(
        address sourceAddress,
        address destAddress,
        uint sourceAmount)
        public
        onlyOwner
        returns (uint destTokenAmount)
    {
        uint sourceDecimals = getDecimals(EIP20(sourceAddress));
        uint destDecimals = getDecimals(EIP20(destAddress));

        uint rate = (getKyberRate(sourceAddress, destAddress) * (10**destDecimals)) / (10**sourceDecimals);

        //destTokenAmount = 
/*
        
        function trade(ERC20 sourceToken,
            uint sourceAmount,
            ERC20 destToken,
            address destAddress,
            bool validate )
    }
trade( ERC20 sourceToken,
                    uint sourceAmount,
                    ERC20 destToken,
                    address destAddress,
                    bool validate ) payable returns(bool) {
*/
    }
    /*
     * Public constant functions
     */


    function getDecimals(EIP20 token) 
        internal
        view 
        returns(uint)
    {
        return token.decimals();
    }
}
