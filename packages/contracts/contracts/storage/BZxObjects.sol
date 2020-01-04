/**
 * Copyright 2017-2020, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
 
pragma solidity 0.5.3;


contract BZxObjects {

    struct ListIndex {
        uint256 index;
        bool isSet;
    }

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

    struct LoanOrderAux {
        address makerAddress;
        address takerAddress;
        address feeRecipientAddress;
        address tradeTokenToFillAddress;
        uint256 lenderRelayFee;
        uint256 traderRelayFee;
        uint256 makerRole;
        uint256 expirationUnixTimestampSec;
        bool withdrawOnOpen;
        string description;
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

    struct PositionRef {
        bytes32 loanOrderHash;
        uint256 positionId;
    }

    struct LenderInterest {
        uint256 interestOwedPerDay;
        uint256 interestPaid;
        uint256 interestPaidDate;
    }

    struct TraderInterest {
        uint256 interestOwedPerDay;
        uint256 interestPaid;
        uint256 interestDepositTotal;
        uint256 interestUpdatedDate;
    }
}
