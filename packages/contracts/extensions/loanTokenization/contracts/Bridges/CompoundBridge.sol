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
    mapping(address => address) public iTokens; // cToken => iToken
    mapping(address => address) public tokens; // cToken => underlying

    event NewToken(address cToken, address iToken);

    constructor(address[] memory cTokens, address[] memory _iTokens, address _cEther) public {
        setCEther(_cEther);
        setTokens(cTokens, _iTokens);
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

        LoanTokenInterface iToken = LoanTokenInterface(iTokens[loanToken]);

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
        LoanTokenInterface iToken = LoanTokenInterface(iTokens[loanToken]);
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

            LoanTokenInterface iCollateral = LoanTokenInterface(iTokens[address(cToken)]);

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
                    iCollateral.mintWithEther.value(excess)(_borrower);
                }
            } else {
                address underlying = tokens[address(cToken)];
                ERC20(underlying).approve(address(iToken), collateralAmount);
                iToken.borrowTokenFromDeposit(
                    0,
                    leverageAmount,
                    initialLoanDuration,
                    collateralAmount,
                    _borrower, // TODO bridge won't be a receiver and hence won't be able to repay flash borrow
                    underlying,
                    loanData
                );
                if (excess > 0) {
                    ERC20(underlying).approve(address(iCollateral), excess);
                    iCollateral.mint(_borrower, excess);
                }
            }
        }

        // repaying flash borrow
        ERC20(loanTokenAddress).transfer(address(iToken), loanAmount);
    }

    function setCEther(address _cEther) public onlyOwner
    {
        require(isEqual(CToken(cEther).symbol(), "cETH"), "invalid cEther address");
        cEther = _cEther;
    }

    function setTokens(address[] memory cTokens, address[] memory _iTokens) public onlyOwner
    {
        require(cTokens.length == _iTokens.length);

        for (uint i = 0; i < cTokens.length; i++) {
            address cToken = cTokens[i];
            LoanTokenInterface iToken = LoanTokenInterface(_iTokens[i]);
            if (cToken != cEther) {
                tokens[cToken] = CErc20(cToken).underlying();
                requireThat(
                    tokens[cToken] == iToken.loanTokenAddress(),
                    "Incompatible tokens",
                    i
                );
            } else {
                require(isEqual(iToken.symbol(), "iETH"), "Incompatible ETH tokens");
            }
            iTokens[cToken] = _iTokens[i];
            emit NewToken(cTokens[i], _iTokens[i]);
        }
    }

    function isEqual(string memory a, string memory b) private pure returns (bool)
    {
        return keccak256(abi.encodePacked(a)) == keccak256(abi.encodePacked(b));
    }
}
