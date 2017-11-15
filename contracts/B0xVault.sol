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

import 'oz_contracts/math/SafeMath.sol';
import 'oz_contracts/token/ERC20.sol';
import 'oz_contracts/ownership/Ownable.sol';

contract B0xVault is Ownable {
    using SafeMath for uint256;

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

    // note: this overrides current approval amount
    function setTokenApproval(address token_, address user_, uint amount_) public onlyAuthorized returns (bool) { 
        require(token_ != address(0));

        uint allowance = ERC20(token_).allowance(this, user_);
        if (allowance == amount_) {
            return true;
        }

        if (allowance != 0) {
            require(ERC20(token_).approve(user_, 0)); // required to change approval
        }
        require(ERC20(token_).approve(user_, amount_));

        return true;
    }

    /*function depositEtherMargin(address user_) public onlyAuthorized payable returns (uint) {        
        marginWallet[0][user_] = marginWallet[0][user_].add(msg.value);
        return marginWallet[0][user_];
    }
    function depositEtherFunding(address user_) public onlyAuthorized payable returns (uint) {
        fundingWallet[0][user_] = fundingWallet[0][user_].add(msg.value);
        return fundingWallet[0][user_];
    }*/
    /*function depositTokenMargin(address token_, address user_, uint amount_) public onlyAuthorized returns (uint) {        
        require(token_ != address(0));
        
        marginWallet[token_][user_] = marginWallet[token_][user_].add(amount_);
        return marginWallet[token_][user_];
    }
    function depositTokenFunding(address token_, address user_, uint amount_) public onlyAuthorized returns (uint) {        
        require(token_ != address(0));
        
        fundingWallet[token_][user_] = fundingWallet[token_][user_].add(amount_);
        return fundingWallet[token_][user_];
    }*/


    /*function withdrawEtherMargin(address user_, uint amount_) public onlyAuthorized returns (uint) {
        marginWallet[0][user_] = marginWallet[0][user_].sub(amount_);
        require(user_.call.value(amount_)());
         // or? if (!user_.send(amount)) revert();
        return marginWallet[0][user_];
    }
    function withdrawEtherFunding(address user_, uint amount_) public onlyAuthorized returns (uint) {
        fundingWallet[0][user_] = fundingWallet[0][user_].sub(amount_);
        require(user_.call.value(amount_)());
         // or? if (!user_.send(amount)) revert();
        return fundingWallet[0][user_];
    }*/
    /*function withdrawTokenMargin(address token_, address user_, uint amount_) public onlyAuthorized returns (uint) {
        require(token_ != address(0));
        
        marginWallet[token_][user_] = marginWallet[token_][user_].sub(amount_);
        require(ERC20(token_).transfer(user_, amount_));
        return marginWallet[token_][user_]; 
    }
    function withdrawTokenFunding(address token_, address user_, uint amount_) public onlyAuthorized returns (uint) {
        require(token_ != address(0));
        
        fundingWallet[token_][user_] = fundingWallet[token_][user_].sub(amount_);
        require(ERC20(token_).transfer(user_, amount_));
        return fundingWallet[token_][user_]; 
    }*/

    /*function transferOutTokenMargin(address token_, address from_, address to_, uint amount_) public onlyAuthorized returns (bool) {
        require(token_ != address(0));
        
        marginWallet[token_][from_] = marginWallet[token_][from_].sub(amount_);
        require(ERC20(token_).transfer(to_, amount_));
        return true; 
    }
    function transferOutTokenFunding(address token_, address from_, address to_, uint amount_) public onlyAuthorized returns (bool) {
        require(token_ != address(0));
        
        fundingWallet[token_][from_] = fundingWallet[token_][from_].sub(amount_);
        require(ERC20(token_).transfer(to_, amount_));
        return true; 
    }*/

    function marginBalanceOf(address token_, address user_) public constant returns (uint balance) {
        return marginWallet[token_][user_];
    }
    function usedMarginBalanceOf(address token_, address user_) public constant returns (uint balance) {
        return usedMargin[token_][user_];
    }

    function fundingBalanceOf(address token_, address user_) public constant returns (uint balance) {
        return fundingWallet[token_][user_];
    }
    function usedFundingBalanceOf(address token_, address user_) public constant returns (uint balance) {
        return usedFunding[token_][user_];
    }

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

    function transferInTokenMarginAndUse(
        address token,
        address from,
        uint value)
        public
        onlyAuthorized
        returns (bool)
    {
        uint valueNotInWallet = SafeMath.max256(value - marginWallet[token][from], 0);
        uint valueInWallet = value.sub(valueNotInWallet);
        marginWallet[token][from] = marginWallet[token][from].sub(valueInWallet);
        usedMargin[token][from].add(value);
        if (valueNotInWallet > 0) {
            return ERC20(token).transferFrom(from, this, valueNotInWallet);
        }
        return true;
    }
    function transferInTokenFundingAndUse(
        address token,
        address from,
        uint value)
        public
        onlyAuthorized
        returns (bool)
    {
        uint valueNotInWallet = SafeMath.max256(value - fundingWallet[token][from], 0);
        uint valueInWallet = value.sub(valueNotInWallet);
        fundingWallet[token][from] = fundingWallet[token][from].sub(valueInWallet);
        usedFunding[token][from].add(value);
        if (valueNotInWallet > 0) {
            if (!ERC20(token).transferFrom(from, this, valueNotInWallet))
                return false;
        }
        return true;
    }

    function transferOutTokenMargin(
        address token,
        address from,
        address to,        
        uint value)
        public
        onlyAuthorized
        returns (bool)
    {
        uint valueNotInWallet = SafeMath.max256(value - marginWallet[token][from], 0);
        uint valueInWallet = value.sub(valueNotInWallet);
        marginWallet[token][from] = marginWallet[token][from].sub(valueInWallet);
        if (valueNotInWallet > 0) {
            if (!ERC20(token).transferFrom(from, this, valueNotInWallet))
                return false;
        }
        return ERC20(token).transfer(to, value);
    }

    function transferOutTokenFunding(
        address token,
        address from,
        address to,        
        uint value)
        public
        onlyAuthorized
        returns (bool)
    {
        uint valueNotInWallet = SafeMath.max256(value - fundingWallet[token][from], 0);
        uint valueInWallet = value.sub(valueNotInWallet);
        fundingWallet[token][from] = fundingWallet[token][from].sub(valueInWallet);
        if (valueNotInWallet > 0) {
            if (!ERC20(token).transferFrom(from, this, valueNotInWallet))
                return false;
        }
        return ERC20(token).transfer(to, value);
    }

    function getAuthorizedAddresses()
        public
        constant
        returns (address[])
    {
        return authorities;
    }
}

/*
    function transferTokenViaVault(
        address token,
        address from,
        address to,
        uint amount)
        internal
        returns (bool)
    {
        return B0xVault(VAULT_CONTRACT).transferFrom(token, from, to, amount);
    }

    /// @dev Get token balance of an address.
    /// @param token Address of token.
    /// @param owner Address of owner.
    /// @return Token balance of owner.
    function getBalance(address token, address owner)
        internal
        constant  // The called token contract may attempt to change state, but will not be able to due to an added gas limit.
        returns (uint)
    {
        return ERC20(token).balanceOf.gas(EXTERNAL_QUERY_GAS_LIMIT)(owner); // Limit gas to prevent reentrancy
    }

    /// @dev Get allowance of token given to TokenTransferProxy by an address.
    /// @param token Address of token.
    /// @param owner Address of owner.
    /// @return Allowance of token given to TokenTransferProxy by owner.
    function getAllowance(address token, address owner)
        internal
        constant  // The called token contract may attempt to change state, but will not be able to due to an added gas limit.
        returns (uint)
    {
        return ERC20(token).allowance.gas(EXTERNAL_QUERY_GAS_LIMIT)(owner, VAULT_CONTRACT); // Limit gas to prevent reentrancy
    }



*/
