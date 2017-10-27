pragma solidity ^0.4.9;

import '../oz_contracts/math/SafeMath.sol';
import '../oz_contracts/token/ERC20.sol';
import '../oz_contracts/ownership/Ownable.sol';

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

    function withdrawToken(address putToken_, uint putTokenAmount_, address getToken_, address sendToAddress_) public returns (bool) {
        
        uint putTokenPrice = B0xPrices(TOKEN_PRICES_CONTRACT).getTokenPrice(putToken_);
        uint getTokenPrice = B0xPrices(TOKEN_PRICES_CONTRACT).getTokenPrice(getToken_);

        uint putAmountInWei = putTokenAmount_.mul(putTokenPrice);

        uint getTokenAmount = putAmountInWei.div(getTokenPrice);

        tokenPool[putToken_].add(putTokenAmount_);
        tokenPool[getToken_].sub(getTokenAmount);
        
        // todo: handle approval in B0x contract
        require(ERC20(putToken_).transferFrom(msg.sender, this, putTokenAmount_));
        require(ERC20(getToken_).transfer(sendToAddress_, getTokenAmount));

        return true;
    }


    function balanceOf(address token_) public constant returns (uint balance) {
        return tokenPool[token_];
    }
}
