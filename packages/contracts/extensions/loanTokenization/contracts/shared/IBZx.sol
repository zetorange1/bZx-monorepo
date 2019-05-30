/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
 
pragma solidity 0.5.9;


interface IBZx {
    function pushLoanOrderOnChain(
        address[8] calldata orderAddresses,
        uint256[11] calldata orderValues,
        bytes calldata oracleData,
        bytes calldata signature)
        external
        returns (bytes32); // loanOrderHash

    function setLoanOrderDesc(
        bytes32 loanOrderHash,
        string calldata desc)
        external
        returns (bool);

    function updateLoanAsLender(
        bytes32 loanOrderHash,
        uint256 increaseAmountForLoan,
        uint256 newInterestRate,
        uint256 newExpirationTimestamp)
        external
        returns (bool);

    function takeLoanOrderOnChainAsTraderByDelegate(
        address trader,
        bytes32 loanOrderHash,
        address collateralTokenFilled,
        uint256 loanTokenAmountFilled,
        address tradeTokenToFillAddress,
        bool withdrawOnOpen)
        external
        returns (uint256);

    function getLenderInterestForOracle(
        address lender,
        address oracleAddress,
        address interestTokenAddress)
        external
        view
        returns (
            uint256,    // interestPaid
            uint256,    // interestPaidDate
            uint256,    // interestOwedPerDay
            uint256);   // interestUnPaid

    function withdrawCollateral(
        bytes32 loanOrderHash,
        uint256 withdrawAmount)
        external
        returns (uint256 amountWithdrawn);

    function closeLoanPartially(
        bytes32 loanOrderHash,
        uint256 closeAmount)
        external
        returns (uint256 actualCloseAmount);

    function getMarginLevels(
        bytes32 loanOrderHash,
        address trader)
        external
        view
        returns (
            uint256 initialMarginAmount,
            uint256 maintenanceMarginAmount,
            uint256 currentMarginAmount);

    function getTotalEscrow(
        bytes32 loanOrderHash,
        address trader)
        external
        view
        returns (
            uint256 netCollateralAmount,
            uint256 interestDepositRemaining,
            uint256 loanTokenAmountBorrowed);

    function shouldLiquidate(
        bytes32 loanOrderHash,
        address trader)
        external
        view
        returns (bool);
}
