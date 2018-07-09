
pragma solidity 0.4.24;

import "../BaseToken.sol";


contract TestNetBZRxToken is BaseToken( // solhint-disable-line no-empty-blocks
    10**(50+18),
    "BZRX Protocol Token", 
    18,
    "BZRX"
) {}