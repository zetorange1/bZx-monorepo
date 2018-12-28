/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.2;
pragma experimental ABIEncoderV2;

import "../openzeppelin-solidity/SafeMath.sol";
import "../storage/BZxStorage.sol";
import "../BZxVault.sol";
import "../oracle/OracleInterface.sol";
import "./MathFunctions.sol";


contract MiscFunctions is BZxStorage, MathFunctions {
    using SafeMath for uint256;

    /// @dev Calculates the sum of values already filled and cancelled for a given loanOrder.
    /// @param loanOrderHash A unique hash representing the loan order.
    /// @return Sum of values already filled and cancelled.
    function _getUnavailableLoanTokenAmount(
        bytes32 loanOrderHash)
        internal
        view
        returns (uint)
    {
        return orderFilledAmounts[loanOrderHash].add(orderCancelledAmounts[loanOrderHash]);
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
        (,collateralTokenAmount) = OracleInterface(oracleAddresses[oracleAddress]).getTradeData(
            loanTokenAddress,
            collateralTokenAddress,
            loanTokenAmountFilled
        );
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