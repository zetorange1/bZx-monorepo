/**
 * Copyright 2017-2020, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.3;
pragma experimental ABIEncoderV2;

import "../openzeppelin-solidity/Math.sol";
import "../proxy/BZxProxiable.sol";
import "../shared/OrderClosingFunctionsForPartial.sol";


contract LoanHealth_MiscFunctions3 is BZxStorage, BZxProxiable, OrderClosingFunctionsForPartial {
    using SafeMath for uint256;

    constructor() public {}

    function()
        external
    {
        revert("fallback not allowed");
    }

    function initialize(
        address _target)
        public
        onlyOwner
    {
        targets[bytes4(keccak256("closeLoanPartially(bytes32,uint256)"))] = _target;
        targets[bytes4(keccak256("closeLoanPartiallyIfHealthy(bytes32,uint256)"))] = _target;
        targets[bytes4(keccak256("closeLoanPartiallyFromCollateral(bytes32,uint256)"))] = _target;
    }

    /// @dev Called by the trader to close part of their loan early.
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param closeAmount The amount of the loan token to return to the lender
    /// @return The actual amount closed. Greater than closeAmount means the loan needed liquidation.
    function closeLoanPartially(
        bytes32 loanOrderHash,
        uint256 closeAmount)
        external
        nonReentrant
        tracksGas
        returns (uint256 actualCloseAmount)
    {
        if (closeAmount == 0) {
            return 0;
        }

        LoanPosition storage loanPosition = loanPositions[loanPositionsIds[loanOrderHash][msg.sender]];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            return 0;
        }

        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.loanTokenAddress == address(0)) {
            revert("_closeLoanPartially: loanOrder.loanTokenAddress == address(0)");
        }

        (actualCloseAmount,,) = _closeLoanPartially(
            [
                msg.sender, // borrower
                msg.sender, // receiver
                oracleAddresses[loanOrder.oracleAddress]
            ],
            [
                closeAmount,
                0, // collateralCloseAmount (calculated later)
                0, // marginAmountBeforeClose (calculated later)
                gasUsed // initial used gas, collected in modifier
            ],
            loanOrder,
            loanPosition,
            false // ensureHealthy
        );
    }

    /// @dev Called by the trader to close part of their loan early.
    /// @dev Contract will revert if the position is unhealthy and the full position is not being closed.
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param closeAmount The amount of the loan token to return to the lender
    /// @return The actual amount closed. Greater than closeAmount means the loan needed liquidation.
    function closeLoanPartiallyIfHealthy(
        bytes32 loanOrderHash,
        uint256 closeAmount)
        external
        nonReentrant
        tracksGas
        returns (uint256 actualCloseAmount)
    {
        if (closeAmount == 0) {
            return 0;
        }

        LoanPosition storage loanPosition = loanPositions[loanPositionsIds[loanOrderHash][msg.sender]];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            return 0;
        }

        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.loanTokenAddress == address(0)) {
            revert("_closeLoanPartially: loanOrder.loanTokenAddress == address(0)");
        }

        (actualCloseAmount,,) = _closeLoanPartially(
            [
                msg.sender, // borrower
                msg.sender, // receiver
                oracleAddresses[loanOrder.oracleAddress]
            ],
            [
                closeAmount,
                0, // collateralCloseAmount (calculated later)
                0, // marginAmountBeforeClose (calculated later)
                gasUsed // initial used gas, collected in modifier
            ],
            loanOrder,
            loanPosition,
            true // ensureHealthy
        );
    }

    /// @dev Called by the trader to close part of their loan early.
    /// @dev Contract will revert if the position is unhealthy and the full position is not being closed.
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param closeAmount The amount of collateral token to close out. Loan amount to close will be calculated based on current margin.
    /// @return The actual amount of loan token closed. Greater than closeAmount means the loan needed liquidation.
    function closeLoanPartiallyFromCollateral(
        bytes32 loanOrderHash,
        uint256 closeAmount)
        external
        nonReentrant
        tracksGas
        returns (uint256 actualCloseAmount)
    {
        if (closeAmount == 0) {
            return 0;
        }

        LoanPosition storage loanPosition = loanPositions[loanPositionsIds[loanOrderHash][msg.sender]];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            return 0;
        }

        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.loanTokenAddress == address(0)) {
            revert("_closeLoanPartially: loanOrder.loanTokenAddress == address(0)");
        }

        address oracleAddress = oracleAddresses[loanOrder.oracleAddress];

        uint256 marginAmountBeforeClose;
        uint256 collateralCloseAmount;
        uint256 updatedCloseAmount;
        if (closeAmount >= 10**28) {
            // this will trigger closing the entire loan amount
            collateralCloseAmount = loanPosition.collateralTokenAmountFilled;
            updatedCloseAmount = MAX_UINT;
        } else {
            marginAmountBeforeClose = _getCurrentMarginAmount(
                loanOrder,
                loanPosition,
                oracleAddress
            );
            if (marginAmountBeforeClose <= loanOrder.maintenanceMarginAmount) {
                revert("BZxLoanHealth::_closeLoanPartially: unhealthy position");
            }

            collateralCloseAmount = closeAmount;
            updatedCloseAmount = collateralCloseAmount
                .mul(10**20)
                .div(marginAmountBeforeClose);

            if (loanPosition.collateralTokenAddressFilled != loanOrder.loanTokenAddress) {
                (uint256 sourceToDestRate, uint256 sourceToDestPrecision,) = OracleInterface(oracleAddress).getTradeData(
                    loanOrder.loanTokenAddress,
                    loanPosition.collateralTokenAddressFilled,
                    MAX_UINT // get best rate
                );
                updatedCloseAmount = updatedCloseAmount
                    .mul(sourceToDestPrecision)
                    .div(sourceToDestRate);
                /*(,,updatedCloseAmount) = OracleInterface(oracleAddress).getTradeData(
                    loanPosition.collateralTokenAddressFilled,
                    loanOrder.loanTokenAddress,
                    collateralCloseAmount
                );
                updatedCloseAmount = updatedCloseAmount
                    .mul(sourceToDestRate)
                    .div(sourceToDestPrecision)
                    .mul(10**20)
                    .div(marginAmountBeforeClose);*/
                /*(,,updatedCloseAmount) = OracleInterface(oracleAddress).getTradeData(
                    loanPosition.collateralTokenAddressFilled,
                    loanOrder.loanTokenAddress,
                    updatedCloseAmount
                );*/
            }
        }

        (actualCloseAmount,,) = _closeLoanPartially(
            [
                msg.sender, // borrower
                msg.sender, // receiver
                oracleAddress
            ],
            [
                updatedCloseAmount,
                collateralCloseAmount,
                marginAmountBeforeClose,
                gasUsed // initial used gas, collected in modifier
            ],
            loanOrder,
            loanPosition,
            true // ensureHealthy
        );
    }
}
