/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.8;

import "./BZxBridge.sol";


interface CToken {
    function borrowBalanceCurrent(address account) external returns (uint);
    function symbol() external view returns (string memory);

    function redeem(uint redeemAmount) external returns (uint);
    function transferFrom(address src, address dst, uint amount) external returns (bool);
}

interface CErc20 {
    function underlying() external view returns (address);

    function repayBorrowBehalf(address borrower, uint repayAmount) external returns (uint);
}

interface CEther {
    function repayBorrowBehalf(address borrower) external payable;
}

contract CompoundBridge is BZxBridge
{
    enum Error {
        NO_ERROR
    }

    address cEther;
    mapping(address => address) public tokens; // cToken => iToken

    event NewToken(address cToken, address iToken);

    constructor(address[] memory cTokens, address[] memory iTokens, address _cEther) public {
        setTokens(cTokens, iTokens);
        setCEther(_cEther);
    }

    function migrateLoan(
        address loanToken, // cToken address
        uint loanAmount, // the amount of underlying tokens being migrated
        address[] calldata assets, // collateral cToken addresses
        uint[] calldata amounts, // collateral amounts, should be approved to transfer
        uint[] calldata collateralAmounts // will be used for borrow on bZx
    )
        external
    {
        require(loanAmount > 0, "Invalid loan amount");
        require(assets.length > 0, "Invalid assets");
        require(assets.length == amounts.length, "Invalid amounts");
        require(amounts.length == collateralAmounts.length, "Invalid collateral amounts");

        CToken loanCToken = CToken(loanToken);
        require(loanCToken.borrowBalanceCurrent(msg.sender) >= loanAmount);

        LoanTokenInterface iToken = LoanTokenInterface(tokens[loanToken]);

        iToken.flashBorrowToken(
            loanAmount,
            address(this),
            address(this),
            "",
            abi.encodeWithSignature(
                "_migrateLoan(address,address,uint256,address[],uint256[],uint256[])",
                msg.sender, loanToken, loanAmount, assets, amounts, collateralAmounts
            )
        );
    }

    function _migrateLoan(
        address borrower,
        address loanToken,
        uint loanAmount,
        address[] calldata assets,
        uint[] calldata amounts,
        uint[] calldata collateralAmounts
    )
        external
    {
        LoanTokenInterface iToken = LoanTokenInterface(tokens[loanToken]);
        address loanTokenAddress = iToken.loanTokenAddress();
        uint err;

        if (loanToken == cEther) {
            CEther(loanToken).repayBorrowBehalf.value(loanAmount)(borrower);
        } else {
            ERC20(loanTokenAddress).approve(loanToken, loanAmount);
            err = CErc20(loanToken).repayBorrowBehalf(borrower, loanAmount);
            require(err == uint(Error.NO_ERROR), "Repay borrow behalf failed");
        }

        address _borrower = borrower;
        for (uint i = 0; i < assets.length; i++) {
            CToken cToken = CToken(assets[i]);
            uint amount = amounts[i];
            uint collateralAmount = collateralAmounts[i];

            require(cToken.transferFrom(_borrower, address(this), amount));

            err = cToken.redeem(amount);
            requireThat(err == uint(Error.NO_ERROR), "Redeem failed", i);

            LoanTokenInterface iTokenCollateral = LoanTokenInterface(tokens[address(cToken)]);

            uint excess = amount - collateralAmount;

            if (address(cToken) == cEther) {
                iToken.borrowTokenFromDeposit.value(collateralAmount)(
                    0,
                    leverageAmount,
                    initialLoanDuration,
                    0,
                    _borrower,
                    address(0),
                    loanData
                );
                if (excess > 0) {
                    iTokenCollateral.mintWithEther.value(excess)(_borrower);
                }
            } else {
                address underlying = CErc20(address(cToken)).underlying();
                ERC20(underlying).approve(address(iToken), collateralAmount);
                iToken.borrowTokenFromDeposit(
                    0,
                    leverageAmount,
                    initialLoanDuration,
                    collateralAmount,
                    _borrower,
                    underlying,
                    loanData
                );
                if (excess > 0) {
                    ERC20(underlying).approve(address(iTokenCollateral), excess);
                    iTokenCollateral.mint(_borrower, excess);
                }
            }
        }

        // repaying flash borrow
        ERC20(loanTokenAddress).transfer(address(iToken), loanAmount);
    }

    function setCEther(address _cEther) public onlyOwner
    {
        require(keccak256(abi.encodePacked(CToken(cEther).symbol())) == keccak256(abi.encodePacked("cETH")));
        cEther = _cEther;
    }

    function setTokens(address[] memory cTokens, address[] memory iTokens) public onlyOwner
    {
        require(cTokens.length == iTokens.length);

        for (uint i = 0; i < cTokens.length; i++) {
            tokens[cTokens[i]] = iTokens[i];
            emit NewToken(cTokens[i], iTokens[i]);
        }
    }
}
