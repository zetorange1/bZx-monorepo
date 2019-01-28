/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.3;

import "../proxy/BZxProxiable.sol";


contract BZxProxySettings is BZxStorage, BZxProxiable {

    constructor() public {}

    function()
        external
    {
        revert("fallback not allowed");
    }

    function initialize(
        address _target)
        public
        onlyOwner
    {
        targets[bytes4(keccak256("replaceContract(address)"))] = _target;
        targets[bytes4(keccak256("setTarget(string,address)"))] = _target;
        targets[bytes4(keccak256("toggleTargetPause(string,bool)"))] = _target;
        targets[bytes4(keccak256("setBZxAddresses(address,address,address,address,address,address,address)"))] = _target;
        targets[bytes4(keccak256("setDebugMode(bool)"))] = _target;
        targets[bytes4(keccak256("setBZRxToken(address)"))] = _target;
        targets[bytes4(keccak256("setBZxEther(address)"))] = _target;
        targets[bytes4(keccak256("setWeth(address)"))] = _target;
        targets[bytes4(keccak256("setVault(address)"))] = _target;
        targets[bytes4(keccak256("setOracleRegistry(address)"))] = _target;
        targets[bytes4(keccak256("setOracleReference(address,address)"))] = _target;
        targets[bytes4(keccak256("set0xExchangeWrapper(address)"))] = _target;
        targets[bytes4(keccak256("set0xV2ExchangeWrapper(address)"))] = _target;
        targets[bytes4(keccak256("getTarget(string)"))] = _target;
        targets[bytes4(keccak256("getTargetPause(string)"))] = _target;
    }

    /*
     * Owner only functions
     */

    function replaceContract(
        address _target)
        public
        onlyOwner
    {
        (bool result,) = _target.delegatecall.gas(gasleft())(abi.encodeWithSignature("initialize(address)", _target));
        require(result, "Proxiable::_replaceContract: failed");
    }

    function setTarget(
        string memory _funcId,  // example: "takeLoanOrderAsTrader(address[8],uint256[11],bytes,address,uint256,bytes)"
        address _target) // logic contract address
        public
        onlyOwner
        returns(bytes4)
    {
        bytes4 f = bytes4(keccak256(abi.encodePacked(_funcId)));
        targets[f] = _target;
        return f;
    }

    function toggleTargetPause(
        string memory _funcId,  // example: "takeLoanOrderAsTrader(address[8],uint256[11],bytes,address,uint256,bytes)"
        bool _isPaused)
        public
        onlyOwner
        returns(bytes4)
    {
        bytes4 f = bytes4(keccak256(abi.encodePacked(_funcId)));
        targetIsPaused[f] = _isPaused;
        return f;
    }

    function setBZxAddresses(
        address _bZRxToken,
        address _bZxEther,
        address _weth,
        address payable _vault,
        address _oracleregistry,
        address _exchange0xWrapper,
        address _exchange0xV2Wrapper)
        public
        onlyOwner
    {
        bZRxTokenContract = _bZRxToken;
        bZxEtherContract = _bZxEther;
        wethContract = _weth;
        vaultContract = _vault;
        oracleRegistryContract = _oracleregistry;
        bZxTo0xContract = _exchange0xWrapper;
        bZxTo0xV2Contract = _exchange0xV2Wrapper;
    }

    function setDebugMode (
        bool _debug)
        public
        onlyOwner
    {
        if (DEBUG_MODE != _debug)
            DEBUG_MODE = _debug;
    }

    function setBZRxToken (
        address _token)
        public
        onlyOwner
    {
        if (_token != address(0))
            bZRxTokenContract = _token;
    }

    function setBZxEther (
        address _token)
        public
        onlyOwner
    {
        if (_token != address(0))
            bZxEtherContract = _token;
    }

    function setWeth (
        address _token)
        public
        onlyOwner
    {
        if (_token != address(0))
            wethContract = _token;
    }

    function setVault (
        address payable _vault)
        public
        onlyOwner
    {
        if (_vault != address(0))
            vaultContract = _vault;
    }

    function setOracleRegistry (
        address _registry)
        public
        onlyOwner
    {
        if (_registry != address(0))
            oracleRegistryContract = _registry;
    }

    function setOracleReference (
        address _oracle,
        address _logicContract)
        public
        onlyOwner
    {
        if (oracleAddresses[_oracle] != _logicContract)
            oracleAddresses[_oracle] = _logicContract;
    }

    function set0xExchangeWrapper (
        address _wrapper)
        public
        onlyOwner
    {
        if (_wrapper != address(0))
            bZxTo0xContract = _wrapper;
    }

    function set0xV2ExchangeWrapper (
        address _wrapper)
        public
        onlyOwner
    {
        if (_wrapper != address(0))
            bZxTo0xV2Contract = _wrapper;
    }

    /*
     * View functions
     */

    function getTarget(
        string memory _funcId) // example: "takeLoanOrderAsTrader(address[8],uint256[11],bytes,address,uint256,bytes)"
        public
        view
        returns (address)
    {
        return targets[bytes4(keccak256(abi.encodePacked(_funcId)))];
    }

    function getTargetPause(
        string memory _funcId) // example: "takeLoanOrderAsTrader(address[8],uint256[11],bytes,address,uint256,bytes)"
        public
        view
        returns (bool)
    {
        return targetIsPaused[bytes4(keccak256(abi.encodePacked(_funcId)))];
    }
}
