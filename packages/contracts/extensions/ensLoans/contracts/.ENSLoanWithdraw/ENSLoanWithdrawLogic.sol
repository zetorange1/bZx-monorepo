/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.8;

import "../shared/openzeppelin-solidity/SafeMath.sol";
import "./ENSLoanWithdrawStorage.sol";


interface IBZx {
    function withdrawCollateralForBorrower(
        bytes32 loanOrderHash,
        uint256 withdrawAmount,
        address trader,
        address receiver)
        external
        returns (
            uint256 amountWithdrawn,
            address collateralTokenAddress
        );
}

interface ILoanToken {
    function loanOrderHashes(
        uint256 leverageAmount)
        external
        view
        returns (bytes32 loanOrderHash);
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

interface IWethHelper {
    function claimEther(
        address receiver,
        uint256 amount)
        external
        returns (uint256 claimAmount);
}

contract ENSLoanWithdrawLogic is ENSLoanWithdrawStorage {
    using SafeMath for uint256;

    function()
        external
        payable
    {
        if (msg.sender == wethContract) {
            return;
        }
        require(msg.value == 0, "no eth allowed");

        bytes32 loanOrderHash = ILoanToken(loanTokenLender).loanOrderHashes(
            2 ether // leverageAmount
        );
        require(loanOrderHash != 0, "invalid hash");

        (uint256 amountWithdrawn, address collateralTokenAddress) = IBZx(bZxContract).withdrawCollateralForBorrower(
            loanOrderHash,
            MAX_UINT,       // withdrawAmount
            msg.sender,     // trader
            address(this)   // receiver
        );
        require(amountWithdrawn != 0, "no withdrawal");

        if (collateralTokenAddress == wethContract) {
            IWethHelper wethHelper = IWethHelper(0x3b5bDCCDFA2a0a1911984F203C19628EeB6036e0);

            iBasicToken(collateralTokenAddress).transfer(
                address(wethHelper),
                amountWithdrawn
            );

            require(amountWithdrawn == wethHelper.claimEther(msg.sender, amountWithdrawn),
                "eth transfer failed"
            );
        } else {
            iBasicToken(collateralTokenAddress).transfer(
                msg.sender,
                amountWithdrawn
            );
        }

        assembly {
            mstore(0, amountWithdrawn)
            return(0, 32)
        }
    }

    function initialize(
        address _bZxContract,
        address _bZxVault,
        address _loanTokenLender,
        address _loanTokenAddress,
        address _userContractRegistry,
        address _wethContract,
        address _ensLoanOwner)
        public
        onlyOwner
    {
        bZxContract = _bZxContract;
        bZxVault = _bZxVault;
        loanTokenLender = _loanTokenLender;
        loanTokenAddress = _loanTokenAddress;
        userContractRegistry = _userContractRegistry;
        wethContract = _wethContract;
        ensLoanOwner = _ensLoanOwner;
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
