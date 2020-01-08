/**
 * Copyright 2017-2020, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
 
pragma solidity 0.5.8;

import "./openzeppelin-solidity/SafeMath.sol";
import "./openzeppelin-solidity/ReentrancyGuard.sol";
import "./openzeppelin-solidity/Ownable.sol";
import "./WETHInterface.sol";


contract LoanTokenizationV2 is ReentrancyGuard, Ownable {

    uint256 internal constant MAX_UINT = 2**256 - 1;

    string public name;
    string public symbol;
    uint8 public decimals;

    address public bZxContract;
    address public bZxVault;
    address public bZxOracle;
    address public wethContract;

    address public loanTokenAddress;

    bool public mintingPaused;
    bool public burningPaused;

    // price of token at last user checkpoint
    mapping (address => uint256) internal checkpointPrices_;


    function pauseMinting(
        bool _isPaused)
        public
        onlyOwner
    {
        mintingPaused = _isPaused;
    }
    function pauseBurning(
        bool _isPaused)
        public
        onlyOwner
    {
        burningPaused = _isPaused;
    }
}