/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.8;

import "./SplittableTokenStorageV2.sol";


contract SplittableTokenV2 is SplittableTokenStorageV2 {
    using SafeMath for uint256;

    function transferFrom(
        address _from,
        address _to,
        uint256 _value)
        public
        returns (bool)
    {
        uint256 allowanceAmount = denormalize(allowed[_from][msg.sender]);
        uint256 fromBalance = denormalize(balances[_from]);
        require(_value <= fromBalance, "insufficient balance");
        require(_value <= allowanceAmount, "insufficient allowance");
        require(_to != address(0), "invalid address");

        balances[_from] = normalize(fromBalance.sub(_value));
        if (balanceOf(_from) == 0) {
            balances[_from] = 0;
        }

        balances[_to] = normalize(denormalize(balances[_to]).add(_value));
        if (allowanceAmount < MAX_UINT) {
            allowed[_from][msg.sender] = normalize(allowanceAmount.sub(_value));
            if (allowance(_from, msg.sender) == 0) {
                allowed[_from][msg.sender] = 0;
            }
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
        uint256 fromBalance = denormalize(balances[msg.sender]);
        require(_value <= fromBalance, "insufficient balance");
        require(_to != address(0), "invalid address");

        balances[msg.sender] = normalize(fromBalance.sub(_value));
        if (balanceOf(msg.sender) == 0) {
            balances[msg.sender] = 0;
        }

        balances[_to] = normalize(denormalize(balances[_to]).add(_value));
        emit Transfer(msg.sender, _to, _value);
        return true;
    }

    function approve(
        address _spender,
        uint256 _value)
        public
        returns (bool)
    {
        allowed[msg.sender][_spender] = _value;
        if (allowance(msg.sender, _spender) == 0) {
            allowed[msg.sender][_spender] = 0;
        }

        emit Approval(msg.sender, _spender, _value);
        return true;
    }

    function _mint(
        address _to,
        uint256 _tokenAmount)
        internal
    {
        require(_to != address(0), "invalid address");
        totalSupply_ = normalize(denormalize(totalSupply_).add(_tokenAmount));
        balances[_to] = normalize(denormalize(balances[_to]).add(_tokenAmount));

        emit Transfer(address(0), _to, _tokenAmount);
    }

    function _burn(
        address _who,
        uint256 _tokenAmount)
        internal
    {
        uint256 whoBalance = denormalize(balances[_who]);
        require(_tokenAmount <= whoBalance, "burn value exceeds balance");
        // no need to require value <= totalSupply, since that would imply the
        // sender's balance is greater than the totalSupply, which *should* be an assertion failure

        uint256 offsetAmount;
        balances[_who] = normalize(whoBalance.sub(_tokenAmount));
        if (balances[_who] <= 10 || balanceOf(_who) <= 10) { // we can't leave such small balance quantities
            offsetAmount = balances[_who];
            balances[_who] = 0;
        }

        uint256 normSupply = denormalize(totalSupply_);
        if (normSupply > _tokenAmount) {
            totalSupply_ = normalize(normSupply.sub(_tokenAmount));

            if (totalSupply() == 0) {
                totalSupply_ = 0;
                balances[_who] = 0;
            }
        } else {
            balances[_who] = 0;
            totalSupply_ = 0;
        }

        if (offsetAmount > 0) {
            _tokenAmount = _tokenAmount.add(denormalize(offsetAmount));
            if (totalSupply_ > offsetAmount)
                totalSupply_ = totalSupply_.sub(offsetAmount);
            else {
                totalSupply_ = 0;
            }
        }

        emit Transfer(_who, address(0), _tokenAmount);
    }
}
