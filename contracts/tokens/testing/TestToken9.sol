
pragma solidity ^0.4.22;

import '../BaseToken.sol';

// 1 billion tokens (18 decimal places)
contract TestToken9 is BaseToken(
	10000000000000000000000000,
	"TestToken9", 
	18,
	"TEST9"
) {}
