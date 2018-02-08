
pragma solidity ^0.4.19;

import 'zeppelin-solidity/contracts/token/ERC20/StandardToken.sol';


/**
* @title FAKE ERC20 token
*
* @dev FAKE ERC20 token where all accounts contain the total supply of the coin (a paradox).
* @dev Note this is only for testing purposes and should never be deployed to mainnet!
*/
contract ERC20_AlwaysOwned is StandardToken {
    using SafeMath for uint256;

    string public name;
    uint8 public decimals;
    string public symbol;

    /*function ERC20_AlwaysOwned(
        uint256 _initialAmount,
        string _tokenName,
        uint8 _decimalUnits,
        string _tokenSymbol) public {
        totalSupply = _initialAmount;
        name = _tokenName;
        decimals = _decimalUnits;
        symbol = _tokenSymbol;
    }*/

    function transfer(address _to, uint256 _value) public returns (bool) {
        Transfer(msg.sender, _to, _value);
        return true;
    }

    function balanceOf(address _owner) public constant returns (uint256 balance) {
        if (_owner == address(0)) {} // to silence warning
        return totalSupply();
    }

    function transferFrom(address _from, address _to, uint256 _value) public returns (bool) {
        Transfer(_from, _to, _value);
        return true;
    }

    function approve(address _spender, uint256 _value) public returns (bool) {
        Approval(msg.sender, _spender, _value);
        return true;
    }

    function allowance(address _owner, address _spender) public constant returns (uint256 remaining) {
        if (_owner == address(0) || _spender == address(0)) {} // to silence warning
        return totalSupply();
    }

}
