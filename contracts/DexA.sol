
pragma solidity ^0.4.9;

import './DexInterface.sol';

contract DexA is DexInterface {

    /*function DexA(address dexAddress_) public {
        dexContract = dexAddress_;
    }*/

    function setDexAddress(address dexAddress_) onlyOwner public {
        dexContract = dexAddress_;
    }

    /*function setLiquidityLevel(uint liquidityLevel_) onlyOwner public {
        liquidity_level = liquidityLevel_;
    }
    
    function setTrustLevel(uint trustLevel_) onlyOwner public {
        trust_level = trustLevel_;
    }*/

    // TODO: This currently for testing purposes. Remove later!
    function setTokenPrice(address token_, uint price_) onlyOwner public {
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

    // return token price in wei per 1 token
    function getTokenPrice(address token_) public constant returns (uint) {
        return latest_prices[token_];
    }

    // returns number of giveToken_ units requred to buy 1 getToken_ unit (x giveToken_/getToken+)
    function getTradePrice(address giveToken_, address getToken_) public constant returns (uint) {
        require (latest_prices[giveToken_] > 0 && latest_prices[getToken_] > 0);

        /*
            x wei/giveToken / y wei/getToken =
            x/y wei/giveToken * getToken/wei =
            x/y getToken / 1 giveToken
        */

        return latest_prices[giveToken_].div(latest_prices[getToken_]);
    }
}
