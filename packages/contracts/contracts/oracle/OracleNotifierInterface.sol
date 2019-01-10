/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
 
pragma solidity 0.5.2;
pragma experimental ABIEncoderV2;

import "../storage/BZxObjects.sol";


interface OracleNotifierInterface {

    function interestPaidNotifier(
        BZxObjects.LoanOrder calldata loanOrder,
        address lender,
        uint256 amountPaid)
        external
        returns (bool);

    function loanCloseNotifier(
        BZxObjects.LoanOrder calldata loanOrder,
        BZxObjects.LoanPosition calldata loanPosition,
        address loanCloser,
        uint256 closeAmount,
        bool isLiquidation)
        external
        returns (bool);
}