/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
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
        targets[bytes4(keccak256("liquidatePosition(bytes32,address,uint256)"))] = _target;
        targets[bytes4(keccak256("closeLoan(bytes32)"))] = _target;
        targets[bytes4(keccak256("closeLoanForBorrower(bytes32,address)"))] = _target;
        targets[bytes4(keccak256("forceCloseLoan(bytes32,address)"))] = _target;
        targets[bytes4(keccak256("shouldLiquidate(bytes32,address)"))] = _target;
    }

    /// @dev Checks that a position meets the conditions for liquidation, then closes the position and loan.
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param trader The trader of the position
    /// @param maxCloseAmount The maximum amount of loan principal to liquidate
    /// @dev A maxCloseAmount exceeding loanTokenAmountFilled or a maxCloseAmount of 0, will set the maximum to loanTokenAmountFilled.
    /// @return True on success
    function liquidatePosition(
        bytes32 loanOrderHash,
        address trader,
        uint256 maxCloseAmount)
        external
        nonReentrant
        tracksGas
        returns (bool)
    {
        require(trader != msg.sender, "BZxLoanHealth::liquidatePosition: trader can't liquidate");
        require(msg.sender == tx.origin, "BZxLoanHealth::liquidatePosition: only EOAs can liquidate");

        LoanPosition storage loanPosition = loanPositions[loanPositionsIds[loanOrderHash][trader]];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            revert("BZxLoanHealth::liquidatePosition: loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active");
        }

        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.loanTokenAddress == address(0)) {
            revert("BZxLoanHealth::liquidatePosition: loanOrder.loanTokenAddress == address(0)");
        }

        uint256 currentMargin = OracleInterface(oracleAddresses[loanOrder.oracleAddress]).getCurrentMarginAmount(
            loanOrder.loanTokenAddress,
            loanPosition.positionTokenAddressFilled,
            loanPosition.collateralTokenAddressFilled,
            loanPosition.loanTokenAmountFilled,
            loanPosition.positionTokenAmountFilled,
            loanPosition.collateralTokenAmountFilled
        );
        if (!DEBUG_MODE && block.timestamp < loanPosition.loanEndUnixTimestampSec && currentMargin > loanOrder.maintenanceMarginAmount) {
            revert("BZxLoanHealth::liquidatePosition: loan is healthy");
        }

        uint256 closeAmount;

        if ((!DEBUG_MODE && block.timestamp < loanPosition.loanEndUnixTimestampSec) ||
            (DEBUG_MODE && currentMargin <= loanOrder.maintenanceMarginAmount)) {
            // loan hasn't ended

            uint256 desiredMargin = loanOrder.maintenanceMarginAmount
                .add(10 ether); // 10 percentage points above maintenance

            uint256 normalizedCollateral = currentMargin
                .mul(loanPosition.loanTokenAmountFilled)
                .div(desiredMargin);

            if (loanPosition.loanTokenAmountFilled > normalizedCollateral) {
                closeAmount = loanPosition.loanTokenAmountFilled
                    .sub(normalizedCollateral);
            } else {
                closeAmount = loanPosition.loanTokenAmountFilled;
            }
        } else {
            // loans passed their end dates will fully closed if possible
            closeAmount = loanPosition.loanTokenAmountFilled;
        }

        if (maxCloseAmount == 0 || maxCloseAmount > loanPosition.loanTokenAmountFilled) {
            closeAmount = Math.min256(closeAmount, loanPosition.loanTokenAmountFilled);
        } else {
            closeAmount = Math.min256(closeAmount, maxCloseAmount);
        }

        uint256 closeAmountUsable;

        if (loanPosition.positionTokenAddressFilled != loanOrder.loanTokenAddress) {
            if (loanPosition.positionTokenAmountFilled == 0) {
                loanPosition.positionTokenAddressFilled = loanOrder.loanTokenAddress;
            } else {
                // If the position token is not the loan token, then we need to buy back the loan token prior to closing the loan.

                // transfer the current position token to the Oracle contract
                if (!BZxVault(vaultContract).withdrawToken(
                    loanPosition.positionTokenAddressFilled,
                    oracleAddresses[loanOrder.oracleAddress],
                    loanPosition.positionTokenAmountFilled)) {
                    revert("MiscFunctions::liquidatePosition: BZxVault.withdrawToken failed");
                }

                uint256 positionTokenAmountUsed;
                (closeAmountUsable, positionTokenAmountUsed) = OracleInterface(oracleAddresses[loanOrder.oracleAddress]).liquidatePosition(
                    loanOrder,
                    loanPosition,
                    closeAmount < loanPosition.loanTokenAmountFilled ? closeAmount : MAX_UINT // maxDestTokenAmount
                );

                if (positionTokenAmountUsed == 0) {
                    revert("BZxLoanHealth::liquidatePosition: liquidation not allowed");
                }

                if (closeAmount == loanPosition.loanTokenAmountFilled) {
                    if (loanPosition.positionTokenAmountFilled > positionTokenAmountUsed) {
                        // left over sourceToken needs to be dispursed
                        if (!BZxVault(vaultContract).withdrawToken(
                            loanPosition.positionTokenAddressFilled,
                            closeAmountUsable >= loanPosition.loanTokenAmountFilled ? loanPosition.trader : orderLender[loanOrderHash],
                            loanPosition.positionTokenAmountFilled.sub(positionTokenAmountUsed)
                        )) {
                            revert("BZxLoanHealth::liquidatePosition: BZxVault.withdrawToken excess failed");
                        }
                    }

                    // the loan token becomes the new position token
                    loanPosition.positionTokenAddressFilled = loanOrder.loanTokenAddress;
                    loanPosition.positionTokenAmountFilled = closeAmountUsable;
                } else {
                    loanPosition.positionTokenAmountFilled = loanPosition.positionTokenAmountFilled.sub(positionTokenAmountUsed);
                }
            }
        } else {
            if (loanPosition.positionTokenAmountFilled != closeAmount) {
                closeAmountUsable = closeAmount;
                loanPosition.positionTokenAmountFilled = loanPosition.positionTokenAmountFilled.sub(closeAmount);
            } else {
                closeAmountUsable = loanPosition.positionTokenAmountFilled;
                loanPosition.positionTokenAmountFilled = 0;
            }
        }

        require(_finalizeLoan(
            loanOrder,
            loanPosition, // needs to be storage
            closeAmount,
            closeAmountUsable,
            true, // isLiquidation
            gasUsed // initial used gas, collected in modifier
        ),"BZxLoanHealth::liquidatePosition: _finalizeLoan failed");

        return true;
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
        return _closeLoan(
            loanOrderHash,
            msg.sender, // borrower
            gasUsed // initial used gas, collected in modifier
        );
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
        return _closeLoan(
            loanOrderHash,
            borrower,
            gasUsed // initial used gas, collected in modifier
        );
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
