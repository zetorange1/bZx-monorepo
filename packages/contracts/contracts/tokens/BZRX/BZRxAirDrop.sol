/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.2;

import "../../openzeppelin-solidity/Ownable.sol";

import "./BZRxToken.sol";


contract BZRxAirDrop is Ownable {

    address public bZRxTokenContractAddress;    // BZRX Token

    constructor(
        address _bZRxTokenContractAddress)
        public
    {
        bZRxTokenContractAddress = _bZRxTokenContractAddress;
    }

    function batchMint(
        address[] memory receivers,
        uint256[] memory tokenAmounts)
        public
        onlyOwner
        returns (uint tokensMinted)
    {
        require(receivers.length > 0 && receivers.length == tokenAmounts.length, "invalid parameters");

        for (uint i=0; i < receivers.length; i++) {
            require(BZRxToken(bZRxTokenContractAddress).mint(
                receivers[i],
                tokenAmounts[i]
            ));
            tokensMinted += tokenAmounts[i];
        }
    }

    function batchMintAmount(
        address[] memory receivers,
        uint256 tokenAmount)
        public
        onlyOwner
        returns (uint tokensMinted)
    {
        require(receivers.length > 0 && tokenAmount > 0, "invalid parameters");

        for (uint i=0; i < receivers.length; i++) {
            require(BZRxToken(bZRxTokenContractAddress).mint(
                receivers[i],
                tokenAmount
            ));
        }
        tokensMinted = tokenAmount * receivers.length;
    }

    function batchSend(
        address[] memory receivers,
        uint256[] memory tokenAmounts)
        public
        onlyOwner
        returns (uint tokensSent)
    {
        require(receivers.length > 0 && receivers.length == tokenAmounts.length, "invalid parameters");

        for (uint i=0; i < receivers.length; i++) {
            require(BZRxToken(bZRxTokenContractAddress).transfer(
                receivers[i],
                tokenAmounts[i]
            ));
            tokensSent += tokenAmounts[i];
        }
    }

    function batchSendAmount(
        address[] memory receivers,
        uint256 tokenAmount)
        public
        onlyOwner
        returns (uint tokensSent)
    {
        require(receivers.length > 0 && tokenAmount > 0, "invalid parameters");

        for (uint i=0; i < receivers.length; i++) {
            require(BZRxToken(bZRxTokenContractAddress).transfer(
                receivers[i],
                tokenAmount
            ));
        }
        tokensSent = tokenAmount * receivers.length;
    }

    function changeBZRxTokenContract(
        address _bZRxTokenContractAddress) 
        public 
        onlyOwner 
        returns (bool)
    {
        bZRxTokenContractAddress = _bZRxTokenContractAddress;
        return true;
    }

    function transferToken(
        address _tokenAddress,
        address _to,
        uint _value)
        public
        onlyOwner
        returns (bool)
    {
        uint balance = StandardToken(_tokenAddress).balanceOf.gas(4999)(address(this));
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