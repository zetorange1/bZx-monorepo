/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.8;

import "../shared/openzeppelin-solidity/SafeMath.sol";
import "./ENSLoanRepayStorage.sol";


interface IBZx {
    function paybackLoanAndClose(
        bytes32 loanOrderHash,
        address borrower,
        address payer,
        address receiver,
        uint256 closeAmount)
        external
        returns (
            uint256 actualCloseAmount,
            uint256 collateralCloseAmount,
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

interface iWETH {
    function deposit() external payable;
    function withdraw(uint256 wad) external;
}

interface iUserContract {
    function transferAsset(
        address asset,
        address payable to,
        uint256 amount)
        external
        returns (uint256 transferAmount);
}

interface iUserContractRegistry {
    function userContracts(
        address user)
        external
        view
        returns (iUserContract);
}

contract ENSLoanRepayLogic is ENSLoanRepayStorage {
    using SafeMath for uint256;

    function()
        external
        payable
    {
        if (msg.sender == wethContract) {
            return;
        }
        require(msg.value == 0, "no eth allowed");

        iUserContract userContract = iUserContractRegistry(userContractRegistry).userContracts(msg.sender);
        require(address(userContract) != address(0), "contract not found");

        uint256 beforeBalance = iBasicToken(loanTokenAddress).balanceOf(address(this));

        uint256 transferAmount = userContract.transferAsset(
            loanTokenAddress,
            address(uint256(address(this))),
            0
        );
        //require(transferAmount != 0, "no deposit"); <-- allow no deposit

        bytes32 loanOrderHash = ILoanToken(loanTokenLender).loanOrderHashes(
            4 ether // leverageAmount
        );
        require(loanOrderHash != 0, "invalid hash");

        iBasicToken token = iBasicToken(loanTokenAddress);
        uint256 tempAllowance = token.allowance(address(this), bZxVault);
        if (tempAllowance != MAX_UINT) {
            if (tempAllowance != 0) {
                // reset approval to 0
                require(token.approve(bZxVault, 0), "token approval reset failed");
            }

            require(token.approve(bZxVault, MAX_UINT), "token approval failed");
        }

        (uint256 actualCloseAmount, uint256 collateralCloseAmount, address collateralTokenAddress) = IBZx(bZxContract).paybackLoanAndClose(
            loanOrderHash,
            msg.sender,        // borrower
            address(this),     // payer
            address(this),     // receiver
            transferAmount     // closeAmount
        );
        require(actualCloseAmount != 0, "loan not closed");

        if (collateralCloseAmount != 0) {
            if (collateralTokenAddress == wethContract) {
                iWETH(wethContract).withdraw(collateralCloseAmount);
                (bool success, ) = msg.sender.call.value(collateralCloseAmount)("");
                require(success, "eth transfer failed");
            } else {
                iBasicToken(collateralTokenAddress).transfer(
                    msg.sender,
                    collateralCloseAmount
                );
            }
        }

        uint256 afterBalance = iBasicToken(loanTokenAddress).balanceOf(address(this));

        if (afterBalance > beforeBalance) {
            iBasicToken(loanTokenAddress).transfer(
                msg.sender,
                afterBalance - beforeBalance
            );
        } else if (afterBalance < beforeBalance) {
            revert("too much spent");
        }

        assembly {
            mstore(0, actualCloseAmount)
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

        iBasicToken token = iBasicToken(loanTokenAddress);
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
