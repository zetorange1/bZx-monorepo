
pragma solidity ^0.4.21;

import '../BaseToken.sol';

// 1 billion tokens (18 decimal places)
contract TestToken3 is BaseToken(
	10000000000000000000000000,
	"TestToken3", 
	18,
	"TEST3"
) {}
