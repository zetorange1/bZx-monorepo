
pragma solidity 0.4.18;

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

    // Only the owner (b0x contract) can directly deposit ether
    function() public payable onlyB0x {}

    function collateralBalanceOf(address token_, address user_) public constant returns (uint balance) {
        return collateral[token_][user_];
    }

    function fundingBalanceOf(address token_, address user_) public constant returns (uint balance) {
        return funding[token_][user_];
    }

    function interestBalanceOf(address token_, address user_) public constant returns (uint balance) {
        return interest[token_][user_];
    }

    function depositCollateral(
        address token,
        address user,
        uint value)
        public
        onlyB0x
        returns (bool)
    {
        collateral[token][user] = collateral[token][user].add(value);
        if (!EIP20(token).transferFrom(user, this, value))
            revert();

        return true;
    }

    function depositFunding(
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

    function depositInterest(
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

    function withdrawCollateral(
        address token,
        address user,
        uint value)
        public
        onlyB0x
        returns (bool)
    {
        collateral[token][user] = collateral[token][user].sub(value);
        if (!EIP20(token).transfer(user, value))
            revert();

        return true;
    }
    
    function withdrawFunding(
        address token,
        address user,
        uint value)
        public
        onlyB0x
        returns (bool) {
        funding[token][user] = funding[token][user].sub(value);
        if (!EIP20(token).transfer(user, value))
            revert();

        return true;
    }

    // Interest payment distributions are the responsibility of the Oracle used for the loanOrder.
    // This function can only be called by b0x to transfer interest to the Oracle for further processing.
    function sendInterestToOracle(
        address user,
        address token,
        address oracleAddress,
        uint tokenAmount)
        public
        onlyB0x
        returns (bool) {

        if (tokenAmount == 0)
            return false;

        interest[token][user] = interest[token][user].sub(tokenAmount);

        if (!EIP20(token).transfer(oracleAddress, tokenAmount))
            revert();

        return true;
    }

    function transferFrom(
        address token,
        address from,
        address to,        
        uint value)
        public
        onlyB0x
        returns (bool)
    {
        if (!EIP20(token).transferFrom(from, to, value))
            revert();

        return true;
    }

}

/*
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
