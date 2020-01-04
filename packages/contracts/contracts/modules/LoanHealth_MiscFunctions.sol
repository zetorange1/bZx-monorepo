/**
 * Copyright 2017-2020, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.3;
pragma experimental ABIEncoderV2;

import "../openzeppelin-solidity/Math.sol";

import "../proxy/BZxProxiable.sol";
import "../shared/OrderClosingFunctions.sol";

import "../BZxVault.sol";
import "../oracle/OracleInterface.sol";


contract LoanHealth_MiscFunctions is BZxStorage, BZxProxiable, OrderClosingFunctions {
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
        targets[bytes4(keccak256("closeLoan(bytes32)"))] = _target;
        targets[bytes4(keccak256("closeLoanForBorrower(bytes32,address)"))] = _target;
        targets[bytes4(keccak256("forceCloseLoan(bytes32,address)"))] = _target;
        targets[bytes4(keccak256("shouldLiquidate(bytes32,address)"))] = _target;
    }

    /// @dev Called to close a loan in full
    /// @param loanOrderHash A unique hash representing the loan order
    /// @return True on success
    function closeLoan(
        bytes32 loanOrderHash)
        external
        nonReentrant
        tracksGas
        returns (bool)
    {
        (uint256 closeAmount,) = _closeLoan(
            loanOrderHash,
            msg.sender, // borrower
            msg.sender, // receiver
            gasUsed // initial used gas, collected in modifier
        );
        return closeAmount != 0;
    }

    /// @dev Called to close a loan in full for someone else
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param borrower The borrower whose loan to close in full (for margin trades, this has to equal the sender)
    /// @return True on success
    function closeLoanForBorrower(
        bytes32 loanOrderHash,
        address borrower)
        external
        nonReentrant
        tracksGas
        returns (bool)
    {
        (uint256 closeAmount,) = _closeLoan(
            loanOrderHash,
            borrower, // borrower
            borrower, // receiver
            gasUsed // initial used gas, collected in modifier
        );
        return closeAmount != 0;
    }

    /// @dev Called by an admin to force close a loan early and return assets to the lender and trader as is.
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param trader The trader of the position
    /// @return True on success
    function forceCloseLoan(
        bytes32 loanOrderHash,
        address trader)
        external
        onlyOwner
        tracksGas
        returns (bool)
    {
        uint256 positionId = loanPositionsIds[loanOrderHash][trader];

        LoanPosition storage loanPosition = loanPositions[positionId];
        require(loanPosition.loanTokenAmountFilled != 0 && loanPosition.active);

        LoanOrder memory loanOrder = orders[loanOrderHash];
        require(loanOrder.loanTokenAddress != address(0));

        if (loanOrder.interestAmount > 0) {
            _settleInterest(
                loanOrder,
                loanPosition,
                loanPosition.loanTokenAmountFilled, // closeAmount
                false, // sendToOracle
                false  // interestToCollateralSwap
            );
        }

        if (loanPosition.collateralTokenAmountFilled > 0) {
            require(BZxVault(vaultContract).withdrawToken(
                loanPosition.collateralTokenAddressFilled,
                loanPosition.trader,
                loanPosition.collateralTokenAmountFilled
            ));
        }

        if (loanPosition.positionTokenAmountFilled > 0) {
            require(BZxVault(vaultContract).withdrawToken(
                loanPosition.positionTokenAddressFilled,
                orderLender[loanOrderHash],
                loanPosition.positionTokenAmountFilled
            ));
        }

        uint256 closeAmount = loanPosition.loanTokenAmountFilled;

        loanPosition.positionTokenAmountFilled = closeAmount; // for historical reference
        loanPosition.loanTokenAmountFilled = 0;
        //loanPosition.loanTokenAmountUsed = 0; <- not used yet
        loanPosition.active = false;
        _removePosition(
            loanOrderHash,
            loanPosition.trader);

        emit LogLoanClosed(
            orderLender[loanOrderHash],
            loanPosition.trader,
            msg.sender, // loanCloser
            false, // isLiquidation
            loanOrder.loanOrderHash,
            loanPosition.positionId
        );

        reentrancyLock = REENTRANCY_GUARD_FREE; // reentrancy safe at this point
        require(OracleInterface(oracleAddresses[loanOrder.oracleAddress]).didCloseLoan(
            loanOrder,
            loanPosition,
            msg.sender, // loanCloser
            closeAmount,
            false, // isLiquidation
            gasUsed
        ));

        return true;
    }

    /*
    * Constant public functions
    */

    /// @dev Checks the conditions for liquidation with the oracle
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param trader The trader of the position
    /// @return True if liquidation should occur, false otherwise
    function shouldLiquidate(
        bytes32 loanOrderHash,
        address trader)
        public
        view
        returns (bool)
    {
        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.loanTokenAddress == address(0)) {
            return false;
        }

        LoanPosition memory loanPosition = loanPositions[loanPositionsIds[loanOrderHash][trader]];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            return false;
        }

        if (block.timestamp >= loanPosition.loanEndUnixTimestampSec) {
            return true; // expired loan
        }

        return OracleInterface(oracleAddresses[loanOrder.oracleAddress]).shouldLiquidate(
            loanOrder,
            loanPosition);
    }
}
