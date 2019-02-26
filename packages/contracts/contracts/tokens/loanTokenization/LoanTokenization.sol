/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
 
pragma solidity 0.5.3;

import "../../openzeppelin-solidity/Ownable.sol";
import "../../shared/WETHInterface.sol";

interface IOracle {
    function getTradeData(
        address sourceTokenAddress,
        address destTokenAddress,
        uint256 sourceTokenAmount)
        external
        view
        returns (uint256 sourceToDestRate, uint256 destTokenAmount);
}

contract LoanTokenization is Ownable {

    uint256 internal constant MAX_UINT = 2**256 - 1;

    address public bZxContract;
    address public bZxVault;
    address public bZxOracle;
    address public wethContract;

    address public loanTokenAddress;


    /* Owner-Only functions */

    function setBZxContract(
        address _addr)
        public
        onlyOwner
    {
        bZxContract = _addr;
    }

    function setBZxVault(
        address _addr)
        public
        onlyOwner
    {
        bZxVault = _addr;
    }

    function setBZxOracle(
        address _addr)
        public
        onlyOwner
    {
        bZxOracle = _addr;
    }

    function setWETHContract(
        address _addr)
        public
        onlyOwner
    {
        wethContract = _addr;
    }
}