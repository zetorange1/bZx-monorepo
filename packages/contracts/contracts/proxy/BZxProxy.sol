/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
 
pragma solidity 0.4.25;

import "./BZxProxiable.sol";


contract BZxProxy is BZxStorage, BZxProxiable {
    
    constructor(
        address _settings) 
        public
    {
        require(_settings.delegatecall(bytes4(keccak256("initialize(address)")), _settings), "BZxProxy::constructor: failed");
    }
    
    function() 
        public
        payable 
    {
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
}
