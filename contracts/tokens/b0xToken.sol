
pragma solidity ^0.4.24; // solhint-disable-line compiler-fixed

import "./BaseToken.sol";


// 1 billion tokens (18 decimal places)
contract B0xToken is BaseToken( // solhint-disable-line no-empty-blocks
    1000000000000000000000000000,
    "b0x Protocol Token", 
    18,
    "B0X"
) {}