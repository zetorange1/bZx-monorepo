/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.3;
pragma experimental ABIEncoderV2;

import "../openzeppelin-solidity/Math.sol";

import "../proxy/BZxProxiable.sol";
import "../shared/MiscFunctions.sol";

import "../BZxVault.sol";
import "../oracle/OracleInterface.sol";


contract LoanMaintenance_MiscFunctions is BZxStorage, BZxProxiable, MiscFunctions {
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
        targets[bytes4(keccak256("depositCollateral(bytes32,address,uint256)"))] = _target;
        targets[bytes4(keccak256("withdrawCollateral(bytes32,uint256)"))] = _target;
        targets[bytes4(keccak256("changeCollateral(bytes32,address)"))] = _target;
        targets[bytes4(keccak256("withdrawPosition(bytes32,uint256)"))] = _target;
        targets[bytes4(keccak256("depositPosition(bytes32,address,uint256)"))] = _target;
        targets[bytes4(keccak256("getPositionOffset(bytes32,address)"))] = _target;
        targets[bytes4(keccak256("getTotalEscrow(bytes32,address)"))] = _target;
    }

    /// @dev Allows the trader to increase the collateral for a loan.
    /// @dev If depositTokenAddress is not the correct token, it will be traded to the correct token using the oracle.
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param depositTokenAddress The address of the collateral token used.
    /// @param depositAmount The amount of additional collateral token to deposit.
    /// @return True on success
    function depositCollateral(
        bytes32 loanOrderHash,
        address depositTokenAddress,
        uint256 depositAmount)
        external
        nonReentrant
        tracksGas
        returns (bool)
    {
        require(depositAmount > 0, "BZxLoanHealth::depositCollateral: depositAmount too low");

        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.loanTokenAddress == address(0)) {
            revert("BZxLoanHealth::depositCollateral: loanOrder.loanTokenAddress == address(0)");
        }

        LoanPosition storage loanPosition = loanPositions[loanPositionsIds[loanOrderHash][msg.sender]];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            revert("BZxLoanHealth::depositCollateral: loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active");
        }

        // for now we allow a collateral deposit prior to loan liquidation
        // require(block.timestamp < loanPosition.loanEndUnixTimestampSec);

        uint256 collateralTokenAmountReceived;
        if (depositTokenAddress != loanPosition.collateralTokenAddressFilled) {
            // send deposit token directly to the oracle to trade it
            if (!BZxVault(vaultContract).transferTokenFrom(
                depositTokenAddress,
                msg.sender,
                oracleAddresses[loanOrder.oracleAddress],
                depositAmount)) {
                revert("BZxLoanHealth::depositCollateral: BZxVault.transferTokenFrom failed");
            }

            uint256 depositTokenAmountUsed;
            (collateralTokenAmountReceived, depositTokenAmountUsed) = OracleInterface(oracleAddresses[loanOrder.oracleAddress]).trade(
                depositTokenAddress,
                loanPosition.collateralTokenAddressFilled,
                depositAmount,
                MAX_UINT);

            if (collateralTokenAmountReceived == 0) {
                revert("BZxLoanHealth::depositCollateral: collateralTokenAmountReceived == 0");
            }

            if (depositTokenAmountUsed < depositAmount) {
                // left over depositToken needs to be refunded to trader
                if (! BZxVault(vaultContract).withdrawToken(
                    depositTokenAddress,
                    msg.sender,
                    depositAmount.sub(depositTokenAmountUsed)
                )) {
                    revert("BZxLoanHealth::depositCollateral: BZxVault.withdrawToken deposit failed");
                }
            }

            loanPosition.collateralTokenAmountFilled = loanPosition.collateralTokenAmountFilled.add(collateralTokenAmountReceived);
        } else {
            // send deposit token to the vault
            if (! BZxVault(vaultContract).depositToken(
                depositTokenAddress,
                msg.sender,
                depositAmount
            )) {
                revert("BZxLoanHealth::depositCollateral: BZxVault.depositToken position failed");
            }

            loanPosition.collateralTokenAmountFilled = loanPosition.collateralTokenAmountFilled.add(depositAmount);
            collateralTokenAmountReceived = depositAmount;
        }

        if (! OracleInterface(oracleAddresses[loanOrder.oracleAddress]).didDepositCollateral(
            loanOrder,
            loanPosition,
            collateralTokenAmountReceived,
            gasUsed // initial used gas, collected in modifier
        )) {
            revert("BZxLoanHealth::depositCollateral: OracleInterface.didDepositCollateral failed");
        }

        return true;
    }

    /// @dev Allows the trader to withdraw excess collateral for a loan.
    /// @dev Excess collateral is any amount above the initial margin.
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param withdrawAmount The amount to withdraw
    /// @return amountWithdrawn The amount withdrawn denominated in collateralToken. Can be less than withdrawAmount.
    function withdrawCollateral(
        bytes32 loanOrderHash,
        uint256 withdrawAmount)
        external
        nonReentrant
        tracksGas
        returns (uint256 amountWithdrawn)
    {
        LoanOrder memory loanOrder = orders[loanOrderHash];
        LoanPosition storage loanPosition = loanPositions[loanPositionsIds[loanOrderHash][msg.sender]];

        bool isPositive;
        (isPositive,,,amountWithdrawn) = _getPositionOffset(
            loanOrder,
            loanPosition);
        if (amountWithdrawn == 0 || !isPositive) {
            return 0;
        }

        if (block.timestamp >= loanPosition.loanEndUnixTimestampSec) {
            // if a loan has ended, a loan close function should be called to recover collateral
            return 0;
        }

        // Withdraw withdrawAmount or amountWithdrawn, whichever is lessor
        amountWithdrawn = Math.min256(withdrawAmount, amountWithdrawn);

        if (amountWithdrawn > loanPosition.collateralTokenAmountFilled)
            amountWithdrawn = loanPosition.collateralTokenAmountFilled;

        if (amountWithdrawn == 0) {
            return 0;
        }

        // transfer excess collateral to trader
        if (! BZxVault(vaultContract).withdrawToken(
            loanPosition.collateralTokenAddressFilled,
            msg.sender,
            amountWithdrawn
        )) {
            revert("BZxLoanHealth::withdrawCollateral: BZxVault.withdrawToken collateral failed");
        }

        // update stored collateral amount
        loanPosition.collateralTokenAmountFilled = loanPosition.collateralTokenAmountFilled.sub(amountWithdrawn);

        if (! OracleInterface(oracleAddresses[loanOrder.oracleAddress]).didWithdrawCollateral(
            loanOrder,
            loanPosition,
            amountWithdrawn,
            gasUsed // initial used gas, collected in modifier
        )) {
            revert("BZxLoanHealth::withdrawCollateral: OracleInterface.didWithdrawCollateral failed");
        }

        return amountWithdrawn;
    }

    /// @dev Allows the trader to change the collateral token being used for a loan.
    /// @dev This function will transfer in the initial margin requirement of the new token and the old token will be refunded to the trader.
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param collateralTokenFilled The address of the new collateral token
    /// @return collateralTokenAmountFilled The amount of new collateral token filled
    function changeCollateral(
        bytes32 loanOrderHash,
        address collateralTokenFilled)
        external
        nonReentrant
        tracksGas
        returns (uint256 collateralTokenAmountFilled)
    {
        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.loanTokenAddress == address(0)) {
            revert("BZxLoanHealth::changeCollateral: loanOrder.loanTokenAddress == address(0)");
        }

        LoanPosition storage loanPosition = loanPositions[loanPositionsIds[loanOrderHash][msg.sender]];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            revert("BZxLoanHealth::changeCollateral: loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active");
        }

        if (block.timestamp >= loanPosition.loanEndUnixTimestampSec) {
            // if a loan has ended, changing collateral is not permitted
            revert("BZxLoanHealth::changeCollateral: block.timestamp >= loanPosition.loanEndUnixTimestampSec");
        }

        if (collateralTokenFilled == address(0) || collateralTokenFilled == loanPosition.collateralTokenAddressFilled) {
            revert("BZxLoanHealth::changeCollateral: collateralTokenFilled == address(0) || collateralTokenFilled == loanPosition.collateralTokenAddressFilled");
        }

        (bool isPositive,,,uint256 collateralOffset) = _getPositionOffset(
            loanOrder,
            loanPosition);
        if (isPositive) {
            collateralTokenAmountFilled = collateralOffset < loanPosition.collateralTokenAmountFilled ?
                loanPosition.collateralTokenAmountFilled - collateralOffset :
                0;
        } else {
            collateralTokenAmountFilled = loanPosition.collateralTokenAmountFilled.add(collateralOffset);
        }
        
        if (collateralTokenAmountFilled > 0) {
            // get conversion from old collateral token to new 
            (,,collateralTokenAmountFilled) = OracleInterface(oracleAddresses[loanOrder.oracleAddress]).getTradeData(
                loanPosition.collateralTokenAddressFilled,
                collateralTokenFilled,
                collateralTokenAmountFilled);

            // transfer the new collateral token from the trader to the vault
            if (! BZxVault(vaultContract).depositToken(
                collateralTokenFilled,
                msg.sender,
                collateralTokenAmountFilled
            )) {
                revert("BZxLoanHealth::changeCollateral: BZxVault.depositToken new collateral failed");
            }
        }

        if (loanPosition.collateralTokenAmountFilled > 0) {
            // transfer the old collateral token from the vault to the trader
            if (! BZxVault(vaultContract).withdrawToken(
                loanPosition.collateralTokenAddressFilled,
                msg.sender,
                loanPosition.collateralTokenAmountFilled
            )) {
                revert("BZxLoanHealth::changeCollateral: BZxVault.withdrawToken old collateral failed");
            }
        }

        loanPosition.collateralTokenAddressFilled = collateralTokenFilled;
        loanPosition.collateralTokenAmountFilled = collateralTokenAmountFilled;

        if (! OracleInterface(oracleAddresses[loanOrder.oracleAddress]).didChangeCollateral(
            loanOrder,
            loanPosition,
            gasUsed // initial used gas, collected in modifier
        )) {
            revert("BZxLoanHealth::changeCollateral: OracleInterface.didChangeCollateral failed");
        }

        return collateralTokenAmountFilled;
    }

    /// @dev Allows the trader to return the position/loan token to increase their escrowed balance
    /// @dev This should be used by the trader if they've withdraw an overcollateralized loan
    /// @dev If depositTokenAddress is not the correct token, it will be traded to the correct token using the oracle.
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param depositTokenAddress The address of the position token being returned
    /// @param depositAmount The amount of position token to deposit.
    /// @return True on success
    function depositPosition(
        bytes32 loanOrderHash,
        address depositTokenAddress,
        uint256 depositAmount)
        external
        nonReentrant
        tracksGas
        returns (bool)
    {
        require(depositAmount > 0, "BZxLoanHealth::depositPosition: depositAmount too low");
        
        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.loanTokenAddress == address(0)) {
            revert("BZxLoanHealth::depositPosition: loanOrder.loanTokenAddress == address(0)");
        }

        LoanPosition storage loanPosition = loanPositions[loanPositionsIds[loanOrderHash][msg.sender]];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            revert("BZxLoanHealth::depositPosition: loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active");
        }

        // for now we allow a position deposit prior to loan liquidation
        // require(block.timestamp < loanPosition.loanEndUnixTimestampSec);

        uint256 positionTokenAmountReceived;
        if (depositTokenAddress != loanPosition.positionTokenAddressFilled) {
            // send deposit token directly to the oracle to trade it
            if (!BZxVault(vaultContract).transferTokenFrom(
                depositTokenAddress,
                msg.sender,
                oracleAddresses[loanOrder.oracleAddress],
                depositAmount)) {
                revert("BZxLoanHealth::depositPosition: BZxVault.transferTokenFrom failed");
            }

            uint256 depositTokenAmountUsed;
            (positionTokenAmountReceived, depositTokenAmountUsed) = OracleInterface(oracleAddresses[loanOrder.oracleAddress]).trade(
                depositTokenAddress,
                loanPosition.positionTokenAddressFilled,
                depositAmount,
                MAX_UINT);

            if (positionTokenAmountReceived == 0) {
                revert("BZxLoanHealth::depositPosition: positionTokenAmountReceived == 0");
            }

            if (depositTokenAmountUsed < depositAmount) {
                // left over depositToken needs to be refunded to trader
                if (! BZxVault(vaultContract).withdrawToken(
                    depositTokenAddress,
                    msg.sender,
                    depositAmount.sub(depositTokenAmountUsed)
                )) {
                    revert("BZxLoanHealth::depositPosition: BZxVault.withdrawToken deposit failed");
                }
            }

            loanPosition.positionTokenAmountFilled = loanPosition.positionTokenAmountFilled.add(positionTokenAmountReceived);
        } else {
            // send deposit token to the vault
            if (! BZxVault(vaultContract).depositToken(
                depositTokenAddress,
                msg.sender,
                depositAmount
            )) {
                revert("BZxLoanHealth::depositPosition: BZxVault.depositToken position failed");
            }

            loanPosition.positionTokenAmountFilled = loanPosition.positionTokenAmountFilled.add(depositAmount);
            positionTokenAmountReceived = depositAmount;
        }

        if (! OracleInterface(oracleAddresses[loanOrder.oracleAddress]).didDepositPosition(
            loanOrder,
            loanPosition,
            positionTokenAmountReceived,
            gasUsed // initial used gas, collected in modifier
        )) {
            revert("BZxLoanHealth::depositPosition: OracleInterface.didDepositPosition failed");
        }

        return true;
    }

    /// @dev Allows the trader to withdraw any amount in excess of their loan principal
    /// @dev The trader will only be able to withdraw an amount the keeps the loan at or above initial margin
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param withdrawAmount The amount to withdraw
    /// @return amountWithdrawn The amount withdrawn denominated in positionToken. Can be less than withdrawAmount.
    function withdrawPosition(
        bytes32 loanOrderHash,
        uint256 withdrawAmount)
        external
        nonReentrant
        tracksGas
        returns (uint256 amountWithdrawn)
    {
        LoanOrder memory loanOrder = orders[loanOrderHash];
        LoanPosition storage loanPosition = loanPositions[loanPositionsIds[loanOrderHash][msg.sender]];

        bool isPositive;
        (isPositive,amountWithdrawn,,) = _getPositionOffset(
            loanOrder,
            loanPosition);
        if (amountWithdrawn == 0 || !isPositive) {
            return 0;
        }

        if (block.timestamp >= loanPosition.loanEndUnixTimestampSec) {
            // if a loan has ended, a loan close function should be called
            return 0;
        }

        // Withdraw withdrawAmount or amountWithdrawn, whichever is lessor
        amountWithdrawn = Math.min256(withdrawAmount, amountWithdrawn);

        if (amountWithdrawn > loanPosition.positionTokenAmountFilled)
            amountWithdrawn = loanPosition.positionTokenAmountFilled;

        if (amountWithdrawn == 0) {
            return 0;
        }
        
        // transfer position excess to the trader
        if (! BZxVault(vaultContract).withdrawToken(
            loanPosition.positionTokenAddressFilled,
            msg.sender,
            amountWithdrawn
        )) {
            revert("BZxLoanHealth::withdrawPosition: BZxVault.withdrawToken loan failed");
        }

        // deduct position excess from positionToken balance
        loanPosition.positionTokenAmountFilled = loanPosition.positionTokenAmountFilled.sub(amountWithdrawn);

        if (! OracleInterface(oracleAddresses[loanOrder.oracleAddress]).didWithdrawPosition(
            loanOrder,
            loanPosition,
            amountWithdrawn,
            gasUsed // initial used gas, collected in modifier
        )) {
            revert("BZxLoanHealth::withdrawPosition: OracleInterface.didWithdrawPosition failed");
        }

        emit LogWithdrawPosition(
            loanOrder.loanOrderHash,
            msg.sender,
            amountWithdrawn,
            loanPosition.positionTokenAmountFilled,
            loanPosition.positionId
        );

        return amountWithdrawn;
    }

    /*
    * Constant public functions
    */

    /// @dev Get the current excess or deficit position amount from the loan principal
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param trader The trader of the position
    /// @return isPositive True if there's an surplus, False otherwise
    /// @return positionOffsetAmount The amount of surplus or deficit in positionToken
    /// @return loanOffsetAmount The amount of surplus or deficit in loanToken
    /// @return collateralOffsetAmount The amount of surplus or deficit in collateralToken
    function getPositionOffset(
        bytes32 loanOrderHash,
        address trader)
        public
        view
        returns (bool isPositive, uint256 positionOffsetAmount, uint256 loanOffsetAmount, uint256 collateralOffsetAmount)
    {
        LoanOrder memory loanOrder = orders[loanOrderHash];
        LoanPosition memory loanPosition = loanPositions[loanPositionsIds[loanOrderHash][trader]];

        return _getPositionOffset(
            loanOrder,
            loanPosition);
    }

    /// @param loanOrderHash A unique hash representing the loan order
    /// @param trader The trader of the position
    /// @return netCollateralAmount The amount of collateral escrowed netted to any exceess or deficit
    /// @return interestDepositRemaining The amount of deposited interest that is not yet owed to a lender
    /// @return loanTokenAmountBorrowed The amount of loan token borrowed for the position
    function getTotalEscrow(
        bytes32 loanOrderHash,
        address trader)
        public
        view
        returns (uint256 netCollateralAmount, uint256 interestDepositRemaining, uint256 loanTokenAmountBorrowed)
    {
        uint256 positionId = loanPositionsIds[loanOrderHash][trader];
        LoanOrder memory loanOrder = orders[loanOrderHash];
        LoanPosition memory loanPosition = loanPositions[positionId];
        TraderInterest memory traderInterest = traderLoanInterest[positionId];

        (bool isPositive,,,uint256 collateralOffset) = _getPositionOffset(
            loanOrder,
            loanPosition);

        if (isPositive) {
            netCollateralAmount = loanPosition.collateralTokenAmountFilled.add(collateralOffset);
        } else if (loanPosition.collateralTokenAmountFilled > collateralOffset) {
            netCollateralAmount = loanPosition.collateralTokenAmountFilled.sub(collateralOffset);
        } else {
            netCollateralAmount = 0;
        }

        interestDepositRemaining = loanPosition.loanEndUnixTimestampSec > block.timestamp ? loanPosition.loanEndUnixTimestampSec.sub(block.timestamp).mul(traderInterest.interestOwedPerDay).div(86400) : 0;

        loanTokenAmountBorrowed = loanPosition.loanTokenAmountFilled;
    }

    /*
    * Constant Internal functions
    */
    function _getPositionOffset(
        LoanOrder memory loanOrder,
        LoanPosition memory loanPosition)
        internal
        view
        returns (bool isPositive, uint256 positionOffsetAmount, uint256 loanOffsetAmount, uint256 collateralOffsetAmount)
    {
        if (loanOrder.loanTokenAddress == address(0)) {
            return (false,0,0,0);
        }

        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            return (false,0,0,0);
        }

        (isPositive, positionOffsetAmount, loanOffsetAmount, collateralOffsetAmount) = OracleInterface(oracleAddresses[loanOrder.oracleAddress]).getPositionOffset(loanOrder, loanPosition);
    }

}
