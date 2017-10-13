pragma solidity ^0.4.4;
import '../oz_contracts/ownership/Ownable.sol';
import '../oz_contracts/token/StandardToken.sol';

contract RESTToken is Ownable, StandardToken {
    string constant public name = "REST Token";
    string constant public symbol = "REST";
	uint8 constant public decimals = 18;
    uint public totalSupply = 20000000; //20 * 10**24; // 20 million tokens (18 decimal places)

	function RESTToken() {
		balances[msg.sender] = totalSupply;
	}

	/**
	* approve should be called when allowed[_spender] == 0. To increment
	* allowed value is better to use this function to avoid 2 calls (and wait until
	* the first transaction is mined)
	* From MonolithDAO Token.sol
	*/
	function increaseApproval (address _spender, uint _addedValue) returns (bool success) {
		allowed[msg.sender][_spender] = allowed[msg.sender][_spender].add(_addedValue);
		Approval(msg.sender, _spender, allowed[msg.sender][_spender]);
		return true;
	}

	function decreaseApproval (address _spender, uint _subtractedValue) returns (bool success) {
		uint oldValue = allowed[msg.sender][_spender];
		if (_subtractedValue > oldValue) {
			allowed[msg.sender][_spender] = 0;
		} else {
			allowed[msg.sender][_spender] = oldValue.sub(_subtractedValue);
		}
		Approval(msg.sender, _spender, allowed[msg.sender][_spender]);
		return true;
	}
}
