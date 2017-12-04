pragma solidity ^0.4.4;

import './ERC20_AlwaysOwned.sol'; // 

contract TomToken is ERC20_AlwaysOwned {

    string constant public name = "Tom Token";
    string constant public symbol = "TOM";
	uint8 constant public decimals = 18;
    uint public totalSupply = 10000000000000000000000000; // 10 million tokens (18 decimal places), 10 * 10**24

    function TomToken(address owner_) public {
        /*if (owner_ != address(0))
			balances[owner_] = totalSupply;
		else
			balances[msg.sender] = totalSupply;*/
    }
}
