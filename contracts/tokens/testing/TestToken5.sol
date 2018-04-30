
pragma solidity ^0.4.23;

import '../BaseToken.sol';

// 1 billion tokens (18 decimal places)
contract TestToken5 is BaseToken(
	10**(50+18),
	"TestToken5", 
	18,
	"TEST5"
) {}
