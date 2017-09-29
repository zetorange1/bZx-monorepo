pragma solidity ^0.4.4;
import '../oz_contracts/token/MintableToken.sol';

contract RESTToken is MintableToken {
    string constant public name = "REST Token";
    string constant public symbol = "REST";
	uint8 constant public decimals = 18;
    uint public totalSupply = 20000000; //20 * 10**24; // 20 million tokens (18 decimal places)

	event MintResumed();

	function RESTToken(address owner_) {
		transferOwnership(owner_); // owner should become the Broker0x contract

		balances[msg.sender] = 10000;
		balances[owner_] = totalSupply-10000;
	}

	function resumeMinting() onlyOwner returns (bool) {
		mintingFinished = false;
		MintResumed();
		return true;
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
