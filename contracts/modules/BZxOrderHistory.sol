
pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/math/Math.sol";

import "./BZxStorage.sol";
import "./BZxProxyContracts.sol";
import "../shared/InternalFunctions.sol";


contract BZxOrderHistory is BZxStorage, Proxiable, InternalFunctions {
    using SafeMath for uint256;

    constructor() public {}

    function initialize(
        address _target)
        public
        onlyOwner
    {
        targets[0xd8c73360] = _target; // bytes4(keccak256("getSingleOrder(bytes32)"))
        targets[0x54356cc8] = _target; // bytes4(keccak256("getOrdersAvailable(uint256,uint256)"))
        targets[0x5914d266] = _target; // bytes4(keccak256("getOrdersForUser(address,uint256,uint256)"))
        targets[0x49bd01ca] = _target; // bytes4(keccak256("getSingleLoan(bytes32,address)"))
        targets[0x512e5f9b] = _target; // bytes4(keccak256("getLoansForLender(address,uint256,bool)"))
        targets[0x9974d431] = _target; // bytes4(keccak256("getLoansForTrader(address,uint256,bool)"))
        targets[0x982260bc] = _target; // bytes4(keccak256("getActiveLoans(uint256,uint256)"))
    }

    /// @dev Returns a bytestream of a single order.
    /// @param loanOrderHash A unique hash representing the loan order.
    /// @return A concatenated stream of bytes.
    function getSingleOrder(
        bytes32 loanOrderHash)
        public
        view
        returns (bytes)
    {
        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.maker == address(0)) {
            return;
        }
        LoanOrderFees memory loanOrderFees = orderFees[loanOrderHash];

        // all encoded params will be zero-padded to 32 bytes
        bytes memory data = abi.encode(
            loanOrder.maker,
            loanOrder.loanTokenAddress,
            loanOrder.interestTokenAddress,
            loanOrder.collateralTokenAddress,
            loanOrderFees.feeRecipientAddress,
            oracleAddresses[loanOrder.oracleAddress],
            loanOrder.loanTokenAmount,
            loanOrder.interestAmount,
            loanOrder.initialMarginAmount,
            loanOrder.maintenanceMarginAmount,
            loanOrderFees.lenderRelayFee,
            loanOrderFees.traderRelayFee,
            loanOrder.expirationUnixTimestampSec,
            loanOrder.loanOrderHash
        );
        return _addExtraOrderData(loanOrder.loanOrderHash, data);
    }

    /// @dev Returns a bytestream of data from orders that are available for taking.
    /// @param start The starting order in the order list to return.
    /// @param count The total amount of orders to return if they exist. Amount returned can be less.
    /// @return A concatenated stream of bytes.
    function getOrdersAvailable(
        uint start,
        uint count)
        public
        view
        returns (bytes)
    {
        return _getOrdersForAddress(
            address(0),
            start,
            count,
            true // skipExpired
        );
    }

    /// @dev Returns a bytestream of order data for a user.
    /// @param loanParty The address of the maker or taker of the order.
    /// @param start The starting order in the order list to return.
    /// @param count The total amount of orders to return if they exist. Amount returned can be less.
    /// @return A concatenated stream of bytes.
    function getOrdersForUser(
        address loanParty,
        uint start,
        uint count)
        public
        view
        returns (bytes)
    {
        return _getOrdersForAddress(
            loanParty,
            start,
            count,
            false // skipExpired
        );
    }

    /// @dev Returns a bytestream of loan data for a lender.
    /// @param loanOrderHash A unique hash representing the loan order.
    /// @param trader The address of the trader/borrower of a loan.
    /// @return A concatenated stream of bytes.
    function getSingleLoan(
        bytes32 loanOrderHash,
        address trader)
        public
        view
        returns (bytes)
    {
        LoanPosition memory loanPosition = loanPositions[loanOrderHash][trader];
        if (loanPosition.loanTokenAmountFilled == 0) {
            return;
        }

        // all encoded params will be zero-padded to 32 bytes
        bytes memory data = abi.encode(
            loanPosition.lender,
            loanPosition.trader,
            loanPosition.collateralTokenAddressFilled,
            loanPosition.positionTokenAddressFilled,
            loanPosition.loanTokenAmountFilled,
            loanPosition.collateralTokenAmountFilled,
            loanPosition.positionTokenAmountFilled,
            loanPosition.loanStartUnixTimestampSec,
            loanPosition.index,
            loanPosition.active
        );
        return _addExtraLoanData(
            loanOrderHash,
            loanPosition,
            data,
            false);
    }

    /// @dev Returns a bytestream of loan data for a lender.
    /// @param loanParty The address of the lender in the loan.
    /// @param count The total amount of loans to return if they exist. Amount returned can be less.
    /// @param activeOnly A boolean indicating if inactive/expired loans should be excluded.
    /// @return A concatenated stream of bytes.
    function getLoansForLender(
        address loanParty,
        uint count,
        bool activeOnly)
        public
        view
        returns (bytes)
    {
        return _getLoanPositions(
            loanParty,
            count,
            activeOnly,
            true // forLender
        );
    }

    /// @dev Returns a bytestream of loan data for a trader.
    /// @param loanParty The address of the trader in the loan.
    /// @param count The total amount of loans to return if they exist. Amount returned can be less.
    /// @param activeOnly A boolean indicating if inactive/expired loans should be excluded.
    /// @return A concatenated stream of bytes.
    function getLoansForTrader(
        address loanParty,
        uint count,
        bool activeOnly)
        public
        view
        returns (bytes)
    {
        return _getLoanPositions(
            loanParty,
            count,
            activeOnly,
            false // forLender
        );
    }

    /// @dev Returns a bytestream of active loans.
    /// @param start The starting loan in the loan list to return.
    /// @param count The total amount of loans to return if they exist. Amount returned can be less.
    /// @return A concatenated stream of LoanRef(loanOrderHash, trader) bytes.
    function getActiveLoans(
        uint start,
        uint count)
        public
        view
        returns (bytes)
    {
        uint end = Math.min256(loanList.length, start.add(count));
        if (end == 0 || start >= end) {
            return;
        }

        // all encoded params will be zero-padded to 32 bytes
        bytes memory data;

        for (uint j=0; j < end-start; j++) {
            LoanRef memory loanRef = loanList[j+start];
            LoanOrder memory loanOrder = orders[loanRef.loanOrderHash];

            bytes memory tmpBytes = abi.encode(
                loanRef.loanOrderHash,
                loanRef.trader,
                loanOrder.expirationUnixTimestampSec
            );
            if (j == 0) {
                data = tmpBytes;
            } else {
                data = abi.encodePacked(data, tmpBytes);
            }
        }

        return data;
    }

    /*
    * Internal functions
    */

    function _getOrdersForAddress(
        address addr,
        uint start,
        uint count,
        bool skipExpired)
        internal
        view
        returns (bytes)
    {
        uint end = Math.min256(orderList[addr].length, start.add(count));
        if (end == 0 || start >= end) {
            return;
        }

        // all encoded params will be zero-padded to 32 bytes
        bytes memory data;

        end = end-start;
        for (uint j=0; j < end; j++) {
            LoanOrder memory loanOrder = orders[orderList[addr][j+start]];
            
            if (skipExpired && block.timestamp >= loanOrder.expirationUnixTimestampSec) {
                if (end < orderList[addr].length)
                    end++;

                continue;
            }
            
            LoanOrderFees memory loanOrderFees = orderFees[orderList[addr][j+start]];

            bytes memory tmpBytes = abi.encode(
                loanOrder.maker,
                loanOrder.loanTokenAddress,
                loanOrder.interestTokenAddress,
                loanOrder.collateralTokenAddress,
                loanOrderFees.feeRecipientAddress,
                oracleAddresses[loanOrder.oracleAddress],
                loanOrder.loanTokenAmount,
                loanOrder.interestAmount,
                loanOrder.initialMarginAmount,
                loanOrder.maintenanceMarginAmount,
                loanOrderFees.lenderRelayFee,
                loanOrderFees.traderRelayFee,
                loanOrder.expirationUnixTimestampSec,
                loanOrder.loanOrderHash
            );
            tmpBytes = _addExtraOrderData(loanOrder.loanOrderHash, tmpBytes);
            if (j == 0) {
                data = tmpBytes;
            } else {
                data = abi.encodePacked(data, tmpBytes);
            }
        }

        return data;
    }

    function _addExtraOrderData(
        bytes32 loanOrderHash,
        bytes data)
        internal
        view
        returns (bytes)
    {
        bytes memory tmpBytes = abi.encode(
            orderLender[loanOrderHash],
            orderFilledAmounts[loanOrderHash],
            orderCancelledAmounts[loanOrderHash],
            orderTraders[loanOrderHash].length,
            loanPositions[loanOrderHash][orderTraders[loanOrderHash][0]].loanStartUnixTimestampSec
        );
        return abi.encodePacked(data, tmpBytes);
    }

    function _getLoanPositions(
        address loanParty,
        uint count,
        bool activeOnly,
        bool forLender)
        internal
        view
        returns (bytes)
    {
        // all encoded params will be zero-padded to 32 bytes
        bytes memory data;

        uint itemCount = 0;
        for (uint j=orderList[loanParty].length; j > 0; j--) {
            if (forLender && loanParty != orderLender[orderList[loanParty][j-1]]) {
                continue;
            }

            address[] memory traders = orderTraders[orderList[loanParty][j-1]];
            for (uint i=traders.length; i > 0; i--) {
                LoanPosition memory loanPosition = loanPositions[orderList[loanParty][j-1]][traders[i-1]];

                if (activeOnly && !loanPosition.active) {
                    continue;
                }

                if (!forLender && loanParty != loanPosition.trader) {
                    continue;
                }

                bytes memory tmpBytes = abi.encode(
                    loanPosition.lender,
                    loanPosition.trader,
                    loanPosition.collateralTokenAddressFilled,
                    loanPosition.positionTokenAddressFilled,
                    loanPosition.loanTokenAmountFilled,
                    loanPosition.collateralTokenAmountFilled,
                    loanPosition.positionTokenAmountFilled,
                    loanPosition.loanStartUnixTimestampSec,
                    loanPosition.index,
                    loanPosition.active
                );
                tmpBytes = _addExtraLoanData(
                    orderList[loanParty][j-1],
                    loanPosition,
                    tmpBytes,
                    activeOnly);
                if (tmpBytes.length == 0) {
                    continue;
                }

                if (itemCount == 0) {
                    data = tmpBytes;
                } else {
                    data = abi.encodePacked(data, tmpBytes);
                }
                itemCount++;

                if (itemCount == count) {
                    break;
                }
            }
            if (itemCount == count) {
                break;
            }
        }

        return data;
    }

    function _addExtraLoanData(
        bytes32 loanOrderHash,
        LoanPosition loanPosition,
        bytes data,
        bool activeOnly)
        internal
        view
        returns (bytes)
    {
        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (activeOnly && block.timestamp >= loanOrder.expirationUnixTimestampSec) {
            return;
        }

        InterestData memory interestData = _getInterest(loanOrder, loanPosition);

        bytes memory tmpBytes = abi.encode(
            loanOrderHash,
            loanOrder.loanTokenAddress,
            interestData.interestTokenAddress,
            interestData.interestTotalAccrued,
            interestData.interestPaidSoFar
        );
        return abi.encodePacked(data, tmpBytes);
    }
}

