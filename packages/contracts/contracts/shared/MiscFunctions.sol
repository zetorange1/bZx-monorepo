/**
 * Copyright 2017-2020, bZeroX, LLC. All Rights Reserved.
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

    function _payInterestForOracle(
        LenderInterest memory oracleInterest,
        address lender,
        address oracleAddress,
        address interestTokenAddress,
        bool sendToOracle)
        internal
        returns (uint256)
    {
        address oracleRef = oracleAddresses[oracleAddress];

        uint256 interestOwedNow;
        if (oracleInterest.interestOwedPerDay > 0 && oracleInterest.interestPaidDate > 0 && interestTokenAddress != address(0)) {
            interestOwedNow = block.timestamp.sub(oracleInterest.interestPaidDate).mul(oracleInterest.interestOwedPerDay).div(86400);
            if (interestOwedNow > tokenInterestOwed[lender][interestTokenAddress])
                interestOwedNow = tokenInterestOwed[lender][interestTokenAddress];

            if (interestOwedNow != 0) {
                oracleInterest.interestPaid = oracleInterest.interestPaid.add(interestOwedNow);
                tokenInterestOwed[lender][interestTokenAddress] = tokenInterestOwed[lender][interestTokenAddress].sub(interestOwedNow);

                if (sendToOracle) {
                    // send the interest to the oracle for further processing
                    if (!BZxVault(vaultContract).withdrawToken(
                        interestTokenAddress,
                        oracleRef,
                        interestOwedNow
                    )) {
                        revert("_payInterestForOracle: BZxVault.withdrawToken failed");
                    }

                    // calls the oracle to signal processing of the interest (ie: paying the lender, retaining fees)
                    if (!OracleInterface(oracleRef).didPayInterestByLender(
                        lender,
                        interestTokenAddress,
                        interestOwedNow,
                        gasUsed // initial used gas, collected in modifier
                    )) {
                        revert("_payInterestForOracle: OracleInterface.didPayInterestByLender failed");
                    }
                } else {
                    if (!BZxVault(vaultContract).withdrawToken(
                        interestTokenAddress,
                        lender,
                        interestOwedNow
                    )) {
                        revert("_payInterestForOracle: BZxVault.withdrawToken interest failed");
                    }
                }
            }
        }

        oracleInterest.interestPaidDate = block.timestamp;
        lenderOracleInterest[lender][oracleAddress][interestTokenAddress] = oracleInterest;

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
            collateralTokenAmount = loanTokenAmountFilled
                .mul(marginAmount)
                .div(10**20);
        } else {
            (uint256 sourceToDestRate, uint256 sourceToDestPrecision,) = OracleInterface(oracleAddresses[oracleAddress]).getTradeData(
                collateralTokenAddress,
                loanTokenAddress,
                MAX_UINT // get best rate
            );
            collateralTokenAmount = loanTokenAmountFilled
                .mul(sourceToDestPrecision)
                .div(sourceToDestRate)
                .mul(marginAmount)
                .div(10**20);
        }
        if (collateralTokenAmount == 0) {
            revert("_getCollateralRequired: collateralTokenAmount == 0");
        }
    }

    function _tradePositionWithOracle(
        LoanOrder memory loanOrder,
        LoanPosition memory loanPosition,
        address destTokenAddress,
        uint256 maxDestTokenAmount,
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

            (destTokenAmountReceived, positionTokenAmountUsed) = OracleInterface(oracleAddresses[loanOrder.oracleAddress]).tradePosition(
                loanOrder,
                loanPosition,
                destTokenAddress,
                maxDestTokenAmount,
                ensureHealthy
            );
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