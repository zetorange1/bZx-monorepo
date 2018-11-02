
pragma solidity 0.4.25;

import "../BaseToken.sol";


// 1 billion tokens (18 decimal places)
contract TestToken2 is BaseToken( // solhint-disable-line no-empty-blocks
    10**(50+18),
    "TestToken2", 
    18,
    "TEST2"
) {}
