/**
 * Copyright 2017-2020, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.8;

import "./BZxBridge.sol";


interface LendingPoolAddressesProvider {
    function getLendingPool() external view returns (address);
    function getLendingPoolCore() external view returns (address payable);
}

interface LendingPoolCore {
    function getUserBorrowBalances(address _reserve, address _user) external view returns (uint256, uint256 compoundedBalance, uint256);
}

interface LendingPool {
    function repay(address _reserve, uint256 _amount, address payable _onBehalfOf) external payable;
}

interface AToken {
    function underlyingAssetAddress() external view returns (address);
}

contract AaveBridge is BZxBridge
{
    LendingPoolAddressesProvider public lpap;

    address public aEther;
    mapping(address => address) public iTokens; // aToken => iToken

    event NewToken(address aToken, address iToken);

    constructor(address _lpap, address[] memory aTokens, address[] memory _iTokens, address _aEther) public {
        lpap = LendingPoolAddressesProvider(_lpap);
        aEther = _aEther;
        setTokens(aTokens, _iTokens);
    }

    function migrateLoan(
        address loanToken, // aToken address
        uint loanAmount, // the amount of underlying tokens being migrated
        address[] memory assets, // collateral aToken addresses
        uint[] memory amounts, // collateral amounts, should be approved to transfer
        uint[] memory collateralAmounts, // will be used for borrow on bZx
        uint[] memory borrowAmounts // the amounts of underlying tokens for each new Torque loan
    )
        public
    {
        require(loanAmount > 0, "Invalid loan amount");
        require(assets.length > 0, "Invalid assets");
        require(assets.length == amounts.length, "Invalid amounts");
        require(amounts.length == collateralAmounts.length, "Invalid collateral amounts");
        require(collateralAmounts.length == borrowAmounts.length, "Invalid borrow amounts length");

        uint totalBorrowAmount;
        for (uint i = 0; i < borrowAmounts.length; i++) {
            totalBorrowAmount += borrowAmounts[i];
        }
        require(totalBorrowAmount == loanAmount, "Invalid borrow amounts value");

        address reserve = AToken(loanToken).underlyingAssetAddress();
        uint compoundedBalance;
        (, compoundedBalance, ) = LendingPoolCore(lpap.getLendingPoolCore()).getUserBorrowBalances(reserve, msg.sender);
        require(compoundedBalance >= loanAmount, "Invalid borrow balance");

        LoanTokenInterface iToken = LoanTokenInterface(iTokens[loanToken]);

        iToken.flashBorrowToken(
            loanAmount,
            address(this),
            address(this),
            "",
            abi.encodeWithSignature(
                "_migrateLoan(address,address,uint256,address[],uint256[],uint256[],uint256[])",
                msg.sender, loanToken, loanAmount, assets, amounts, collateralAmounts, borrowAmounts
            )
        );
    }

    function() external payable {}

    function _migrateLoan(
        address payable borrower,
        address loanToken,
        uint loanAmount,
        address[] memory assets,
        uint[] memory amounts,
        uint[] memory collateralAmounts,
        uint[] memory borrowAmounts
    )
        public
    {
        LendingPool lp = LendingPool(lpap.getLendingPool());
        LoanTokenInterface iToken = LoanTokenInterface(iTokens[loanToken]);
        address reserve = AToken(loanToken).underlyingAssetAddress();

        if (loanToken == aEther) {
            lp.repay.value(loanAmount)(reserve, loanAmount, borrower);
        } else {
            ERC20(reserve).approve(lpap.getLendingPoolCore(), loanAmount);
            lp.repay(reserve, loanAmount, borrower);
        }

        address _borrower = borrower;
        for (uint i = 0; i < assets.length; i++) {
            address aToken = assets[i];
            uint amount = amounts[i];
            uint collateralAmount = collateralAmounts[i];
            uint excess = amount - collateralAmount;

            ERC20(aToken).transferFrom(_borrower, address(this), amount);

            LoanTokenInterface iCollateral = LoanTokenInterface(iTokens[aToken]);

            if (aToken == aEther) {
                iToken.borrowTokenFromDeposit.value(collateralAmount)(
                    borrowAmounts[i],
                    leverageAmount,
                    initialLoanDuration,
                    0,
                    _borrower,
                    address(this),
                    address(0),
                    loanData
                );
                if (excess > 0) {
                    iCollateral.mintWithEther.value(excess)(_borrower);
                }
            } else {
                address underlying = AToken(aToken).underlyingAssetAddress();
                ERC20(underlying).approve(address(iToken), collateralAmount);
                iToken.borrowTokenFromDeposit(
                    borrowAmounts[i],
                    leverageAmount,
                    initialLoanDuration,
                    collateralAmount,
                    _borrower,
                    address(this),
                    underlying,
                    loanData
                );
                if (excess > 0) {
                    ERC20(underlying).approve(address(iCollateral), excess);
                    iCollateral.mint(_borrower, excess);
                }
            }
        }

        // repay flash borrow
        ERC20(reserve).transfer(address(iToken), loanAmount);
    }

    function setTokens(address[] memory aTokens, address[] memory _iTokens) public onlyOwner
    {
        require(aTokens.length == _iTokens.length, "Invalid tokens");

        for (uint i = 0; i < aTokens.length; i++) {
            address aToken = aTokens[i];
            LoanTokenInterface iToken = LoanTokenInterface(_iTokens[i]);
            if (aToken != aEther) {
                requireThat(
                    AToken(aToken).underlyingAssetAddress() == iToken.loanTokenAddress(),
                    "Incompatible tokens",
                    i
                );
            } else {
                requireThat(iToken.wethContract() == iToken.loanTokenAddress(), "Incompatible ETH tokens", i);
            }

            iTokens[aToken] = _iTokens[i];
            emit NewToken(aTokens[i], _iTokens[i]);
        }
    }
}
