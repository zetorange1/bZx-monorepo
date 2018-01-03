pragma solidity ^0.4.4;

import './BaseToken.sol';

// 10 million tokens (18 decimal places), 10 * 10**24
contract TOMToken is BaseToken(
	10000000000000000000000000,
	"Tom Token", 
	18, 
	"TOM"
) {}