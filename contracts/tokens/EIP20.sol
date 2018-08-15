
pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";


/**
 * @title EIP20/ERC20 interface
 * @dev see https://github.com/ethereum/EIPs/issues/20
 */
contract EIP20 is ERC20 {
    string public name;
    uint8 public decimals;
    string public symbol;
}
