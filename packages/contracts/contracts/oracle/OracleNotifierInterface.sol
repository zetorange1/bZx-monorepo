/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
 
pragma solidity 0.5.2;
pragma experimental ABIEncoderV2;

import "../storage/BZxObjects.sol";


interface OracleNotifierInterface {

    function takeOrderNotifier(
        BZxObjects.LoanOrder calldata loanOrder,
        BZxObjects.LoanOrderAux calldata loanOrderAux,
        BZxObjects.LoanPosition calldata loanPosition,
        address taker)
        external
        returns (bool);

    function tradePositionNotifier(
        BZxObjects.LoanOrder calldata loanOrder,
        BZxObjects.LoanPosition calldata loanPosition)
        external
        returns (bool);

    function payInterestNotifier(
        BZxObjects.LoanOrder calldata loanOrder,
        address lender,
        uint256 amountPaid)
        external
        returns (bool);

    function closeLoanNotifier(
        BZxObjects.LoanOrder calldata loanOrder,
        BZxObjects.LoanPosition calldata loanPosition,
        address loanCloser,
        uint256 closeAmount,
        bool isLiquidation)
        external
        returns (bool);
}