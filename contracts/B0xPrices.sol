/*

  Copyright 2017 ZeroEx Intl.
  Modifications Copyright 2017 Tom Bean

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.

*/

pragma solidity ^0.4.9;

import '../oz_contracts/ownership/Ownable.sol';
import '../oz_contracts/math/SafeMath.sol';

contract B0xPrices is Ownable {
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


    struct PriceDatum {
        uint price; // the price of a token
        address source; // the source of this price (oracle/reserve manager)
        uint updated; // the time of last update
    }
    mapping (address => PriceDatum[]) public price_feed; // mapping of token addresses to array price data from various sources
    mapping (address => uint) public latest_prices; // mapping of token address to the last market price (price in amount per Wei)

    mapping (address => uint) public source_trust_level; // mapping of source address to trust level (high numbers mean more trust)

    // todo: set to a lower (more reasonable value)
    // future todo: each token should have their own customizable threshold
    uint constant public staleThreshold = 31536000;

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


    // todo: use source_trust_level to allow certain prices to be weighted higher than others in the price calculation 
    function setTokenPrice(address sender_, address token_, uint price_) public onlyAuthorized returns (bool) {
    
        PriceDatum[] storage pf = price_feed[token_];
        
        uint sum = 0;
        uint count = 0;
        bool found = false;
        for (uint p = 0; p < pf.length; p++) {
            if (pf[p].source == sender_) {
                found = true;
                pf[p].price = price_;
                pf[p].updated = now;

                sum = sum.add(price_);
                count++;
            }
            else {
                // only use other prices that aren't stale
                if (pf[p].updated >= now-staleThreshold) {
                    sum = sum.add(price_);
                    count++;
                }
                else {
                    delete pf[p];
                }
            }
        }

        if (!found) {
            pf.push(PriceDatum({
                price: price_,
                source: sender_,
                updated: now
            }));

            sum = sum.add(price_);
            count++;
        }
        
        // take the average of all non-stale prices to determine current market price
        latest_prices[token_] = sum.div(count);

        return true;
    }

    function setSourceTrustLevel(address source_, uint trustLevel_) public onlyAuthorized returns (bool) {
        source_trust_level[source_] = trustLevel_;
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


    // returns the latest token price in wei per 1 token
    function getTokenPrice(address token_) public constant returns (uint) {
        return latest_prices[token_];
    }

    // returns trust level of the data provider source
    function getSourceTrustLevel(address source_) public constant returns (uint) {
        return source_trust_level[source_];
    }
}
