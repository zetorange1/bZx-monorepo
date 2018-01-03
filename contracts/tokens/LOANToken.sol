pragma solidity ^0.4.4;

import './BaseToken.sol';

// 20 million tokens (18 decimal places), 20 * 10**24
contract LOANToken is BaseToken(
	20000000000000000000000000,
	"LOAN Token", 
	18, 
	"LOAN"
) {}