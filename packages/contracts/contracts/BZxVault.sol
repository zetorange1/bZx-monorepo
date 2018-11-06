/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
 
pragma solidity 0.4.25;

import "./tokens/EIP20Wrapper.sol";
import "./modifiers/BZxOwnable.sol";


contract BZxVault is EIP20Wrapper, BZxOwnable {

    // Only the bZx contract can directly deposit ether
    function() public payable onlyBZx {}

    function withdrawEther(
        address to,
        uint value)
        public
        onlyBZx
        returns (bool)
    {
        uint amount = value;
        if (amount > address(this).balance) {
            amount = address(this).balance;
        }

        return (to.send(amount)); // solhint-disable-line check-send-result, multiple-sends
    }

    function depositToken(
        address token,
        address from,
        uint tokenAmount)
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
            this,
            tokenAmount);

        return true;
    }

    function withdrawToken(
        address token,
        address to,
        uint tokenAmount)
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
        uint tokenAmount)
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
