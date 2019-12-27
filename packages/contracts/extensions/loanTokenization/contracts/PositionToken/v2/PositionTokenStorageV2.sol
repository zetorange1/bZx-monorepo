/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.8;

import "../../shared/LoanTokenizationV2.sol";


contract PositionTokenStorageV2 is LoanTokenizationV2 {

    bool internal isInitialized_ = false;

    address public loanTokenLender;
    address public tradeTokenAddress;

    uint256 public leverageAmount;
    bytes32 public loanOrderHash;

    uint256 public loanTokenDecimals;
    uint256 public loanTokenAdjustment;

    uint256 public tradeTokenDecimals;
    uint256 public tradeTokenAdjustment;

    uint256 public initialPrice;

    bool public shortPosition;

    mapping (address => uint256) public userSurplus;
    mapping (address => uint256) public userDeficit;

    uint256 public totalSurplus;
    uint256 public totalDeficit;
}
