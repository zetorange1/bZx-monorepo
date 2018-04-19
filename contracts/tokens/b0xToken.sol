
pragma solidity ^0.4.22;

import './BaseToken.sol';

// 1 billion tokens (18 decimal places)
contract B0xToken is BaseToken(
	1000000000000000000000000000,
	"b0x Protocol Token", 
	18,
	"B0X"
) {}