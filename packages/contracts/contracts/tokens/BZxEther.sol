/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.3;

import "../openzeppelin-solidity/DetailedERC20.sol";
import "./UnlimitedAllowanceToken.sol";


contract BZxEther is UnlimitedAllowanceToken, DetailedERC20 {
    using SafeMath for uint256;

    event Deposit(address indexed dest, uint256 amount);
    event Withdrawal(address indexed src, uint256 amount);

    constructor()
        public
        DetailedERC20(
            "bZx Ether",
            "BETH", 
            18
        )
    {}

    function()
        external
        payable
    {
        deposit();
    }

    function depositAndApprove(
        address _spender,
        uint256 _allowance)
        public
        payable
        returns (bool)
    {
        deposit();
        approve(_spender, _allowance);

        return true;
    }

    function depositAndTransfer(
        address _target)
        public
        payable
        returns (bool)
    {
        deposit();
        transfer(_target, msg.value);

        return true;
    }

    function withdrawAndTransfer(
        uint256 _amount,
        address payable _target)
        public
        returns (bool)
    {
        require(balances[msg.sender] >= _amount, "Insufficient user balance");
        require(_target != address(0), "Invalid target address");

        balances[msg.sender] = balances[msg.sender].sub(_amount);
        totalSupply_ = totalSupply_.sub(_amount);
        _target.transfer(_amount);

        emit Withdrawal(msg.sender, _amount);

        return true;
    }

    function deposit() 
        public
        payable
        returns (bool)
    {
        balances[msg.sender] = balances[msg.sender].add(msg.value);
        totalSupply_ = totalSupply_.add(msg.value);
        emit Deposit(msg.sender, msg.value);

        return true;
    }

    function withdraw(
        uint256 _amount)
        public
        returns (bool)
    {
        require(balances[msg.sender] >= _amount, "Insufficient user balance");

        balances[msg.sender] = balances[msg.sender].sub(_amount);
        totalSupply_ = totalSupply_.sub(_amount);
        msg.sender.transfer(_amount);

        emit Withdrawal(msg.sender, _amount);

        return true;
    }
}
