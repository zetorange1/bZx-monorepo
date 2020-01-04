/**
 * Copyright 2017-2020, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.3;
pragma experimental ABIEncoderV2;

import "../openzeppelin-solidity/Math.sol";
import "../proxy/BZxProxiable.sol";
import "../shared/OrderClosingFunctionsForPartial.sol";


interface IWethHelper {
    function claimEther(
        address receiver,
        uint256 amount)
        external
        returns (uint256 claimAmount);
}

contract iTokens_loanManagementFunctions is BZxStorage, BZxProxiable, OrderClosingFunctionsForPartial {
    using SafeMath for uint256;

    constructor() public {}

    function()
        external
    {
        revert("fallback not allowed");
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
        IWethHelper wethHelper = IWethHelper(0x3b5bDCCDFA2a0a1911984F203C19628EeB6036e0);

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
        if (receiver_ == address(0) || receiver_ == address(this)) {
            receiver_ = address(wethHelper);
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
                    require(msg.value >= amountNeeded ||
                        closeAmount > loanPosition.loanTokenAmountFilled, // always indicates full payoff is requested
                        "insufficient ether"
                    );

                    // deposit()
                    uint256 etherDeposit = msg.value > amountNeeded ?
                        amountNeeded :
                        msg.value;
                    (success,) = wethContract.call.value(etherDeposit)("0xd0e30db0");
                    if (success) {
                        success = EIP20(wethContract).transfer(
                            vaultContract,
                            etherDeposit
                        );
                    }
                    require(success, "deposit failed");

                    loanPosition.positionTokenAmountFilled = loanPosition.positionTokenAmountFilled
                        .add(etherDeposit);
                } else {
                    require(BZxVault(vaultContract).depositToken(
                        loanPosition.positionTokenAddressFilled,
                        payer,
                        amountNeeded
                    ), "deposit failed");

                    loanPosition.positionTokenAmountFilled = loanPosition.positionTokenAmountFilled
                        .add(amountNeeded);
                }
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

        if (receiver_ == address(wethHelper)) {
            require(collateralTokenAddress == wethContract &&
                collateralCloseAmount == wethHelper.claimEther(borrower, collateralCloseAmount),
                "withdraw failed"
            );
        }
    }
}
