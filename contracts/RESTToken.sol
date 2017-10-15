pragma solidity ^0.4.4;

import './HumanStandardToken.sol';

// 20 million tokens (18 decimal places), 20 * 10**24
contract RESTToken is HumanStandardToken(
	20000000000000000000000000,
	"REST Token", 
	18, 
	"REST"
) {}
