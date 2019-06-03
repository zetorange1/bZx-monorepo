/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
 
pragma solidity 0.5.8;

import "../shared/LoanTokenization.sol";


contract LoanTokenStorage is LoanTokenization {

    struct ListIndex {
        uint256 index;
        bool isSet;
    }

    struct LoanData {
        bytes32 loanOrderHash;
        uint256 leverageAmount;
        uint256 initialMarginAmount;
        uint256 maintenanceMarginAmount;
        uint256 maxDurationUnixTimestampSec;
        uint256 index;
    }

    struct TokenReserves {
        address lender;
        uint256 amount;
    }

    event Borrow(
        address indexed borrower,
        uint256 borrowAmount,
        uint256 interestRate,
        address collateralTokenAddress,
        address tradeTokenToFillAddress,
        bool withdrawOnOpen
    );

    event Claim(
        address indexed claimant,
        uint256 tokenAmount,
        uint256 assetAmount,
        uint256 remainingTokenAmount,
        uint256 price
    );

    bool internal isInitialized_ = false;

    address public tokenizedRegistry;

    uint256 public baseRate = 1000000000000000000; // 1.0%
    uint256 public rateMultiplier = 39000000000000000000; // 39%

    // "fee percentage retained by the oracle" = SafeMath.sub(10**20, spreadMultiplier);
    uint256 public spreadMultiplier;

    mapping (uint256 => bytes32) public loanOrderHashes; // mapping of levergeAmount to loanOrderHash
    mapping (bytes32 => LoanData) public loanOrderData; // mapping of loanOrderHash to LoanOrder
    uint256[] public leverageList;

    TokenReserves[] public burntTokenReserveList; // array of TokenReserves
    mapping (address => ListIndex) public burntTokenReserveListIndex; // mapping of lender address to ListIndex objects
    uint256 public burntTokenReserved; // total outstanding burnt token amount
    address internal nextOwedLender_;

    uint256 public totalAssetBorrow = 0; // current amount of loan token amount tied up in loans

    uint256 internal checkpointSupply_;

    uint256 internal lastSettleTime_;

    uint256 public initialPrice;
}
