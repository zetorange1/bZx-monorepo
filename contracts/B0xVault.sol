
pragma solidity ^0.4.23;

import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import './modifiers/B0xOwnable.sol';

import './tokens/EIP20.sol';

contract B0xVault is B0xOwnable {
    using SafeMath for uint256;

    event LogErrorText(string errorTxt, uint errorValue);

    mapping (address => mapping (address => uint)) public collateral; // mapping of token addresses to mapping of accounts to collateral
    mapping (address => mapping (address => uint)) public funding; // mapping of token addresses to mapping of accounts to funding
    mapping (address => mapping (address => uint)) public interest; // mapping of token addresses to mapping of accounts to interest

    /*
     * Public functions
     */

    // Only the owner/b0x contract can directly deposit ether
    function() public payable onlyB0x {}

    function collateralBalanceOf(
        address token_,
        address user_)
        public
        constant
        returns (uint balance)
    {
        return collateral[token_][user_];
    }

    function fundingBalanceOf(
        address token_,
        address user_)
        public
        constant
        returns (uint balance)
    {
        return funding[token_][user_];
    }

    function interestBalanceOf(
        address token_,
        address user_)
        public
        constant
        returns (uint balance)
    {
        return interest[token_][user_];
    }

    function depositCollateral(
        address token,
        address user,
        uint tokenAmount)
        public
        onlyB0x
        returns (bool)
    {
        collateral[token][user] = collateral[token][user].add(tokenAmount);
        if (!EIP20(token).transferFrom(user, this, tokenAmount))
            revert();

        return true;
    }

    function depositFunding(
        address token,
        address user,
        uint tokenAmount)
        public
        onlyB0x
        returns (bool)
    {
        funding[token][user] = funding[token][user].add(tokenAmount);
        if (!EIP20(token).transferFrom(user, this, tokenAmount))
            revert();

        return true;
    }

    function depositInterest(
        address token,
        address user,
        uint tokenAmount)
        public
        onlyB0x
        returns (bool)
    {
        interest[token][user] = interest[token][user].add(tokenAmount);
        if (!EIP20(token).transferFrom(user, this, tokenAmount))
            revert();

        return true;
    }

    function withdrawCollateral(
        address token,
        address user,
        uint tokenAmount)
        public
        onlyB0x
        returns (bool)
    {
        collateral[token][user] = collateral[token][user].sub(tokenAmount);
        if (!EIP20(token).transfer(user, tokenAmount))
            revert();

        return true;
    }

    // This function is used when b0x needs to sell some collateral to cover loan token losses
    function sendCollateralToOracle(
        address token,
        address user,
        address oracleAddress,
        uint tokenAmount)
        public
        onlyB0x
        returns (bool)
    {
        if (tokenAmount == 0)
            return false;

        collateral[token][user] = collateral[token][user].sub(tokenAmount);

        if (!EIP20(token).transfer(oracleAddress, tokenAmount))
            revert();

        return true;
    }
    
    function withdrawFunding(
        address token,
        address user,
        uint tokenAmount)
        public
        onlyB0x
        returns (bool)
    {
        funding[token][user] = funding[token][user].sub(tokenAmount);
        if (!EIP20(token).transfer(user, tokenAmount))
            revert();

        return true;
    }

    function withdrawInterest(
        address token,
        address user,
        uint tokenAmount)
        public
        onlyB0x
        returns (bool)
    {
        interest[token][user] = interest[token][user].sub(tokenAmount);
        if (!EIP20(token).transfer(user, tokenAmount))
            revert();

        return true;
    }

    // Interest payment distributions are the responsibility of the Oracle used for the loanOrder.
    // This function can only be called by b0x to transfer interest to the Oracle for further processing.
    function sendInterestToOracle(
        address token,
        address user,
        address oracleAddress,
        uint tokenAmount)
        public
        onlyB0x
        returns (bool)
    {
        if (tokenAmount == 0)
            return false;

        interest[token][user] = interest[token][user].sub(tokenAmount);

        if (!EIP20(token).transfer(oracleAddress, tokenAmount))
            revert();

        return true;
    }

    function transferToken(
        address token,
        address to,
        uint tokenAmount)
        public
        onlyB0x
        returns (bool)
    {
        if (!EIP20(token).transfer(to, tokenAmount))
            revert();

        return true;
    }

    function transferTokenFrom(
        address token,
        address from,
        address to,
        uint tokenAmount)
        public
        onlyB0x
        returns (bool)
    {
        if (!EIP20(token).transferFrom(from, to, tokenAmount))
            revert();

        return true;
    }
}

