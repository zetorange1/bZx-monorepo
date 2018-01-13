
pragma solidity ^0.4.9;

import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import 'zeppelin-solidity/contracts/ownership/Ownable.sol';

//import '../interfaces/EIP20.sol';
import './ERC20_AlwaysOwned.sol';

contract KyberWrapper is Ownable {
    using SafeMath for uint256;

    mapping(bytes32 => uint) pairConversionRate;

    /*
     * Public functions
     */

    // note: this is intentionally not a constant function to ease testing
    // this function creates bogus rates to simulate price changes
    function getKyberPrice(
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
/*
    fuction tradeOnKyber()
trade( ERC20 sourceToken,
                    uint sourceAmount,
                    ERC20 destToken,
                    address destAddress,
                    bool validate ) payable returns(bool) {
*/
    /*
     * Public constant functions
     */

}
