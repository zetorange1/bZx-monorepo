
pragma solidity 0.4.25;

import "./UnlimitedAllowanceToken.sol";


contract BaseToken is UnlimitedAllowanceToken {
    string public name;
    uint8 public decimals;
    string public symbol;

    constructor(
        uint256 _initialAmount,
        string _tokenName,
        uint8 _decimalUnits,
        string _tokenSymbol
        ) public {
        balances[msg.sender] = _initialAmount;               // Give the creator all initial tokens
        totalSupply_ = _initialAmount;                       // Update total supply
        name = _tokenName;                                   // Set the name for display purposes
        decimals = _decimalUnits;                            // Amount of decimals for display purposes
        symbol = _tokenSymbol;                               // Set the symbol for display purposes
    }
}
