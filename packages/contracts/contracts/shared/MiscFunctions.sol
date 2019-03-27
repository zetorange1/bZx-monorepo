/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.3;
pragma experimental ABIEncoderV2;

import "../openzeppelin-solidity/SafeMath.sol";
import "../storage/BZxStorage.sol";
import "../BZxVault.sol";
import "../oracle/OracleInterface.sol";
import "./MathFunctions.sol";


contract MiscFunctions is BZxStorage, MathFunctions {
    using SafeMath for uint256;

    function _payInterestForOrder(
        LoanOrder memory loanOrder,
        LenderInterest storage oracleInterest,
        LenderInterest storage lenderInterest,
        bool sendToOracle)
        internal
        returns (uint256)
    {
        uint256 interestOwedNow = 0;
        if (oracleInterest.interestOwedPerDay > 0 && oracleInterest.interestPaidDate > 0 && loanOrder.interestTokenAddress != address(0)) {
            address lender = orderLender[loanOrder.loanOrderHash];
            interestOwedNow = block.timestamp.sub(oracleInterest.interestPaidDate).mul(oracleInterest.interestOwedPerDay).div(86400);
            if (interestOwedNow > tokenInterestOwed[lender][loanOrder.interestTokenAddress])
                interestOwedNow = tokenInterestOwed[lender][loanOrder.interestTokenAddress];

            if (interestOwedNow > 0) {
                lenderInterest.interestPaid = lenderInterest.interestPaid.add(interestOwedNow);
                oracleInterest.interestPaid = oracleInterest.interestPaid.add(interestOwedNow);
                tokenInterestOwed[lender][loanOrder.interestTokenAddress] = tokenInterestOwed[lender][loanOrder.interestTokenAddress].sub(interestOwedNow);

                if (sendToOracle) {
                    // send the interest to the oracle for further processing
                    if (! BZxVault(vaultContract).withdrawToken(
                        loanOrder.interestTokenAddress,
                        oracleAddresses[loanOrder.oracleAddress],
                        interestOwedNow
                    )) {
                        revert("_payInterest: BZxVault.withdrawToken failed");
                    }

                    // calls the oracle to signal processing of the interest (ie: paying the lender, retaining fees)
                    if (! OracleInterface(oracleAddresses[loanOrder.oracleAddress]).didPayInterest(
                        loanOrder,
                        lender,
                        interestOwedNow,
                        gasUsed // initial used gas, collected in modifier
                    )) {
                        revert("_payInterest: OracleInterface.didPayInterest failed");
                    }
                }

                emit LogPayInterestForOrder(
                    loanOrder.loanOrderHash,
                    lender,
                    loanOrder.interestTokenAddress,
                    interestOwedNow,
                    lenderInterest.interestPaid,
                    orderPositionList[loanOrder.loanOrderHash].length
                );
            }
        }

        lenderInterest.interestPaidDate = block.timestamp;
        oracleInterest.interestPaidDate = block.timestamp;

        return interestOwedNow;
    }

    /// @dev Calculates the sum of values already filled and cancelled for a given loanOrder.
    /// @param loanOrderHash A unique hash representing the loan order.
    /// @return Sum of values already filled and cancelled.
    function _getUnavailableLoanTokenAmount(
        bytes32 loanOrderHash)
        internal
        view
        returns (uint256)
    {
        uint256 unavailableAmount = orderFilledAmounts[loanOrderHash].add(orderCancelledAmounts[loanOrderHash]);
        return (orders[loanOrderHash].loanTokenAmount >= unavailableAmount ? unavailableAmount : orders[loanOrderHash].loanTokenAmount);
    }

    function _getCollateralRequired(
        address loanTokenAddress,
        address collateralTokenAddress,
        address oracleAddress,
        uint256 loanTokenAmountFilled,
        uint256 marginAmount)
        internal
        view
        returns (uint256 collateralTokenAmount)
    {
        if (loanTokenAddress == collateralTokenAddress) {
            collateralTokenAmount = loanTokenAmountFilled;
        } else {
            (,,collateralTokenAmount) = OracleInterface(oracleAddresses[oracleAddress]).getTradeData(
                loanTokenAddress,
                collateralTokenAddress,
                loanTokenAmountFilled
            );
        }
        if (collateralTokenAmount == 0) {
            revert("_getCollateralRequired: collateralTokenAmount == 0");
        }
        
        collateralTokenAmount = collateralTokenAmount
                                    .mul(marginAmount)
                                    .div(10**20);
    }

    function _tradePositionWithOracle(
        LoanOrder memory loanOrder,
        LoanPosition memory loanPosition,
        address destTokenAddress,
        uint256 maxDestTokenAmount,
        bool isLiquidation,
        bool ensureHealthy)
        internal
        returns (uint256 destTokenAmountReceived, uint256 positionTokenAmountUsed)
    {
        if (loanPosition.positionTokenAmountFilled > 0) {
            // transfer the current position token to the Oracle contract
            if (!BZxVault(vaultContract).withdrawToken(
                loanPosition.positionTokenAddressFilled,
                oracleAddresses[loanOrder.oracleAddress],
                loanPosition.positionTokenAmountFilled)) {
                revert("MiscFunctions::_tradePositionWithOracle: BZxVault.withdrawToken failed");
            }
        }

        if (isLiquidation && block.timestamp < loanPosition.loanEndUnixTimestampSec) { // checks for non-expired loan
            (destTokenAmountReceived, positionTokenAmountUsed) = OracleInterface(oracleAddresses[loanOrder.oracleAddress]).verifyAndLiquidate(
                loanOrder,
                loanPosition);
        } else {
            (destTokenAmountReceived, positionTokenAmountUsed) = OracleInterface(oracleAddresses[loanOrder.oracleAddress]).tradePosition(
                loanOrder,
                loanPosition,
                destTokenAddress,
                maxDestTokenAmount,
                ensureHealthy);
        }
    }

    function _removeLoanOrder(
        bytes32 loanOrderHash,
        address addr)
        internal
    {
        if (orderListIndex[loanOrderHash][addr].isSet) {
            assert(orderList[addr].length > 0);

            uint256 index = orderListIndex[loanOrderHash][addr].index;
            if (orderList[addr].length > 1) {
                // replace order in list with last order in array
                orderList[addr][index] = orderList[addr][orderList[addr].length - 1];

                // update the position of this replacement
                orderListIndex[orderList[addr][index]][addr].index = index;
            }

            // trim array and clear storage
            orderList[addr].length--;
            orderListIndex[loanOrderHash][addr].index = 0;
            orderListIndex[loanOrderHash][addr].isSet = false;
        }
    }
}