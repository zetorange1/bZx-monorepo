
pragma solidity 0.4.18;

contract B0xTypes {
    
    struct LoanOrder {
        address maker;
        address loanTokenAddress;
        address interestTokenAddress;
        address collateralTokenAddress;
        address feeRecipientAddress;
        address oracleAddress;
        uint loanTokenAmount;
        uint interestAmount;
        uint initialMarginAmount;
        uint liquidationMarginAmount;
        uint lenderRelayFee;
        uint traderRelayFee;
        uint expirationUnixTimestampSec;
        bytes32 loanOrderHash;
    }

    struct Loan {
        address lender;
        uint collateralTokenAmountFilled;
        uint loanTokenAmountFilled;
        uint filledUnixTimestampSec;
        uint listPosition;
        bool active;
    }

    struct Trade {
        address tradeTokenAddress;
        uint tradeTokenAmount;
        uint loanTokenUsedAmount;
        uint filledUnixTimestampSec;
        uint listPosition;
        bool active;
    }

    struct InterestData {
        address lender;
        address interestTokenAddress;
        uint totalAmountAccrued;
        uint interestPaidSoFar;
    }
}
