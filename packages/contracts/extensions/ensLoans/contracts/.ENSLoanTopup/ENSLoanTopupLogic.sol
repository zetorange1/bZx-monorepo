/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.8;

import "../shared/openzeppelin-solidity/SafeMath.sol";
import "./ENSLoanTopupStorage.sol";


interface IBZx {
    function depositCollateralForBorrower(
        bytes32 loanOrderHash,
        address borrower,
        address payer,
        address depositTokenAddress,
        uint256 depositAmount)
        external
        returns (bool);
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

interface iWETH {
    function deposit() external payable;
    function withdraw(uint256 wad) external;
}

contract ENSLoanTopupLogic is ENSLoanTopupStorage {
    using SafeMath for uint256;

    function()
        external
        payable
    {
        if (msg.sender == wethContract) {
            return;
        }
        require(msg.value != 0, "no eth sent");

        bytes32 loanOrderHash = ILoanToken(loanTokenLender).loanOrderHashes(
            26985473425953342135791518606717287597326611559540027600454822645050577529548 // uint256(keccak256(abi.encodePacked(2 ether, wethContract)))
        );
        require(loanOrderHash != 0, "invalid hash");

        iWETH(wethContract).deposit.value(msg.value)();

        require(IBZx(bZxContract).depositCollateralForBorrower(
            loanOrderHash,
            msg.sender,         // borrower
            address(this),      // payer,
            wethContract,       // depositTokenAddress
            msg.value           // depositAmount
        ), "deposit failed");
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

        iBasicToken token = iBasicToken(wethContract);
        uint256 tempAllowance = token.allowance(address(this), bZxVault);
        if (tempAllowance != MAX_UINT) {
            if (tempAllowance != 0) {
                // reset approval to 0
                require(token.approve(bZxVault, 0), "token approval reset failed");
            }

            require(token.approve(bZxVault, MAX_UINT), "token approval failed");
        }
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
