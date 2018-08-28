/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
 
pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "./BZxStorage.sol";


contract Proxiable {
    mapping (bytes4 => address) public targets;

    mapping (bytes4 => bool) public targetIsPaused;

    function initialize(address _target) public;

    function _replaceContract(address _target) internal {
        // bytes4(keccak256("initialize(address)")) == 0xc4d66de8
        require(_target.delegatecall(0xc4d66de8, _target), "Proxiable::_replaceContract: failed");
    }
}


// bZx proxy
contract BZxProxy is BZxStorage, Proxiable {

    function() payable public {
        require(!targetIsPaused[msg.sig], "BZxProxy::Function temporarily paused");

        address target = targets[msg.sig];
        require(target != address(0), "BZxProxy::Target not found");

        bytes memory data = msg.data;
        assembly {
            let result := delegatecall(gas, target, add(data, 0x20), mload(data), 0, 0)
            let size := returndatasize
            let ptr := mload(0x40)
            returndatacopy(ptr, 0, size)
            switch result
            case 0 { revert(ptr, size) }
            default { return(ptr, size) }
        }
    }

    function initialize(
        address)
        public
    {
        revert();
    }

    /*
     * Owner only functions
     */
    function replaceContract(
        address _target)
        public
        onlyOwner
    {
        _replaceContract(_target);
    }

    function setTarget(
        string _funcId,  // example: "takeLoanOrderAsTrader(address[6],uint256[10],address,uint256,bytes)"
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
        string _funcId,  // example: "takeLoanOrderAsTrader(address[6],uint256[10],address,uint256,bytes)"
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
        address _vault,
        address _oracleregistry,
        address _exchange0xWrapper,
        address _exchange0xV2Wrapper)
        public
        onlyOwner
    {
        if (_bZRxToken != address(0) && _vault != address(0) && _oracleregistry != address(0) && _exchange0xWrapper != address(0) && _exchange0xV2Wrapper != address(0))
        bZRxTokenContract = _bZRxToken;
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

    function setVault (
        address _vault)
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
        string _funcId) // example: "takeLoanOrderAsTrader(address[6],uint256[10],address,uint256,bytes)"
        public
        view
        returns (address)
    {
        return targets[bytes4(keccak256(abi.encodePacked(_funcId)))];
    }

    function getTargetPause(
        string _funcId) // example: "takeLoanOrderAsTrader(address[6],uint256[10],address,uint256,bytes)"
        public
        view
        returns (bool)
    {
        return targetIsPaused[bytes4(keccak256(abi.encodePacked(_funcId)))];
    }
}
