
pragma solidity 0.4.18;

import './ZepUpgradeableTokenStorage.sol';

contract Token_V0 is ZepUpgradeableTokenStorage {
  //using SafeMath for uint256;
  event Transfer(address indexed from, address indexed to, uint256 value);
  event Approval(address indexed owner, address indexed spender, uint256 value);

  /*function totalSupply() public view returns (uint256) {...}
  function balanceOf(address owner) public view returns (uint256) {...}
  function transfer(address to, uint256 value) public {...}
  function transferFrom(address from, address to, uint256 value) public {...}
  function approve(address spender, uint256 value) public {...}*/
}
