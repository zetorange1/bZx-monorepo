/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./BZxBridge.sol";


interface IBZx {
    struct LoanOrder {
        uint256 loanTokenAmount;
    }

    function getLoanOrder(bytes32 loanOrderHash) external view returns (LoanOrder memory);

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
    {
        IBZx.LoanOrder memory order = iBZx.getLoanOrder(loanOrderHash);
        if (migrationAmount == 0) {
            migrationAmount = order.loanTokenAmount;
        } else {
            requireThat(
                order.loanTokenAmount >= migrationAmount,
                "migrationAmount should be lower than or equal to",
                order.loanTokenAmount
            );
        }

        bytes memory data = abi.encodeWithSignature(
            "_migrateLoan(bytes32,address,uint256)",
            loanOrderHash, msg.sender, migrationAmount
        );

        iDai.flashBorrowToken(migrationAmount, address(this), address(this), "", data);
    }

    function _migrateLoan(
        bytes32 loanOrderHash,
        address borrower,
        uint migrationAmount
    )
        public
    {
        GemLike dai = migration.daiJoin().dai();

        dai.approve(address(migration), migrationAmount);
        migration.swapDaiToSai(migrationAmount);

        migration.saiJoin().gem().approve(address(migration), migrationAmount);
        uint256 collateralCloseAmount;
        address collateralTokenAddress;
        (, collateralCloseAmount, collateralTokenAddress) = iBZx.paybackLoanAndClose(
            loanOrderHash, borrower, address(this), address(this), migrationAmount
        );

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
