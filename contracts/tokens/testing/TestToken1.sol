
pragma solidity ^0.4.22;

import '../BaseToken.sol';

// 1 billion tokens (18 decimal places)
contract TestToken1 is BaseToken(
	10000000000000000000000000,
	"TestToken1", 
	18,
	"TEST1"
) {}
