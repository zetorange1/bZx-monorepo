/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
 
pragma solidity 0.5.6;
pragma experimental ABIEncoderV2;


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
}

contract OracleNotifierInterface {

    function takeOrderNotifier(
        BZxObjects.LoanOrder memory loanOrder,
        BZxObjects.LoanOrderAux memory loanOrderAux,
        BZxObjects.LoanPosition memory loanPosition,
        address taker)
        public
        returns (bool);

    function tradePositionNotifier(
        BZxObjects.LoanOrder memory loanOrder,
        BZxObjects.LoanPosition memory loanPosition)
        public
        returns (bool);

    function payInterestNotifier(
        BZxObjects.LoanOrder memory loanOrder,
        address lender,
        uint256 amountPaid)
        public
        returns (bool);

    function closeLoanNotifier(
        BZxObjects.LoanOrder memory loanOrder,
        BZxObjects.LoanPosition memory loanPosition,
        address loanCloser,
        uint256 closeAmount,
        bool isLiquidation)
        public
        returns (bool);
}