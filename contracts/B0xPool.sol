pragma solidity ^0.4.9;

import 'oz_contracts/math/SafeMath.sol';
import 'oz_contracts/token/ERC20.sol';
import 'oz_contracts/ownership/Ownable.sol';

import './B0xPrices.sol';

contract B0xPool is Ownable {
    using SafeMath for uint256;

    address public TOKEN_PRICES_CONTRACT;

    mapping (address => uint) public tokenPool; // mapping of token addresses amounts owned by this contract

    /*
     * Public functions
    */

    function B0xPool(address _tokenPrices) {
        TOKEN_PRICES_CONTRACT = _tokenPrices;
    }

    // any user can deposit tokens to this contract
    function depositToken(address token_, uint amount_) public returns (uint) {
        require(token_ != address(0));
        require(ERC20(token_).transferFrom(msg.sender, this, amount_));

        tokenPool[token_] = tokenPool[token_].add(amount_);
        return tokenPool[token_];
    }

    function withdrawToken(address user_, address token_, uint amount_) public onlyOwner returns (uint) {
        require(token_ != address(0));
        
        tokenPool[token_] = tokenPool[token_].sub(amount_);
        require(ERC20(token_).transfer(user_, amount_));
        return tokenPool[token_]; 
    }

    function tradeToken(address tokenSource_, address putToken_, address getToken_, uint putTokenAmount_, uint getTokenAmount_) public returns (bool) {

        tokenPool[putToken_].add(putTokenAmount_);
        tokenPool[getToken_].sub(getTokenAmount_);
        
        // todo: handle approval in B0x contract
        //withdrawTokenFunding
        
        require(ERC20(putToken_).transferFrom(tokenSource_, this, putTokenAmount_));
        require(ERC20(getToken_).transfer(tokenSource_, getTokenAmount_));

        return true;
    }


    function balanceOf(address token_) public constant returns (uint balance) {
        return tokenPool[token_];
    }
}
