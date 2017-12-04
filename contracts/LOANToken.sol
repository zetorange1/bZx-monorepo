/*pragma solidity ^0.4.4;

import './HumanStandardToken.sol';

// 20 million tokens (18 decimal places), 20 * 10**24
contract LOANToken is HumanStandardToken(
	20000000000000000000000000,
	"LOAN Token", 
	18, 
	"LOAN"
) {}*/

pragma solidity ^0.4.4;

import './ERC20_AlwaysOwned.sol';

contract LOANToken is ERC20_AlwaysOwned {

    string constant public name = "LOAN Token";
    string constant public symbol = "LOAN";
	uint8 constant public decimals = 18;
    uint public totalSupply = 20000000000000000000000000; // 20 million tokens (18 decimal places), 10 * 10**24

    function LOANToken(address owner_) public {
        /*if (owner_ != address(0))
			balances[owner_] = totalSupply;
		else
			balances[msg.sender] = totalSupply;*/
    }
}
