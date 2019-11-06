/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.8;

import "../shared/openzeppelin-solidity/ERC20.sol";
import "../shared/openzeppelin-solidity/Ownable.sol";


interface CToken {
    function borrowBalanceCurrent(address account) external returns (uint);
    function symbol() external view returns (string memory);
    function balanceOfUnderlying(address owner) external returns (uint);

    function redeem(uint redeemAmount) external returns (uint);
    function transferFrom(address src, address dst, uint256 amount) external returns (bool);
}

interface CErc20 {
    function underlying() external view returns (address);

    function repayBorrowBehalf(address borrower, uint repayAmount) external returns (uint);
}

interface CEther {
    function repayBorrowBehalf(address borrower) external payable;
}

interface Comptroller {
    function getAssetsIn(address account) external view returns (CToken[] memory);
    function isComptroller() external view returns (bool);
}

interface LoanToken {
    function mintWithEther(address receiver) external payable returns (uint256 mintAmount);
    function mint(address receiver, uint256 depositAmount) external returns (uint256 mintAmount);

    function flashBorrowToken(
        uint256 borrowAmount,
        address borrower,
        address target,
        bytes calldata callData
    )
        external
        payable;

    function borrowTokenFromDeposit(
        uint256 borrowAmount,
        uint256 leverageAmount,
        uint256 initialLoanDuration,    // duration in seconds
        uint256 collateralTokenSent,    // set to 0 if sending ETH
        address borrower,
        address collateralTokenAddress, // address(0) means ETH and ETH must be sent with the call
        bytes calldata loanData // arbitrary order data
    )
        external
        payable
        returns (bytes32 loanOrderHash);
}

contract CompoundBridge is Ownable {

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
        uint[] calldata amounts // collateral amounts, should be approved to transfer
    )
    external
    {
        require(loanAmount > 0);
        require(assets.length > 0);
        require(assets.length == amounts.length);

        CToken loanCToken = CToken(loanToken);
        require(loanCToken.borrowBalanceCurrent(msg.sender) >= loanAmount); // TODO not sure about this one

        // TODO verify collateralization ratio
        // TODO verify if collateral may be redeemed (or just revert if something went wrong?)

        LoanToken iToken = LoanToken(tokens[loanToken]);

        iToken.flashBorrowToken(
            loanAmount,
            address(this),
            address(this),
            abi.encodeWithSignature(
                "_migrateLoan(address,uint,address[],uint[])",
                loanToken, loanAmount, assets, amounts
            )
        );
    }

    function _migrateLoan(
        address loanToken,
        uint loanAmount,
        address[] calldata assets,
        uint[] calldata amounts,
        bool isETHLoan
    )
    external
    {
        LoanToken iToken = LoanToken(tokens[loanToken]);
        uint err;

        if (loanToken == cEther) {
            CEther(loanToken).repayBorrowBehalf.value(loanAmount)(msg.sender);
        } else {
            err = CErc20(loanToken).repayBorrowBehalf(msg.sender, loanAmount);
            require(err == uint(Error.NO_ERROR), "Repay borrow behalf failed");
        }

        for (uint i = 0; i < assets.length; i++) {
            CToken cToken = CToken(assets[i]);
            require(cToken.transferFrom(msg.sender, address(this), amounts[i]));

            uint balanceBefore = cToken.balanceOfUnderlying(address(this));

            err = cToken.redeem(amounts[i]);
            require(err == uint(Error.NO_ERROR), "Redeem failed");

            uint amountUnderlying = balanceBefore - cToken.balanceOfUnderlying(address(this));
            bytes memory loanData;

            if (assets[i] == cEther) {
                iToken.borrowTokenFromDeposit.value(amountUnderlying)(
                    0,
                    2000000000000000000,
                    7884000,
                    0,
                    msg.sender,
                    address(0),
                    loanData
                );
            } else {
                iToken.borrowTokenFromDeposit(
                    0,
                    2000000000000000000,
                    7884000,
                    amountUnderlying,
                    msg.sender,
                    CErc20(address(cToken)).underlying(),
                    loanData
                );
            }
        }

        // TODO If there is excess collateral above a certain level, the rest is used to mint iTokens...
        // TODO borrowAmount param of borrowTokenFromDeposit should be manipulated for this
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
