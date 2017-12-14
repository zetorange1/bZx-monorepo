/*

Copyright 2017 Tom Bean

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

*/

pragma solidity ^0.4.9;
import './ERC20_Standard.sol';


/**
* @title FAKE ERC20 token
*
* @dev FAKE ERC20 token where all accounts contain the total supply of the coin (a paradox).
* @dev Note this is only for testing purposes and should never be deployed to mainnet!!!!!
*/
contract ERC20_AlwaysOwned is ERC20_Standard {
    using SafeMath for uint256;

    string public name;
    uint8 public decimals;
    string public symbol;

    function ERC20_AlwaysOwned(
        uint256 _initialAmount,
        string _tokenName,
        uint8 _decimalUnits,
        string _tokenSymbol) public {
        totalSupply = _initialAmount;
        name = _tokenName;
        decimals = _decimalUnits;
        symbol = _tokenSymbol;
    }

    function transfer(address _to, uint256 _value) returns (bool) {
        Transfer(msg.sender, _to, _value);
        return true;
    }

    function balanceOf(address _owner) constant returns (uint256 balance) {
        return totalSupply;
    }

    function transferFrom(address _from, address _to, uint256 _value) returns (bool) {
        Transfer(_from, _to, _value);
        return true;
    }

    function approve(address _spender, uint256 _value) returns (bool) {
        Approval(msg.sender, _spender, _value);
        return true;
    }

    function allowance(address _owner, address _spender) constant returns (uint256 remaining) {
        return totalSupply;
    }

}
