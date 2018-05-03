
pragma solidity ^0.4.23;

import '../BaseToken.sol';

// 1 billion tokens (18 decimal places)
contract TestToken8 is BaseToken(
	10**(50+18),
	"TestToken8", 
	18,
	"TEST8"
) {}
