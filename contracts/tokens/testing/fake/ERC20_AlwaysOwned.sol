
pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/StandardToken.sol";


/**
* @title FAKE ERC20 token
*
* @dev FAKE ERC20 token where all accounts contain the total supply of the coin (a paradox).
* @dev Note this is only to facilitate easier testing and should only be used in a private dev network!
*/
contract ERC20_AlwaysOwned is StandardToken {

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
        emit Transfer(msg.sender, _to, _value);
        return true;
    }

    function balanceOf(address _owner) public constant returns (uint256 balance) {
        if (_owner == address(0)) {} // to silence warning
        return totalSupply();
    }

    function transferFrom(address _from, address _to, uint256 _value) public returns (bool) {
        emit Transfer(_from, _to, _value);
        return true;
    }

    function approve(address _spender, uint256 _value) public returns (bool) {
        emit Approval(msg.sender, _spender, _value);
        return true;
    }

    function allowance(address _owner, address _spender) public constant returns (uint256 remaining) {
        if (_owner == address(0) || _spender == address(0)) {} // to silence warning
        return totalSupply();
    }

}
