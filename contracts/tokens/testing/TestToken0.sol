
pragma solidity ^0.4.23;

import '../BaseToken.sol';

// 1 billion tokens (18 decimal places)
contract TestToken0 is BaseToken(
	10000000000000000000000000,
	"TestToken0", 
	18,
	"TEST0"
) {}
