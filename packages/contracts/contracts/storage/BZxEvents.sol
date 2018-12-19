/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
 
pragma solidity 0.4.24;


contract BZxEvents {

    event LogLoanAdded (
        bytes32 indexed loanOrderHash,
        address adderAddress,
        address indexed makerAddress,
        address indexed feeRecipientAddress,
        uint lenderRelayFee,
        uint traderRelayFee,
        uint maxDuration,
        uint makerRole
    );

    event LogLoanTaken (
        address indexed lender,
        address indexed trader,
        address loanTokenAddress,
        address collateralTokenAddress,
        uint loanTokenAmount,
        uint collateralTokenAmount,
        uint loanEndUnixTimestampSec,
        bool firstFill,
        bytes32 indexed loanOrderHash,
        uint positionId
    );

    event LogLoanCancelled(
        address indexed makerAddress,
        uint cancelLoanTokenAmount,
        uint remainingLoanTokenAmount,
        bytes32 indexed loanOrderHash
    );

    event LogLoanClosed(
        address indexed lender,
        address indexed trader,
        address loanCloser,
        bool isLiquidation,
        bytes32 indexed loanOrderHash,
        uint positionId
    );

    event LogPositionTraded(
        bytes32 indexed loanOrderHash,
        address indexed trader,
        address sourceTokenAddress,
        address destTokenAddress,
        uint sourceTokenAmount,
        uint destTokenAmount,
        uint positionId
    );

    event LogMarginLevels(
        bytes32 indexed loanOrderHash,
        address indexed trader,
        uint initialMarginAmount,
        uint maintenanceMarginAmount,
        uint currentMarginAmount,
        uint positionId
    );

    event LogWithdrawPosition(
        bytes32 indexed loanOrderHash,
        address indexed trader,
        uint positionAmount,
        uint remainingPosition,
        uint positionId
    );

    event LogPayInterestForOrder(
        bytes32 indexed loanOrderHash,
        address indexed lender,
        uint amountPaid,
        uint totalAccrued,
        uint loanCount
    );

    event LogPayInterestForPosition(
        bytes32 indexed loanOrderHash,
        address indexed lender,
        address indexed trader,
        uint amountPaid,
        uint totalAccrued,
        uint positionId
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

    event LogIncreasedLoanableAmount(
        bytes32 indexed loanOrderHash,
        address indexed lender,
        uint loanTokenAmountAdded,
        uint loanTokenAmountFillable
    );
}
