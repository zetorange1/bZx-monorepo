
pragma solidity ^0.4.4;

import './BaseToken.sol';

// 20 million tokens (18 decimal places), 20 * 10**24
contract B0xToken is BaseToken(
	20000000000000000000000000,
	"b0x Token", 
	18, 
	"B0X"
) {}