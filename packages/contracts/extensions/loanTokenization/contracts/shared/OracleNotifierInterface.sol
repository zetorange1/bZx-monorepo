/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
 
pragma solidity 0.5.9;
pragma experimental ABIEncoderV2;


contract BZxObjects {

    struct LoanOrder {
        address loanTokenAddress;
        address interestTokenAddress;
        address collateralTokenAddress;
        address oracleAddress;
        uint256 loanTokenAmount;
        uint256 interestAmount;
        uint256 initialMarginAmount;
        uint256 maintenanceMarginAmount;
        uint256 maxDurationUnixTimestampSec;
        bytes32 loanOrderHash;
    }

    struct LoanPosition {
        address trader;
        address collateralTokenAddressFilled;
        address positionTokenAddressFilled;
        uint256 loanTokenAmountFilled;
        uint256 loanTokenAmountUsed;
        uint256 collateralTokenAmountFilled;
        uint256 positionTokenAmountFilled;
        uint256 loanStartUnixTimestampSec;
        uint256 loanEndUnixTimestampSec;
        bool active;
        uint256 positionId;
    }
}

contract OracleNotifierInterface {

    function closeLoanNotifier(
        BZxObjects.LoanOrder memory loanOrder,
        BZxObjects.LoanPosition memory loanPosition,
        address loanCloser,
        uint256 closeAmount,
        bool isLiquidation)
        public
        returns (bool);
}