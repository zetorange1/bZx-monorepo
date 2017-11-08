pragma solidity ^0.4.4;

import 'oz_contracts/token/StandardToken.sol';

import './Shared.sol';

contract POCToken is StandardToken, Shared {

    string constant public name = "POC Token";
    string constant public symbol = "POC";
	uint8 constant public decimals = 18;
    uint public totalSupply = 1000000; //1 * 10**24; // 1 million tokens (18 decimal places)

    function POCToken(address taker0x) {
        // assign all tokens to sample wallet 9
        balances[SAMPLE_WALLET_9] = totalSupply;
        
        // allow Taker0x complete access to these tokens
        allowed[SAMPLE_WALLET_9][taker0x] = totalSupply;
    }
}