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

pragma solidity ^0.4.9;

import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import './B0xOwnable.sol';

import './interfaces/EIP20.sol';

contract B0xVault is B0xOwnable {
    using SafeMath for uint256;

    event LogErrorText(string errorTxt, uint errorValue);

    // in the below mappings, token=0 means Ether
/*
    mapping (address => mapping (address => uint)) public marginWallet; // mapping of token addresses to mapping of accounts to margin trading wallet balance available for usage
    mapping (address => mapping (address => uint)) public fundingWallet; // mapping of token addresses to mapping of accounts to margin funding wallet balances
    mapping (address => mapping (address => uint)) public usedMargin; // mapping of token addresses to mapping of accounts to margin in use
    mapping (address => mapping (address => uint)) public usedFunding; // mapping of token addresses to mapping of accounts to funding in use
 */
    mapping (address => mapping (address => uint)) public margin; // mapping of token addresses to mapping of accounts to margin
    mapping (address => mapping (address => uint)) public funding; // mapping of token addresses to mapping of accounts to funding
    mapping (address => mapping (address => uint)) public interest; // mapping of token addresses to mapping of accounts to interest

    /*
     * Public functions
     */

    // Only the owner (b0x contract) can directly deposit ether
    function() public payable onlyB0x {}

    // note: this overrides current approval amount
    function setTokenApproval(address token_, address user_, uint amount_) public onlyB0x returns (bool) { 
        require(token_ != address(0));

        uint allowance = EIP20(token_).allowance(this, user_);
        if (allowance == amount_) {
            return true;
        }

        if (allowance != 0) {
            require(EIP20(token_).approve(user_, 0)); // required to change approval
        }
        require(EIP20(token_).approve(user_, amount_));

        return true;
    }

    /*function depositEtherMargin(address user_) public onlyB0x payable returns (uint) {        
        marginWallet[0][user_] = marginWallet[0][user_].add(msg.value);
        return marginWallet[0][user_];
    }
    function depositEtherFunding(address user_) public onlyB0x payable returns (uint) {
        fundingWallet[0][user_] = fundingWallet[0][user_].add(msg.value);
        return fundingWallet[0][user_];
    }*/
    /*function depositTokenMargin(address token_, address user_, uint amount_) public onlyB0x returns (uint) {        
        require(token_ != address(0));
        
        marginWallet[token_][user_] = marginWallet[token_][user_].add(amount_);
        return marginWallet[token_][user_];
    }
    function depositTokenFunding(address token_, address user_, uint amount_) public onlyB0x returns (uint) {        
        require(token_ != address(0));
        
        fundingWallet[token_][user_] = fundingWallet[token_][user_].add(amount_);
        return fundingWallet[token_][user_];
    }*/


    /*function withdrawEtherMargin(address user_, uint amount_) public onlyB0x returns (uint) {
        marginWallet[0][user_] = marginWallet[0][user_].sub(amount_);
        require(user_.call.value(amount_)());
         // or? if (!user_.send(amount)) revert();
        return marginWallet[0][user_];
    }
    function withdrawEtherFunding(address user_, uint amount_) public onlyB0x returns (uint) {
        fundingWallet[0][user_] = fundingWallet[0][user_].sub(amount_);
        require(user_.call.value(amount_)());
         // or? if (!user_.send(amount)) revert();
        return fundingWallet[0][user_];
    }*/
    /*function withdrawTokenMargin(address token_, address user_, uint amount_) public onlyB0x returns (uint) {
        require(token_ != address(0));
        
        marginWallet[token_][user_] = marginWallet[token_][user_].sub(amount_);
        require(EIP20(token_).transfer(user_, amount_));
        return marginWallet[token_][user_]; 
    }
    function withdrawTokenFunding(address token_, address user_, uint amount_) public onlyB0x returns (uint) {
        require(token_ != address(0));
        
        fundingWallet[token_][user_] = fundingWallet[token_][user_].sub(amount_);
        require(EIP20(token_).transfer(user_, amount_));
        return fundingWallet[token_][user_]; 
    }*/

    /*function transferOutTokenMargin(address token_, address from_, address to_, uint amount_) public onlyB0x returns (bool) {
        require(token_ != address(0));
        
        marginWallet[token_][from_] = marginWallet[token_][from_].sub(amount_);
        require(EIP20(token_).transfer(to_, amount_));
        return true; 
    }
    function transferOutTokenFunding(address token_, address from_, address to_, uint amount_) public onlyB0x returns (bool) {
        require(token_ != address(0));
        
        fundingWallet[token_][from_] = fundingWallet[token_][from_].sub(amount_);
        require(EIP20(token_).transfer(to_, amount_));
        return true; 
    }*/

    function marginBalanceOf(address token_, address user_) public constant returns (uint balance) {
        return margin[token_][user_];
    }
    /*function usedMarginBalanceOf(address token_, address user_) public constant returns (uint balance) {
        return usedMargin[token_][user_];
    }*/

    function fundingBalanceOf(address token_, address user_) public constant returns (uint balance) {
        return funding[token_][user_];
    }
    /*function usedFundingBalanceOf(address token_, address user_) public constant returns (uint balance) {
        return usedFunding[token_][user_];
    }*/

    function interestBalanceOf(address token_, address user_) public constant returns (uint balance) {
        return interest[token_][user_];
    }
    /*function usedInterestBalanceOf(address token_, address user_) public constant returns (uint balance) {
        return usedInterest[token_][user_];
    }*/

    function storeMargin(
        address token,
        address user,
        uint value)
        public
        onlyB0x
        returns (bool)
    {
        margin[token][user] = margin[token][user].add(value);
        if (!EIP20(token).transferFrom(user, this, value))
            revert();

        return true;
    }

    function storeFunding(
        address token,
        address user,
        uint value)
        public
        onlyB0x
        returns (bool)
    {
        funding[token][user] = funding[token][user].add(value);
        if (!EIP20(token).transferFrom(user, this, value))
            revert();

        return true;
    }

    function storeInterest(
        address token,
        address user,
        uint value)
        public
        onlyB0x
        returns (bool)
    {
        interest[token][user] = interest[token][user].add(value);
        if (!EIP20(token).transferFrom(user, this, value))
            revert();

        return true;
    }

    function sendMargin(
        address token,
        address user,
        address to,        
        uint value)
        public
        onlyB0x
        returns (bool)
    {
        margin[token][user] = margin[token][user].sub(value);
        if (!EIP20(token).transfer(to, value))
            revert();

        return true;
    }
    
    function sendFunding(
        address token,
        address user,
        address to,        
        uint value)
        public
        onlyB0x
        returns (bool)
    {
        funding[token][user] = funding[token][user].sub(value);
        if (!EIP20(token).transfer(to, value))
            revert();

        return true;
    }


    // note: feeAmount is retained by the vault
    function sendInterest(
        address token,
        address user,
        address to,        
        uint value,
        uint feeAmount)
        public
        onlyB0x
        returns (bool)
    {
        interest[token][user] = interest[token][user].sub(value);

        if (!EIP20(token).transfer(to, value.sub(feeAmount)))
            revert();

        return true;
    }

    function ensureTokenAndPayValue(
        address token,
        address user,
        address to,        
        uint value)
        public
        onlyB0x
        returns (bool)
    {
        if (!EIP20(token).transferFrom(user, to, value))
            revert();

        return true;
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
        return EIP20(token).balanceOf.gas(EXTERNAL_QUERY_GAS_LIMIT)(owner); // Limit gas to prevent reentrancy
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
        return EIP20(token).allowance.gas(EXTERNAL_QUERY_GAS_LIMIT)(owner, VAULT_CONTRACT); // Limit gas to prevent reentrancy
    }



*/
