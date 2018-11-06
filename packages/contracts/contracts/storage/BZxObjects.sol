/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
 
pragma solidity 0.4.25;


contract BZxObjects {

    struct ListIndex {
        uint index;
        bool isSet;
    }

    struct LoanOrder {
        address loanTokenAddress;
        address interestTokenAddress;
        address collateralTokenAddress;
        address oracleAddress;
        uint loanTokenAmount;
        uint interestAmount;
        uint initialMarginAmount;
        uint maintenanceMarginAmount;
        uint maxDurationUnixTimestampSec;
        bytes32 loanOrderHash;
    }

    struct LoanOrderAux {
        address maker;
        address feeRecipientAddress;
        uint lenderRelayFee;
        uint traderRelayFee;
        uint makerRole;
        uint expirationUnixTimestampSec;
    }

    struct LoanPosition {
        address trader;
        address collateralTokenAddressFilled;
        address positionTokenAddressFilled;
        uint loanTokenAmountFilled;
        uint loanTokenAmountUsed;
        uint collateralTokenAmountFilled;
        uint positionTokenAmountFilled;
        uint loanStartUnixTimestampSec;
        uint loanEndUnixTimestampSec;
        bool active;
        uint positionId;
    }

    struct PositionRef {
        bytes32 loanOrderHash;
        uint positionId;
    }

    struct InterestData {
        address lender;
        address interestTokenAddress;
        uint interestTotalAccrued;
        uint interestPaidSoFar;
        uint interestLastPaidDate;
    }

}
