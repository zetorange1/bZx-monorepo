/*

  Copyright 2018 b0x, LLC

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

pragma solidity ^0.4.4;

import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import 'zeppelin-solidity/contracts/ownership/Ownable.sol';

import './BaseToken.sol';


contract SugarToken is Ownable, BaseToken (
	0, // supply is based on amount of Ether deposited, so supply starts at 0
	"Sugar Token", 
	18, 
	"SUGR"
) {
	using SafeMath for uint256;

    // can't deposit directly to the contract
    function()
        public 
    {
        revert();
    }

    // only the owner (b0x) can deposit ether to this contract on behalf of a user
    function depositTo(
        address user)
        public
        onlyOwner
        payable
    {
        balances[user] = balances[user].add(msg.value);
        totalSupply = totalSupply.add(msg.value);
    }

    // tokens can be redeemed by anyone that owns them at 1:1 to Ether
    function redeem(
        uint amount)
        public
    {
        balances[msg.sender] = balances[msg.sender].sub(amount);
        totalSupply = totalSupply.sub(amount);
        require(msg.sender.send(amount));
    }

}