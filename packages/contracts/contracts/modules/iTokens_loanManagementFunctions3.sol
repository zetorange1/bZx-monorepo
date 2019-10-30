/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.3;
pragma experimental ABIEncoderV2;

import "../openzeppelin-solidity/Math.sol";
import "../proxy/BZxProxiable.sol";

import "../shared/MiscFunctions.sol";

import "../tokens/EIP20.sol";

contract iTokens_loanManagementFunctions3 is BZxStorage, BZxProxiable, MiscFunctions {
    using SafeMath for uint256;


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
        targets[bytes4(keccak256("setLenderIsiTokenBatch(address[],bool[])"))] = _target;
    }


    function setLenderIsiTokenBatch(
        address[] memory tokens,
        bool[] memory toggles)
        public
        onlyOwner
    {
        require(tokens.length == toggles.length, "count mismatch");

        for (uint256 i=0; i < tokens.length; i++) {
            bytes32 slot = keccak256(abi.encodePacked("LenderIsiToken", tokens[i]));
            bool toggle = toggles[i];
            assembly {
                sstore(slot, toggle)
            }
        }
    }
}
