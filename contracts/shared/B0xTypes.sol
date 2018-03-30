
pragma solidity ^0.4.21;

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
        uint maintenanceMarginAmount;
        uint lenderRelayFee;
        uint traderRelayFee;
        uint expirationUnixTimestampSec;
        bytes32 loanOrderHash;
    }

    struct LoanPosition {
        address lender;
        address trader;
        address collateralTokenAddressFilled;
        address positionTokenAddressFilled;
        uint loanTokenAmountFilled;
        uint collateralTokenAmountFilled;
        uint positionTokenAmountFilled;
        uint loanStartUnixTimestampSec;
        bool active;
    }

    struct Counterparty {
        address counterparty;
        bytes32 loanOrderHash;
    }

    struct InterestData {
        address lender;
        address interestTokenAddress;
        uint totalAmountAccrued;
        uint interestPaidSoFar;
    }

    // for debugging
    /*event MarginCalc(
        address exposureTokenAddress,
        address collateralTokenAddress,
        address oracleAddress,
        uint exposureTokenAmount,
        uint collateralTokenAmount,
        uint marginAmount,
        uint rate,
        uint otherAmount
    );*/

    uint constant MAX_UINT = 2**256 - 1;

    function buildLoanOrderStruct(
        bytes32 loanOrderHash,
        address[6] addrs,
        uint[9] uints) 
        internal
        pure
        returns (LoanOrder) {

            return LoanOrder({
                maker: addrs[0],
                loanTokenAddress: addrs[1],
                interestTokenAddress: addrs[2],
                collateralTokenAddress: addrs[3],
                feeRecipientAddress: addrs[4],
                oracleAddress: addrs[5],
                loanTokenAmount: uints[0],
                interestAmount: uints[1],
                initialMarginAmount: uints[2],
                maintenanceMarginAmount: uints[3],
                lenderRelayFee: uints[4],
                traderRelayFee: uints[5],
                expirationUnixTimestampSec: uints[6],
                loanOrderHash: loanOrderHash
            });
    }

    /*function buildLoanPositionStruct(
        address[4] addrs,
        uint[5] uints)
        internal
        pure
        returns (Loan) {

        return LoanPosition({            
            lender: addrs[0],
            trader: addrs[1],
            collateralTokenAddressFilled: addrs[2],
            positionTokenAddressFilled: addrs[3],
            loanTokenAmountFilled: uints[0],
            collateralTokenAmountFilled: uints[1],
            positionTokenAmountFilled: uints[2],
            loanStartUnixTimestampSec: uints[3],
            active: uints[4] != 0
        });
    }*/
}
