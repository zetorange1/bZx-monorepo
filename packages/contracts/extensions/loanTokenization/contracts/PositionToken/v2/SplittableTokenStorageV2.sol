/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
 
pragma solidity 0.5.8;

import "./PositionTokenStorageV2.sol";


contract SplittableTokenStorageV2 is PositionTokenStorageV2 {
    using SafeMath for uint256;

    event Transfer(
        address indexed from,
        address indexed to,
        uint256 value
    );
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );
    event Mint(
        address indexed minter,
        address indexed depositAddress,
        uint256 depositAmount,
        uint256 tokenAmount,
        uint256 price
    );
    event Burn(
        address indexed burner,
        address indexed withdrawalAddress,
        uint256 withdrawalAmount,
        uint256 tokenAmount,
        uint256 price
    );

    mapping(address => uint256) internal balances;
    mapping (address => mapping (address => uint256)) internal allowed;
    uint256 internal totalSupply_;

    uint256 public splitFactor = 10**18;

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

    function normalize(
        uint256 _value)
        internal
        view
        returns (uint256)
    {
        return _value
            .mul(splitFactor)
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
            .div(splitFactor);
    }
}