/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
 
pragma solidity 0.4.24;


contract BZxEvents {

    event LogLoanAdded (
        bytes32 loanOrderHash,
        address adder,
        address maker,
        address feeRecipientAddress,
        uint lenderRelayFee,
        uint traderRelayFee,
        uint maxDuration,
        uint makerRole
    );

    event LogLoanTaken (
        address lender,
        address trader,
        address collateralTokenAddressFilled,
        address positionTokenAddressFilled,
        uint loanTokenAmountFilled,
        uint collateralTokenAmountFilled,
        uint positionTokenAmountFilled,
        uint loanStartUnixTimestampSec,
        bool active,
        bytes32 loanOrderHash
    );

    event LogLoanCancelled(
        address maker,
        uint cancelLoanTokenAmount,
        uint remainingLoanTokenAmount,
        bytes32 loanOrderHash
    );

    event LogLoanClosed(
        address lender,
        address trader,
        address loanCloser,
        bool isLiquidation,
        bytes32 loanOrderHash
    );

    event LogPositionTraded(
        bytes32 loanOrderHash,
        address trader,
        address sourceTokenAddress,
        address destTokenAddress,
        uint sourceTokenAmount,
        uint destTokenAmount
    );

    event LogMarginLevels(
        bytes32 loanOrderHash,
        address trader,
        uint initialMarginAmount,
        uint maintenanceMarginAmount,
        uint currentMarginAmount
    );

    event LogWithdrawProfit(
        bytes32 loanOrderHash,
        address trader,
        uint profitWithdrawn,
        uint remainingPosition
    );

    event LogPayInterestForOrder(
        bytes32 loanOrderHash,
        address lender,
        uint amountPaid,
        uint totalAccrued,
        uint loanCount
    );

    event LogPayInterestForPosition(
        bytes32 loanOrderHash,
        address lender,
        address trader,
        uint amountPaid,
        uint totalAccrued
    );

    event LogChangeTraderOwnership(
        bytes32 loanOrderHash,
        address oldOwner,
        address newOwner
    );

    event LogChangeLenderOwnership(
        bytes32 loanOrderHash,
        address oldOwner,
        address newOwner
    );
}
