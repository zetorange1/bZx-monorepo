pragma solidity ^0.4.9;

contract B0xTypes {
    
    struct LendOrder {
        address maker;
        address lendTokenAddress;
        address interestTokenAddress;
        address marginTokenAddress;
        address feeRecipientAddress;
        address oracleAddress;
        uint lendTokenAmount;
        uint interestAmount;
        uint initialMarginAmount;
        uint liquidationMarginAmount;
        uint lenderRelayFee;
        uint traderRelayFee;
        uint expirationUnixTimestampSec;
        bytes32 orderHash;
    }

    struct FilledOrder {
        address lender;
        uint marginTokenAmountFilled;
        uint lendTokenAmountFilled;
        uint filledUnixTimestampSec;
    }

    struct Trade {
        address tradeTokenAddress;
        uint tradeTokenAmountFilled;
        uint filledUnixTimestampSec;
        bool active;
    }

    struct InterestData {
        address lender;
        address interestTokenAddress;
        uint totalAmountAccrued;
        uint interestPaidSoFar;
    }

    /*struct RateData {
        uint marginToLendRate;
        uint tradeToMarginRate;
    }*/
}
