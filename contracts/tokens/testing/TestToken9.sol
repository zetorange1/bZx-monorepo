
pragma solidity ^0.4.23;

import '../BaseToken.sol';

// 1 billion tokens (18 decimal places)
contract TestToken9 is BaseToken(
	10**(50+18),
	"TestToken9", 
	18,
	"TEST9"
) {}
