
pragma solidity ^0.4.23;

import '../BaseToken.sol';

// 1 billion tokens (18 decimal places)
contract TestToken7 is BaseToken(
	10000000000000000000000000,
	"TestToken7", 
	18,
	"TEST7"
) {}
