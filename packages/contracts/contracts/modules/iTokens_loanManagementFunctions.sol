/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.3;
pragma experimental ABIEncoderV2;

import "../openzeppelin-solidity/Math.sol";
import "../proxy/BZxProxiable.sol";
import "../shared/OrderClosingFunctionsForPartial.sol";


contract iTokens_loanManagementFunctions is BZxStorage, BZxProxiable, OrderClosingFunctionsForPartial {
    using SafeMath for uint256;

    constructor() public {}

    function()
        external
        payable
    {
        require(msg.sender == wethContract, "fallback not allowed");
    }

    function initialize(
        address _target)
        public
        onlyOwner
    {
        targets[bytes4(keccak256("paybackLoanAndClose(bytes32,address,address,address,uint256)"))] = _target;
    }


    function paybackLoanAndClose(
        bytes32 loanOrderHash,
        address borrower,
        address payer,
        address receiver,
        uint256 closeAmount)
        external
        payable
        tracksGas
        returns (
            uint256 actualCloseAmount,
            uint256 collateralCloseAmount,
            address collateralTokenAddress
        )
    {
        // only callable by borrower or by iTokens and supporting contracts
        require(
            allowedValidators[address(0)][msg.sender] ||
            (msg.sender == borrower && msg.sender == payer),
            "unauthorized"
        );

        // require(closeAmount != 0, "closeAmount is 0"); <-- allow 0 closeAmoumt

        LoanPosition storage loanPosition = loanPositions[loanPositionsIds[loanOrderHash][borrower]];
        LoanOrder memory loanOrder = orders[loanOrderHash];
        require(loanPosition.active &&
            loanPosition.loanTokenAmountFilled != 0 &&
            loanOrder.loanTokenAddress != address(0),
            "loan not open"
        );

        require(loanPosition.positionTokenAddressFilled == loanOrder.loanTokenAddress, "margin position open");
        require(msg.value == 0 || loanPosition.positionTokenAddressFilled == wethContract, "wrong asset sent");

        address receiver_ = receiver;
        if (receiver_ == address(0)) {
            receiver_ = address(this);
        }

        if (closeAmount != 0) {
            bool success;

            // can't close more than the full principal
            actualCloseAmount = Math.min256(
                loanPosition.loanTokenAmountFilled,
                closeAmount
            );

            uint256 amountNeeded;

            if (actualCloseAmount == loanPosition.loanTokenAmountFilled) {
                // settle interest early; the later call to _settleInterest will be returned
                (amountNeeded,) = _settleInterest(
                    loanOrder,
                    loanPosition,
                    loanPosition.loanTokenAmountFilled, // closeAmount
                    true, // sendToOracle
                    true  // refundToCollateral
                );
                if (amountNeeded != 0) {
                    loanPosition.positionTokenAmountFilled = loanPosition.positionTokenAmountFilled
                        .add(amountNeeded);
                }
            }

            amountNeeded = actualCloseAmount > loanPosition.positionTokenAmountFilled ?
                actualCloseAmount - loanPosition.positionTokenAmountFilled :
                0;
            if (amountNeeded != 0) {
                if (msg.value != 0) {
                    require(msg.value >= amountNeeded, "insufficient ether");

                    // deposit()
                    (success,) = wethContract.call.value(amountNeeded)("0xd0e30db0");
                    if (success) {
                        success = EIP20(wethContract).transfer(
                            vaultContract,
                            amountNeeded
                        );
                    }
                    require(success, "deposit failed");
                } else {
                    require(BZxVault(vaultContract).depositToken(
                        loanPosition.positionTokenAddressFilled,
                        payer,
                        amountNeeded
                    ), "deposit failed");
                }
                loanPosition.positionTokenAmountFilled = loanPosition.positionTokenAmountFilled
                    .add(amountNeeded);
            }
            if (msg.value > amountNeeded) {
                (success,) = msg.sender.call.value(msg.value - amountNeeded)("");
                require(success, "refund ether failed");
            }
        } else {
            actualCloseAmount = loanPosition.positionTokenAmountFilled;
        }

        (actualCloseAmount, collateralCloseAmount, collateralTokenAddress) = _closeLoanPartially(
            [
                borrower,
                receiver_,
                oracleAddresses[loanOrder.oracleAddress]
            ],
            [
                actualCloseAmount,
                0, // collateralCloseAmount (calculated later)
                0, // marginAmountBeforeClose (calculated later)
                gasUsed // initial used gas, collected in modifier
            ],
            loanOrder,
            loanPosition,
            false // ensureHealthy
        );

        if (receiver_ == address(this)) {
            require(collateralTokenAddress == wethContract, "withdraw failed");

            // withdraw(uint256)
            (bool success,) = wethContract.call(
                abi.encodeWithSelector(
                    0x2e1a7d4d, // withdraw(uint256)
                    collateralCloseAmount
                )
            );
            if (success) {
                (success, ) = borrower.call.value(collateralCloseAmount)("");
            }
            require(success, "withdraw failed");
        }
    }
}
