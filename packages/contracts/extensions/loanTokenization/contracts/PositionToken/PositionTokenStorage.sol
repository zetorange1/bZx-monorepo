/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
 
pragma solidity 0.5.8;

import "../shared/LoanTokenization.sol";


contract PositionTokenStorage is LoanTokenization {

    bool internal isInitialized_ = false;

    address public loanTokenLender;
    address public tradeTokenAddress;

    uint256 public leverageAmount;
    bytes32 public loanOrderHash;

    uint256 public initialPrice;
}
