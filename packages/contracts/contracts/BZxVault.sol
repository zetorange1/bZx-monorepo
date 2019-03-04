/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
 
pragma solidity 0.5.3;

import "./tokens/EIP20Wrapper.sol";
import "./modifiers/BZxOwnable.sol";


contract BZxVault is EIP20Wrapper, BZxOwnable {

    // Only the bZx contract can directly deposit ether
    function() external payable onlyBZx {}

    function withdrawEther(
        address payable to,
        uint256 value)
        public
        onlyBZx
        returns (bool)
    {
        uint256 amount = value;
        if (amount > address(this).balance) {
            amount = address(this).balance;
        }

        return (to.send(amount)); // solhint-disable-line check-send-result, multiple-sends
    }

    function depositToken(
        address token,
        address from,
        uint256 tokenAmount)
        public
        onlyBZx
        returns (bool)
    {
        if (tokenAmount == 0) {
            return false;
        }

        eip20TransferFrom(
            token,
            from,
            address(this),
            tokenAmount);

        return true;
    }

    function withdrawToken(
        address token,
        address to,
        uint256 tokenAmount)
        public
        onlyBZx
        returns (bool)
    {
        if (tokenAmount == 0) {
            return false;
        }

        eip20Transfer(
            token,
            to,
            tokenAmount);

        return true;
    }

    function transferTokenFrom(
        address token,
        address from,
        address to,
        uint256 tokenAmount)
        public
        onlyBZx
        returns (bool)
    {
        if (tokenAmount == 0) {
            return false;
        }

        eip20TransferFrom(
            token,
            from,
            to,
            tokenAmount);

        return true;
    }
}
