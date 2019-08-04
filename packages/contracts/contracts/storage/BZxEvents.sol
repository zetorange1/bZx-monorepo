/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
 
pragma solidity 0.5.3;


contract BZxEvents {

    event LogLoanAdded (
        bytes32 indexed loanOrderHash,
        address adderAddress,
        address indexed makerAddress,
        address indexed feeRecipientAddress,
        uint256 lenderRelayFee,
        uint256 traderRelayFee,
        uint256 maxDuration,
        uint256 makerRole
    );

    event LogLoanTaken (
        address indexed lender,
        address indexed trader,
        address loanTokenAddress,
        address collateralTokenAddress,
        uint256 loanTokenAmount,
        uint256 collateralTokenAmount,
        uint256 loanEndUnixTimestampSec,
        bool firstFill,
        bytes32 indexed loanOrderHash,
        uint256 positionId
    );

    event LogLoanCancelled(
        address indexed makerAddress,
        uint256 cancelLoanTokenAmount,
        uint256 remainingLoanTokenAmount,
        bytes32 indexed loanOrderHash
    );

    event LogLoanClosed(
        address indexed lender,
        address indexed trader,
        address loanCloser,
        bool isLiquidation,
        bytes32 indexed loanOrderHash,
        uint256 positionId
    );

    event LogPositionTraded(
        bytes32 indexed loanOrderHash,
        address indexed trader,
        address sourceTokenAddress,
        address destTokenAddress,
        uint256 sourceTokenAmount,
        uint256 destTokenAmount,
        uint256 positionId
    );

    event LogWithdrawPosition(
        bytes32 indexed loanOrderHash,
        address indexed trader,
        uint256 positionAmount,
        uint256 remainingPosition,
        uint256 positionId
    );

    event LogPayInterestForOracle(
        address indexed lender,
        address indexed oracleAddress,
        address indexed interestTokenAddress,
        uint256 amountPaid,
        uint256 totalAccrued
    );

    event LogChangeTraderOwnership(
        bytes32 indexed loanOrderHash,
        address indexed oldOwner,
        address indexed newOwner
    );

    event LogChangeLenderOwnership(
        bytes32 indexed loanOrderHash,
        address indexed oldOwner,
        address indexed newOwner
    );

    event LogUpdateLoanAsLender(
        bytes32 indexed loanOrderHash,
        address indexed lender,
        uint256 loanTokenAmountAdded,
        uint256 loanTokenAmountFillable,
        uint256 expirationUnixTimestampSec
    );
}
