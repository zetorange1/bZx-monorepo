/*

  Copyright 2017 Tom Bean

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

// Sample dex integration contract
// this contract contains custom api code for interacting with this particular dex

pragma solidity ^0.4.9;

import '../oz_contracts/ownership/Ownable.sol';
import '../oz_contracts/math/SafeMath.sol';

contract DexA is Ownable {
    using SafeMath for uint256;

    address public dexContract;

    mapping (address => uint) public latest_prices; // mapping of token address to the last market price (price in amount per Wei)

    uint public liquidity_level; // liquidity level (high numbers mean better liquidity)
    uint public trust_level; // trust level (high numbers mean more trust)

    /*
     * Public functions
     */

    /*function DexA(address dexAddress_) public {
        dexContract = dexAddress_;
    }*/

    function setDexAddress(address dexAddress_) public onlyOwner {
        dexContract = dexAddress_;
    }
    function setLiquidityLevel(uint liquidityLevel_) public onlyOwner {
        liquidity_level = liquidityLevel_;
    }
    function setTrustLevel(uint trustLevel_) public onlyOwner {
        trust_level = trustLevel_;
    }

    // TODO: This currently for testing purposes. Remove later!
    function setTokenPrice(address token_, uint price_) public onlyOwner {
        latest_prices[token_] = price_;
    }

    // updates the latest token price in wei per 1 token (it updates the price each time it's called)
    // TODO: This currently creates bogus data for testing purposes! Obviously, update this later.
    function genTokenPrice(address token_) public returns (bool) {
        if (latest_prices[token_] == 0) {
            latest_prices[token_] = (uint(block.blockhash(block.number-1)) % 100 + 1) * 10**16;
        } else {
            if (uint(block.blockhash(block.number-1)) % 2 == 0) {
                latest_prices[token_] = latest_prices[token_].sub(latest_prices[token_]/100);
            } else {
                latest_prices[token_] = latest_prices[token_].add(latest_prices[token_]/100);
            }
        }
        return true;
    }

    function getTokenPrice(address token_) public constant returns (uint) {
        return latest_prices[token_];
    }
}
