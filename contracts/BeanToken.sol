pragma solidity ^0.4.4;

import '../oz_contracts/token/StandardToken.sol';

contract BeanToken is StandardToken {

    string constant public name = "Bean Token";
    string constant public symbol = "BEAN";
	uint8 constant public decimals = 18;
    uint public totalSupply = 15000000000000000000000000; // 15 million tokens (18 decimal places), 10 * 10**24

    function BeanToken(address owner_) public {
        if (owner_ != address(0))
			balances[owner_] = totalSupply;
		else
			balances[msg.sender] = totalSupply;
    }
}