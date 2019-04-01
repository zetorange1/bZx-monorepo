/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
 
pragma solidity 0.5.7;

import "../shared/LoanTokenization.sol";


contract PositionTokenStorage is LoanTokenization {

    bool internal isInitialized_ = false;

    address public loanTokenLender;
    address public tradeTokenAddress;

    uint256 public leverageAmount;
    bytes32 public loanOrderHash;

    uint256 internal constant initialPrice_ = 10**21; // starting price of 1,000
    uint256 public constant splitPrice = 10**24; // 1,000,000
    uint256 public constant splitPriceReverse = 10**11; // 0.0000001

    uint256 internal lastPrice_;
    
    uint256 internal splitFactor_ = 10**18;

    // General Purpose
    mapping (bytes => uint256) internal dbUint256;
    mapping (bytes => uint256[]) internal dbUint256Array;
    mapping (bytes => address) internal dbAddress;
    mapping (bytes => address[]) internal dbAddressArray;
    mapping (bytes => bool) internal dbBool;
    mapping (bytes => bool[]) internal dbBoolArray;
    mapping (bytes => bytes32) internal dbBytes32;
    mapping (bytes => bytes32[]) internal dbBytes32Array;
    mapping (bytes => bytes) internal dbBytes;
    mapping (bytes => bytes[]) internal dbBytesArray;
}
