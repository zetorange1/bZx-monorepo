/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
 
pragma solidity 0.5.5;

import "./openzeppelin-solidity/StandardToken.sol";
import "./openzeppelin-solidity/DetailedERC20.sol";


contract SplittableToken is StandardToken, DetailedERC20 {
    using SafeMath for uint256;

    uint256 internal constant MAX_UINT = 2**256 - 1;

    uint256 public splitFactor_ = 1;

    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed burner, uint256 value);

    function totalSupply()
        public
        view
        returns (uint256)
    {
        return totalSupply_
            .div(splitFactor_);
    }

    function balanceOf(
        address _owner)
        public
        view
        returns (uint256)
    {
        return balances[_owner]
            .div(splitFactor_);
    }

    function allowance(
        address _owner,
        address _spender)
        public
        view
        returns (uint256)
    {
        return allowed[_owner][_spender]
            .div(splitFactor_);
    }

    function transferFrom(
        address _from,
        address _to,
        uint256 _value)
        public
        returns (bool)
    {
        uint256 normalizedValue = _value.mul(splitFactor_);
        uint256 allowanceAmount = allowed[_from][msg.sender];
        require(normalizedValue <= balances[_from], "insufficient balance");
        require(normalizedValue <= allowanceAmount, "insufficient allowance");
        require(_to != address(0), "invalid address");

        balances[_from] = balances[_from].sub(normalizedValue);
        balances[_to] = balances[_to].add(normalizedValue);
        if (allowanceAmount < MAX_UINT) {
            allowed[_from][msg.sender] = allowanceAmount.sub(normalizedValue);
        }
        emit Transfer(_from, _to, _value);
        return true;
    }

    function transfer(
        address _to,
        uint256 _value)
        public 
        returns (bool)
    {
        uint256 normalizedValue = _value.mul(splitFactor_);
        require(normalizedValue <= balances[msg.sender], "insufficient balance");
        require(_to != address(0), "invalid address");

        balances[msg.sender] = balances[msg.sender].sub(normalizedValue);
        balances[_to] = balances[_to].add(normalizedValue);
        emit Transfer(msg.sender, _to, _value);
        return true;
    }

    function approve(
        address _spender,
        uint256 _value)
        public
        returns (bool)
    {
        allowed[msg.sender][_spender] = _value.mul(splitFactor_);
        emit Approval(msg.sender, _spender, _value);
        return true;
    }

    function increaseApproval(
        address _spender,
        uint256 _addedValue)
        public
        returns (bool)
    {
        uint256 normalizedValue = _addedValue.mul(splitFactor_);
        allowed[msg.sender][_spender] = allowed[msg.sender][_spender].add(normalizedValue);
        emit Approval(msg.sender, _spender, allowed[msg.sender][_spender].div(splitFactor_));
        return true;
    }

    function decreaseApproval(
        address _spender,
        uint256 _subtractedValue)
        public
        returns (bool)
    {
        uint256 normalizedValue = _subtractedValue.mul(splitFactor_);
        uint256 oldValue = allowed[msg.sender][_spender];
        if (normalizedValue >= oldValue) {
            allowed[msg.sender][_spender] = 0;
        } else {
            allowed[msg.sender][_spender] = oldValue.sub(normalizedValue);
        }
        emit Approval(msg.sender, _spender, allowed[msg.sender][_spender].div(splitFactor_));
        return true;
    }

    function _mint(
        address _to,
        uint256 _value)
        internal
    {
        uint256 normalizedValue = _value.mul(splitFactor_);
        require(_to != address(0), "invalid address");
        totalSupply_ = totalSupply_.add(normalizedValue);
        balances[_to] = balances[_to].add(normalizedValue);
        emit Mint(_to, _value);
        emit Transfer(address(0), _to, _value);
    }

    function _burn(
        address _who, 
        uint256 _value)
        internal
    {
        uint256 normalizedValue = _value.mul(splitFactor_);
        require(normalizedValue <= balances[_who], "burn value exceeds balance");
        // no need to require value <= totalSupply, since that would imply the
        // sender's balance is greater than the totalSupply, which *should* be an assertion failure

        balances[_who] = balances[_who].sub(normalizedValue);
        totalSupply_ = totalSupply_.sub(normalizedValue);
        emit Burn(_who, _value);
        emit Transfer(_who, address(0), _value);
    }
}