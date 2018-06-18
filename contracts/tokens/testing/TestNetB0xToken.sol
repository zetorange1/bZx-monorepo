
pragma solidity ^0.4.24; // solhint-disable-line compiler-fixed

import "../BaseToken.sol";


contract TestNetB0xToken is BaseToken( // solhint-disable-line no-empty-blocks
    10**(50+18),
    "b0x Protocol Token", 
    18,
    "B0X"
) {}