
pragma solidity 0.4.18;

contract ZepTokenStorage {
  uint256 internal _totalSupply;
  mapping (address => uint256) internal _balances;
  mapping (address => mapping (address => uint256)) internal _allowances;
}
