
pragma solidity 0.4.24;

import "./BaseToken.sol";


// 1 billion tokens (18 decimal places)
contract BZRxToken is BaseToken( // solhint-disable-line no-empty-blocks
    1000000000000000000000000000,
    "BZRX Protocol Token", 
    18,
    "BZRX"
) {}