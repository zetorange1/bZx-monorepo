/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.8;

import "../shared/openzeppelin-solidity/SafeMath.sol";
import "./ENSLoanOpenerStorage.sol";


interface ILoanToken {
    function borrowTokenFromDeposit(
        uint256 borrowAmount,
        uint256 leverageAmount,
        uint256 initialLoanDuration,
        uint256 collateralTokenSent,
        address borrower,
        address collateralTokenAddress,
        bytes calldata loanData)
        external
        payable
        returns (bytes32 loanOrderHash);

    function getBorrowAmountForDeposit(
        uint256 depositAmount,
        uint256 leverageAmount,
        uint256 initialLoanDuration,
        address collateralTokenAddress)
        external
        view
        returns (uint256 borrowAmount);
}

interface iBasicToken {
    function transfer(
        address to,
        uint256 value)
        external
        returns (bool);

    function approve(
        address spender,
        uint256 value)
        external
        returns (bool);

    function balanceOf(
        address user)
        external
        view
        returns (uint256 balance);

    function allowance(
        address owner,
        address spender)
        external
        view
        returns (uint256 value);
}

interface iENSLoanOwner {
    function setupUser(
        address user)
        external;
}

contract ENSLoanOpenerLogic is ENSLoanOpenerStorage {
    using SafeMath for uint256;

    function()
        external
        payable
    {
        iENSLoanOwner(ensLoanOwner).setupUser(msg.sender);

        if (msg.value != 0) {
            uint256 borrowAmount = ILoanToken(loanTokenLender).getBorrowAmountForDeposit(
                msg.value,              // depositAmount,
                4 ether,                // leverageAmount,
                initialLoanDuration,
                address(0)              // collateralTokenAddress,
            ).mul(125).div(150);        // 150% collateralization

            bytes32 loanOrderHash = ILoanToken(loanTokenLender).borrowTokenFromDeposit.value(msg.value)(
                borrowAmount,
                4 ether,                // leverageAmount
                initialLoanDuration,
                0,                      // collateralTokenSent,
                msg.sender,             // borrower,
                address(0),             // collateralTokenAddress
                ""                      // loanData
            );

            assembly {
                mstore(0, loanOrderHash)
                return(0, 32)
            }
        }
    }

    function initialize(
        address _bZxContract,
        address _bZxVault,
        address _loanTokenLender,
        address _ensLoanOwner)
        public
        onlyOwner
    {
        bZxContract = _bZxContract;
        bZxVault = _bZxVault;
        loanTokenLender = _loanTokenLender;
        ensLoanOwner = _ensLoanOwner;
    }

    function setInitialLoanDuration(
        uint256 _value)
        public
        onlyOwner
    {
        initialLoanDuration = _value;
    }

    function recoverEther(
        address receiver,
        uint256 amount)
        public
        onlyOwner
    {
        uint256 balance = address(this).balance;
        if (balance < amount)
            amount = balance;

        (bool success, ) = receiver.call.value(amount)("");
        require(success, "transfer failed");
    }

    function recoverToken(
        address tokenAddress,
        address receiver,
        uint256 amount)
        public
        onlyOwner
    {
        iBasicToken token = iBasicToken(tokenAddress);

        uint256 balance = token.balanceOf(address(this));
        if (balance < amount)
            amount = balance;

        require(token.transfer(
            receiver,
            amount),
            "transfer failed"
        );
    }
}
