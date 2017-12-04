pragma solidity ^0.4.4;

import './ERC20_AlwaysOwned.sol';

contract BeanToken is ERC20_AlwaysOwned {

    string constant public name = "Bean Token";
    string constant public symbol = "BEAN";
	uint8 constant public decimals = 18;
    uint public totalSupply = 15000000000000000000000000; // 15 million tokens (18 decimal places), 10 * 10**24

    function BeanToken(address owner_) public {
        /*if (owner_ != address(0))
			balances[owner_] = totalSupply;
		else
			balances[msg.sender] = totalSupply;*/
    }
}