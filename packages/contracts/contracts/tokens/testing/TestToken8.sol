
pragma solidity 0.5.3;

import "../BaseToken.sol";


// 1 billion tokens (18 decimal places)
contract TestToken8 is BaseToken( // solhint-disable-line no-empty-blocks
    10**(50+18),
    "TestToken8", 
    18,
    "TEST8"
) {}
