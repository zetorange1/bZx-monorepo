
pragma solidity ^0.4.21;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import './B0xStorage.sol';

contract Proxiable {
    mapping (bytes4 => address) public targets;

    function initialize(address _target) public;

    function _replaceContract(address _target) internal {
        require(_target.delegatecall(bytes4(keccak256("initialize(address)")), _target));
    }
}

// b0x proxy
contract B0xProxy is B0xStorage, Proxiable {

    function initialize(
        address)
        public
    {
        revert();
    }

    function replaceContract(
        address _target)
        public
        onlyOwner
    {
        _replaceContract(_target);
    }

    function() public {
        address target = targets[msg.sig];
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

    /*
     * Owner only functions
     */

    function setB0xAddresses(
        address _b0xToken,
        address _vault,
        address _oracleregistry,
        address _exchange0xWrapper) 
        public
        onlyOwner
    {
        if (_b0xToken != address(0) && _vault != address(0) && _oracleregistry != address(0) && _exchange0xWrapper != address(0))
        B0X_TOKEN_CONTRACT = _b0xToken;
        VAULT_CONTRACT = _vault;
        ORACLE_REGISTRY_CONTRACT = _oracleregistry;
        B0XTO0X_CONTRACT = _exchange0xWrapper;
    }

    function setDebugMode (
        bool _debug)
        public
        onlyOwner
    {
        if (DEBUG_MODE != _debug)
            DEBUG_MODE = _debug;
    }

    function setB0xToken (
        address _token)
        public
        onlyOwner
    {
        if (_token != address(0))
            B0X_TOKEN_CONTRACT = _token;
    }

    function setVault (
        address _vault)
        public
        onlyOwner
    {
        if (_vault != address(0))
            VAULT_CONTRACT = _vault;
    }

    function setOracleRegistry (
        address _registry)
        public
        onlyOwner
    {
        if (_registry != address(0))
            ORACLE_REGISTRY_CONTRACT = _registry;
    }

    function set0xExchangeWrapper (
        address _wrapper)
        public
        onlyOwner
    {
        if (_wrapper != address(0))
            B0XTO0X_CONTRACT = _wrapper;
    }

    /*function upgradeContract (
        address newContract)
        public
        onlyOwner
    {
        require(newContract != address(0) && newContract != address(this));
        upgrade(newContract);
        B0xVault(VAULT_CONTRACT).transferOwnership(newContract);
    }*/
}
