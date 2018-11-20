/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

import "./BZRxToken.sol";


contract BZRxTransferProxy is Ownable {
    using SafeMath for uint256;

    address public bZRxTokenContractAddress;
    mapping (address => uint) public transferAllowance;

    string public name = "bZx Protocol Token";
    string public symbol = "BZRX";
    uint8 public decimals = 18;

    constructor(
        address _bZRxTokenContractAddress)
        public
    {
        bZRxTokenContractAddress = _bZRxTokenContractAddress;
    }

    function()  
        public
    {
        revert();
    }

    // for ERC20 conformity
    function transferFrom(
        address _from,
        address _to,
        uint256 _amount)
        public
        returns (bool)
    {
        require(_amount <= transferAllowance[msg.sender], "insufficient transfer allowance");

        transferAllowance[msg.sender] = transferAllowance[msg.sender].sub(_amount);
        
        return BZRxToken(bZRxTokenContractAddress).minterTransferFrom(
            msg.sender,
            _from,
            _to,
            _amount
        );
    }

    // for ERC20 conformity
    function totalSupply() 
        public 
        view 
        returns (uint) 
    {
        return StandardToken(bZRxTokenContractAddress).totalSupply.gas(4999)();
    }

    // for ERC20 conformity
    function balanceOf(
        address _owner) 
        public 
        view 
        returns (uint)
    {
        return StandardToken(bZRxTokenContractAddress).balanceOf.gas(4999)(_owner);
    }

    // for ERC20 conformity
    function allowance(
        address _owner,
        address _spender)
        public
        view
        returns (uint)
    {
        return StandardToken(bZRxTokenContractAddress).allowance.gas(4999)(_owner, _spender);
    }

    function setTransferAllowance(
        address _who,
        uint _amount) 
        public 
        onlyOwner 
    {
        transferAllowance[_who] = _amount;
    }

    function changeBZRxTokenContract(
        address _bZRxTokenContractAddress) 
        public 
        onlyOwner 
    {
        bZRxTokenContractAddress = _bZRxTokenContractAddress;
    }

    function transferToken(
        address _tokenAddress,
        address _to,
        uint _value)
        public
        onlyOwner
        returns (bool)
    {
        uint balance = StandardToken(_tokenAddress).balanceOf.gas(4999)(this);
        if (_value > balance) {
            return StandardToken(_tokenAddress).transfer(
                _to,
                balance
            );
        } else {
            return StandardToken(_tokenAddress).transfer(
                _to,
                _value
            );
        }
    }
}