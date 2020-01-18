/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./BZxBridge.sol";


interface IBZx {
    struct LoanOrder {
        address loanTokenAddress;
        address collateralTokenAddress;
        uint256 loanTokenAmount;
    }

    function wethContract() external view returns (address);
    function vaultContract() external view returns (address);
    function getLoanOrder(bytes32 loanOrderHash) external view returns (LoanOrder memory);

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
        IBZx.LoanOrder memory order = iBZx.getLoanOrder(loanOrderHash);
        require(order.loanTokenAddress == address(migration.saiJoin().gem()), "Loan token should be SAI");

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

        uint bridgeSaiBalance = sai.balanceOf(address(this));
        if (bridgeSaiBalance > 0) {
            sai.approve(address(migration), bridgeSaiBalance);
            migration.swapSaiToDai(bridgeSaiBalance);
            dai.transfer(borrower, bridgeSaiBalance);
        }

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
