/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./BZxBridge.sol";


interface IBZx {
    struct BasicLoanData {
        bytes32 loanOrderHash;
        address loanTokenAddress;
        address collateralTokenAddress;
        uint256 loanTokenAmountFilled;
        uint256 positionTokenAmountFilled;
        uint256 collateralTokenAmountFilled;
        uint256 interestOwedPerDay;
        uint256 interestDepositRemaining;
        uint256 initialMarginAmount;
        uint256 maintenanceMarginAmount;
        uint256 currentMarginAmount;
        uint256 maxDurationUnixTimestampSec;
        uint256 loanEndUnixTimestampSec;
    }

    function wethContract() external view returns (address);
    function vaultContract() external view returns (address);
    
    function getBasicLoanData(
        bytes32 loanOrderHash,
        address borrower)
        external
        view
        returns (BasicLoanData memory loanData);

    function debugToggleProtocolDelegateApproved(address, bool) external;

    function paybackLoanAndClose(
        bytes32 loanOrderHash,
        address borrower,
        address payer,
        address receiver,
        uint256 closeAmount
    )
        external
        returns
    (
        uint256 actualCloseAmount,
        uint256 collateralCloseAmount,
        address collateralTokenAddress
    );
}

interface GemLike {
    function approve(address, uint) external;
    function transfer(address, uint) external;
    function balanceOf(address) external returns (uint);
}

interface DaiJoin {
    function dai() external returns (GemLike);
}

interface SaiJoin {
    function gem() external returns (GemLike);
}

interface ScdMcdMigration {
    function daiJoin() external returns (DaiJoin);
    function saiJoin() external returns (SaiJoin);

    function swapDaiToSai(uint wad) external;
    function swapSaiToDai(uint wad) external;
}

interface WETH {
    function deposit() external payable;
}

contract SAIToDAIBridge is BZxBridge
{
    IBZx public iBZx;
    LoanTokenInterface public iDai;
    ScdMcdMigration public migration;

    constructor(
        address _iBZx,
        address _iDai,
        address _migration
    ) public {
        iBZx = IBZx(_iBZx);
        iDai = LoanTokenInterface(_iDai);
        migration = ScdMcdMigration(_migration);
    }

    function migrateLoan(
        bytes32 loanOrderHash,
        uint migrationAmount
    )
        public
        payable
    {
        IBZx.BasicLoanData memory order = iBZx.getBasicLoanData(loanOrderHash, msg.sender);
        require(order.loanTokenAddress == address(migration.saiJoin().gem()), "Loan token should be SAI");
        
        if (migrationAmount == 0) {
            migrationAmount = order.loanTokenAmountFilled;
        }
        
        require(migrationAmount <= order.loanTokenAmountFilled, "Invalid migration amount");

        bytes memory data = abi.encodeWithSignature(
            "_migrateLoan(bytes32,address,uint256)",
            loanOrderHash, msg.sender, migrationAmount
        );

        iDai.flashBorrowToken.value(msg.value)(migrationAmount, address(this), address(this), "", data);
    }

    function _migrateLoan(
        bytes32 loanOrderHash,
        address payable borrower,
        uint migrationAmount
    )
        public
        payable
    {
        GemLike dai = migration.daiJoin().dai();
        GemLike sai = migration.saiJoin().gem();

        dai.approve(address(migration), migrationAmount);
        migration.swapDaiToSai(migrationAmount);

        sai.approve(iBZx.vaultContract(), migrationAmount);
        uint256 collateralCloseAmount;
        address collateralTokenAddress;

        (, collateralCloseAmount, collateralTokenAddress) = iBZx.paybackLoanAndClose(
            loanOrderHash, borrower, address(this), address(this), migrationAmount
        );

        if (msg.value > 0) {
            if (collateralTokenAddress == iBZx.wethContract()) {
                collateralCloseAmount += msg.value;
                WETH(iBZx.wethContract()).deposit.value(msg.value)();
            } else {
                borrower.transfer(msg.value);
            }
        }

        ERC20(collateralTokenAddress).approve(address(iDai), collateralCloseAmount);

        iDai.borrowTokenFromDeposit(
            migrationAmount,
            leverageAmount,
            initialLoanDuration,
            collateralCloseAmount,
            borrower,
            address(this),
            collateralTokenAddress,
            ""
        );

        dai.transfer(address(iDai), migrationAmount);
    }
}
