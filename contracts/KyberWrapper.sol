
pragma solidity ^0.4.9;

import 'oz_contracts/ownership/Ownable.sol';
import 'oz_contracts/math/SafeMath.sol';

//import './ERC20_AlwaysOwned.sol';

contract KyberWrapper is Ownable {
    using SafeMath for uint256;

    /// @dev Only authorized addresses can invoke functions with this modifier.
    modifier onlyAuthorized {
        require(authorized[msg.sender]);
        _;
    }

    modifier targetAuthorized(address target) {
        require(authorized[target]);
        _;
    }

    modifier targetNotAuthorized(address target) {
        require(!authorized[target]);
        _;
    }

    mapping (address => bool) public authorized;
    address[] public authorities;

    mapping(bytes32 => uint) pairConversionRate;

    event LogAuthorizedAddressAdded(address indexed target, address indexed caller);
    event LogAuthorizedAddressRemoved(address indexed target, address indexed caller);

    /*
     * Public functions
     */

    /// @dev Authorizes an address.
    /// @param target Address to authorize.
    function addAuthorizedAddress(address target)
        public
        onlyOwner
        targetNotAuthorized(target)
    {
        authorized[target] = true;
        authorities.push(target);
        LogAuthorizedAddressAdded(target, msg.sender);
    }

    /// @dev Removes authorizion of an address.
    /// @param target Address to remove authorization from.
    function removeAuthorizedAddress(address target)
        public
        onlyOwner
        targetAuthorized(target)
    {
        delete authorized[target];
        for (uint i = 0; i < authorities.length; i++) {
            if (authorities[i] == target) {
                authorities[i] = authorities[authorities.length - 1];
                authorities.length -= 1;
                break;
            }
        }
        LogAuthorizedAddressRemoved(target, msg.sender);
    }


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
     * Public constant functions
     */

    /// @dev Gets all authorized addresses.
    /// @return Array of authorized addresses.
    function getAuthorizedAddresses()
        public
        constant
        returns (address[])
    {
        return authorities;
    }
}
