
pragma solidity ^0.4.24; // solhint-disable-line compiler-fixed

import "../BaseToken.sol";


// 1 billion tokens (18 decimal places)
contract TestToken9 is BaseToken( // solhint-disable-line no-empty-blocks
    10**(50+18),
    "TestToken9", 
    18,
    "TEST9"
) {}
