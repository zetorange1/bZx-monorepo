/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.8;

import "./BZxBridge.sol";


interface IBZx {
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
    function dai() public returns (GemLike);
}

interface SaiJoin {
    function gem() public returns (GemLike);
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
        bytes memory data = abi.encodeWithSignature(
            "_migrateLoan(bytes32,address,uint256)", // TODO
            loanOrderHash, msg.sender, migrationAmount // TODO
        );

        iDai.flashBorrowToken(migrationAmount, address(this), address(this), "", data);
    }

    function _migrateLoan(
        bytes32 loanOrderHash,
        address borrower,
        uint migrationAmount
        // TODO
    )
        public
    {
        GemLike dai = migration.daiJoin().dai();
        
        dai.approve(address(migration), migrationAmount);
        migration.swapDaiToSai(migrationAmount);

        // TODO check allowedValidators

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
