pragma solidity ^0.4.9;

contract B0xTypes {
    
    struct LendOrder {
        address maker;
        address lendTokenAddress;
        address interestTokenAddress;
        address collateralTokenAddress;
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
        uint collateralTokenAddressAmountFilled;
        uint lendTokenAmountFilled;
        uint filledUnixTimestampSec;
    }

    struct Trade {
        address tradeTokenAddress;
        uint tradeTokenAmount;
        uint lendTokenUsedAmount;
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
