
pragma solidity ^0.4.23;

import '../BaseToken.sol';

// 1 billion tokens (18 decimal places)
contract TestToken5 is BaseToken(
	10000000000000000000000000,
	"TestToken5", 
	18,
	"TEST5"
) {}
