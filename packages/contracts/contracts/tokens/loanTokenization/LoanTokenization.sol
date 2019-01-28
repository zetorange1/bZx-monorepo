/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
 
pragma solidity 0.5.3;

import "../../openzeppelin-solidity/Ownable.sol";
import "../../openzeppelin-solidity/DetailedERC20.sol";
import "../UnlimitedAllowanceToken.sol";
import "../../shared/WETHInterface.sol";


contract LoanTokenization is UnlimitedAllowanceToken, DetailedERC20, Ownable {

    uint256 internal constant MAX_UINT = 2**256 - 1;

    address public bZxContract;
    address public bZxVault;
    address public bZxOracle;
    address public wethContract;
    uint256 public maxDurationUnixTimestampSec = 2419200; // 28 days

    address public loanTokenAddress;

    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed burner, uint256 value);

    struct LoanData {
        bytes32 loanOrderHash;
        uint256 leverageAmount;
        uint256 initialMarginAmount;
        uint256 maintenanceMarginAmount;
    }

    /**
    * @dev Function to mint tokens
    * @param _to The address that will receive the minted tokens.
    * @param _amount The amount of tokens to mint.
    * @return A boolean that indicates if the operation was successful.
    */
    function _mint(
        address _to,
        uint256 _amount)
        internal
    {
        require(_to != address(0), "token burn not allowed");
        totalSupply_ = totalSupply_.add(_amount);
        balances[_to] = balances[_to].add(_amount);
        emit Mint(_to, _amount);
        emit Transfer(address(0), _to, _amount);
    }

    function _burn(
        address _who, 
        uint256 _value)
        internal
    {
        require(_value <= balances[_who], "burn value exceeds balance");
        // no need to require value <= totalSupply, since that would imply the
        // sender's balance is greater than the totalSupply, which *should* be an assertion failure

        balances[_who] = balances[_who].sub(_value);
        totalSupply_ = totalSupply_.sub(_value);
        emit Burn(_who, _value);
        emit Transfer(_who, address(0), _value);
    }
}