/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
 
pragma solidity 0.5.6;

import "./openzeppelin-solidity/StandardToken.sol";
import "./openzeppelin-solidity/DetailedERC20.sol";


contract SplittableToken is StandardToken, DetailedERC20 {
    using SafeMath for uint256;

    uint256 internal constant MAX_UINT = 2**256 - 1;

    uint256 public splitFactor_ = 10**18;

    event Mint(
        address indexed to,
        uint256 tokenAmount,
        uint256 assetAmount,
        uint256 price
    );
    
    event Burn(
        address indexed burner,
        uint256 tokenAmount,
        uint256 assetAmount,
        uint256 price
    );

    function totalSupply()
        public
        view
        returns (uint256)
    {
        return denormalize(totalSupply_);
    }

    function balanceOf(
        address _owner)
        public
        view
        returns (uint256)
    {
        return denormalize(balances[_owner]);
    }

    function allowance(
        address _owner,
        address _spender)
        public
        view
        returns (uint256)
    {
        return denormalize(allowed[_owner][_spender]);
    }

    function transferFrom(
        address _from,
        address _to,
        uint256 _value)
        public
        returns (bool)
    {
        uint256 normalizedValue = normalize(_value);
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
        uint256 normalizedValue = normalize(_value);
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
        allowed[msg.sender][_spender] = normalize(_value);
        emit Approval(msg.sender, _spender, _value);
        return true;
    }

    function increaseApproval(
        address _spender,
        uint256 _addedValue)
        public
        returns (bool)
    {
        uint256 normalizedValue = normalize(_addedValue);
        allowed[msg.sender][_spender] = allowed[msg.sender][_spender].add(normalizedValue);
        emit Approval(msg.sender, _spender, denormalize(allowed[msg.sender][_spender]));
        return true;
    }

    function decreaseApproval(
        address _spender,
        uint256 _subtractedValue)
        public
        returns (bool)
    {
        uint256 normalizedValue = normalize(_subtractedValue);
        uint256 oldValue = allowed[msg.sender][_spender];
        if (normalizedValue >= oldValue) {
            allowed[msg.sender][_spender] = 0;
        } else {
            allowed[msg.sender][_spender] = oldValue.sub(normalizedValue);
        }
        emit Approval(msg.sender, _spender, denormalize(allowed[msg.sender][_spender]));
        return true;
    }

    function normalize(
        uint256 _value)
        internal
        view
        returns (uint256)
    {
        return _value
            .mul(splitFactor_)
            .div(10**18);
    }

    function denormalize(
        uint256 _value)
        internal
        view
        returns (uint256)
    {
        return _value
            .mul(10**18)
            .div(splitFactor_);
    }

    function _mint(
        address _to,
        uint256 _tokenAmount,
        uint256 _assetAmount,
        uint256 _price)
        internal
    {
        uint256 normalizedValue = normalize(_tokenAmount);
        require(_to != address(0), "invalid address");
        totalSupply_ = totalSupply_.add(normalizedValue);
        balances[_to] = balances[_to].add(normalizedValue);
        emit Mint(_to, _tokenAmount, _assetAmount, _price);
        emit Transfer(address(0), _to, _tokenAmount);
    }

    function _burn(
        address _who, 
        uint256 _tokenAmount,
        uint256 _assetAmount,
        uint256 _price)
        internal
    {
        uint256 normalizedValue = normalize(_tokenAmount);
        require(normalizedValue <= balances[_who], "burn value exceeds balance");
        // no need to require value <= totalSupply, since that would imply the
        // sender's balance is greater than the totalSupply, which *should* be an assertion failure

        balances[_who] = balances[_who].sub(normalizedValue);
        totalSupply_ = totalSupply_.sub(normalizedValue);
        emit Burn(_who, _tokenAmount, _assetAmount, _price);
        emit Transfer(_who, address(0), _tokenAmount);
    }
}