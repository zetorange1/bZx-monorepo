
pragma solidity ^0.4.19;

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


    event LogLoanOrder (
        address maker,
        address loanTokenAddress,
        address interestTokenAddress,
        address collateralTokenAddress,
        address feeRecipientAddress,
        address oracleAddress,
        uint loanTokenAmount,
        uint interestAmount,
        uint initialMarginAmount,
        uint maintenanceMarginAmount,
        uint lenderRelayFee,
        uint traderRelayFee,
        uint expirationUnixTimestampSec,
        bytes32 loanOrderHash
    );

    event LogLoanOrTrade (
        address lender_OR_tradeToken,
        uint collateralTokenAmountFilled_OR_tradeTokenAmount,
        uint loanTokenAmountFilled_OR_loanTokenUsedAmount,
        uint filledUnixTimestampSec,
        uint listPosition,
        bool active
    );


    function getLoanOrderFromBytes(
        bytes loanOrderData)
        internal
        pure
        returns (LoanOrder) 
    {
        uint i;

        // handles address
        address[6] memory addrs;
        for(i = 1; i <= addrs.length; i++) {
            address tmpAddr;
            assembly {
                tmpAddr := mload(add(loanOrderData, mul(i, 32)))
            }
            addrs[i-1] = tmpAddr;
        }

        // handles uint
        uint[8] memory uints;
        for(i = addrs.length+1; i <= addrs.length+uints.length; i++) {
            uint tmpUint;
            assembly {
                tmpUint := mload(add(loanOrderData, mul(i, 32)))
            }
            uints[i-1-addrs.length] = tmpUint;
        }

        // handles bytes32
        bytes32 loanOrderHash;
        i = addrs.length + uints.length + 1;
        assembly {
            loanOrderHash := mload(add(loanOrderData, mul(i, 32)))
        }
        
        return buildLoanOrderStruct(loanOrderHash, addrs, uints);
    }

    function getLoanFromBytes(
        bytes loanData)
        internal
        pure
        returns (Loan) 
    {
        var (lender, uints, active) = getLoanOrTradePartsFromBytes(loanData);
        
        return buildLoanStruct(lender, uints, active);
    }

    function getTradeFromBytes(
        bytes tradeData)
        internal
        pure
        returns (Trade) 
    {
        var (tradeTokenAddress, uints, active) = getLoanOrTradePartsFromBytes(tradeData);
        
        return buildTradeStruct(tradeTokenAddress, uints, active);
    }

    function getLoanOrTradePartsFromBytes(
        bytes data)
        internal
        pure
        returns (address, uint[4], bool) 
    {
        uint i;

        // handles address
        address addrVal;
        assembly {
            addrVal := mload(add(data, 32))
        }

        // handles uint
        uint[4] memory uints;
        for(i = 2; i <= uints.length+1; i++) {
            uint tmpUint;
            assembly {
                tmpUint := mload(add(data, mul(i, 32)))
            }
            uints[i-2] = tmpUint;
        }

        // handles bool
        bool boolVal;
        i = uints.length + 2;
        assembly {
            boolVal := mload(add(data, mul(i, 32)))
        }

        return (addrVal, uints, boolVal);
    }

    function getLoanOrderBytes (
        bytes32 loanOrderHash,
        address[6] addrs,
        uint[8] uints)
        public
        pure
        returns (bytes)
    {
        uint size = (addrs.length + uints.length + 1) * 32;
        bytes memory data = new bytes(size);

        uint i;

        // handles address
        for(i = 1; i <= addrs.length; i++) {
            address tmpAddr = addrs[i-1];
            assembly {
                mstore(add(data, mul(i, 32)), tmpAddr)
            }
        }

        // handles uint
        for(i = addrs.length+1; i <= addrs.length+uints.length; i++) {
            uint tmpUint = uints[i-1-addrs.length];
            assembly {
                mstore(add(data, mul(i, 32)), tmpUint)
            }
        }

        // handles bytes32
        i = addrs.length + uints.length + 1;
        assembly {
            mstore(add(data, mul(i, 32)), loanOrderHash)
        }
        
        return data;
    }

    function getLoanBytes (
        address lender,
        uint[4] uints,
        bool active)
        public
        pure
        returns (bytes)
    {
        uint size = (uints.length + 2) * 32;
        bytes memory data = new bytes(size);

        uint i;

        // handles address
        i = 1;
        assembly {
            mstore(add(data, mul(i, 32)), lender)
        }

        // handles uint
        for(i = 2; i <= uints.length+1; i++) {
            uint tmpUint = uints[i-2];
            assembly {
                mstore(add(data, mul(i, 32)), tmpUint)
            }
        }

        // handles bool
        i = uints.length + 2;
        assembly {
            mstore(add(data, mul(i, 32)), active)
        }
        
        return data;
    }

    function getTradeBytes (
        address tradeTokenAddress,
        uint[4] uints,
        bool active)
        public
        pure
        returns (bytes)
    {
        uint size = (uints.length + 2) * 32;
        bytes memory data = new bytes(size);

        uint i;

        // handles address
        i = 1;
        assembly {
            mstore(add(data, mul(i, 32)), tradeTokenAddress)
        }

        // handles uint
        for(i = 2; i <= uints.length+1; i++) {
            uint tmpUint = uints[i-2];
            assembly {
                mstore(add(data, mul(i, 32)), tmpUint)
            }
        }

        // handles bool
        i = uints.length + 2;
        assembly {
            mstore(add(data, mul(i, 32)), active)
        }
        
        return data;
    }

    function buildLoanOrderStruct(
        bytes32 loanOrderHash,
        address[6] addrs,
        uint[8] uints) 
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

    function buildLoanStruct(
        address addr,
        uint[4] uints,
        bool boolean)
        internal
        pure
        returns (Loan) {

        return Loan({
            lender: addr,
            collateralTokenAmountFilled: uints[0],
            loanTokenAmountFilled: uints[1],
            filledUnixTimestampSec: uints[2],
            listPosition: uints[3],
            active: boolean
        });
    }

    function buildTradeStruct(
        address addr,
        uint[4] uints,
        bool boolean)
        internal
        pure
        returns (Trade) {

        return Trade({
            tradeTokenAddress: addr,
            tradeTokenAmount: uints[0],
            loanTokenUsedAmount: uints[1],
            filledUnixTimestampSec: uints[2],
            listPosition: uints[3],
            active: boolean
        });
    }
}
