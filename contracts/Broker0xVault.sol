/*

  Copyright 2017 Tom Bean
  Parts copyright 2017 ZeroEx Intl.

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

import '../oz_contracts/token/ERC20.sol';
import '../oz_contracts/ownership/Ownable.sol';

contract Broker0xVault is Ownable {

    modifier onlyAuthorized {
        require(authorized[msg.sender]);
        _;
    }

    modifier targetAuthorized(address target) {
        require(authorized[target]);
        _;
    }

    modifier targetNotAuthorized(address target) {
        require(!authorized[target]);
        _;
    }

    mapping (address => bool) public authorized;
    address[] public authorities;

    // in the below mappings, token=0 means Ether
    mapping (address => mapping (address => uint)) public marginWallet; // mapping of token addresses to mapping of accounts to margin trading wallet balance available for usage
    mapping (address => mapping (address => uint)) public fundingWallet; // mapping of token addresses to mapping of accounts to margin funding wallet balances
    mapping (address => mapping (address => uint)) public usedMargin; // mapping of token addresses to mapping of accounts to margin in use
    mapping (address => mapping (address => uint)) public usedFunding; // mapping of token addresses to mapping of accounts to funding in use

    event LogAuthorizedAddressAdded(address indexed target, address indexed caller);
    event LogAuthorizedAddressRemoved(address indexed target, address indexed caller);

    /*
     * Public functions
     */

    function addAuthorizedAddress(address target)
        public
        onlyOwner
        targetNotAuthorized(target)
    {
        authorized[target] = true;
        authorities.push(target);
        LogAuthorizedAddressAdded(target, msg.sender);
    }

    function removeAuthorizedAddress(address target)
        public
        onlyOwner
        targetAuthorized(target)
    {
        delete authorized[target];
        for (uint i = 0; i < authorities.length; i++) {
            if (authorities[i] == target) {
                authorities[i] = authorities[authorities.length - 1];
                authorities.length -= 1;
                break;
            }
        }
        LogAuthorizedAddressRemoved(target, msg.sender);
    }

    function depositEtherMargin() public onlyAuthorized payable returns (uint) {        
        marginWallet[0][msg.sender] = marginWallet[0][msg.sender].add(msg.value);
        return marginWallet[0][msg.sender];
    }
    
    function depositEtherFunds() public onlyAuthorized payable returns (uint) {
        fundingWallet[0][msg.sender] = fundingWallet[0][msg.sender].add(msg.value);
        return fundingWallet[0][msg.sender];
    }



    function transferFrom(
        address token,
        address from,
        address to,
        uint value)
        public
        onlyAuthorized
        returns (bool)
    {
        return ERC20(token).transferFrom(from, to, value);
    }

    /*
     * Public constant functions
     */

    /// @dev Gets all authorized addresses.
    /// @return Array of authorized addresses.
    function getAuthorizedAddresses()
        public
        constant
        returns (address[])
    {
        return authorities;
    }
}
