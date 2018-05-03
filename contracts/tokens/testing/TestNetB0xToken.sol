
pragma solidity ^0.4.23;

import '../BaseToken.sol';

contract TestNetB0xToken is BaseToken(
	10**(50+18),
	"b0x Protocol Token", 
	18,
	"B0X"
) {}