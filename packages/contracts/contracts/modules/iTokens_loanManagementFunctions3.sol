/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.3;
pragma experimental ABIEncoderV2;

import "../openzeppelin-solidity/Math.sol";
import "../proxy/BZxProxiable.sol";

import "../shared/MiscFunctions.sol";

import "../tokens/EIP20.sol";

contract iTokens_loanManagementFunctions3 is BZxStorage, BZxProxiable, MiscFunctions {
    using SafeMath for uint256;

    struct iTokenLoanData {
        bytes32 loanOrderHash;
        uint256 leverageAmount;
        uint256 initialMarginAmount;
        uint256 maintenanceMarginAmount;
        uint256 maxDurationUnixTimestampSec;
        uint256 index;
        uint256 marginPremiumAmount; // unused
        address collateralTokenAddress;
    }

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
        targets[bytes4(keccak256("setLenderIsiTokenBatch(address[],bool[])"))] = _target;
        targets[bytes4(keccak256("updateOrderObjectParamsBatch((bytes32,uint256,uint256,uint256,uint256,uint256,uint256,address)[])"))] = _target;
    }


    function setLenderIsiTokenBatch(
        address[] memory tokens,
        bool[] memory toggles)
        public
        onlyOwner
    {
        require(tokens.length == toggles.length, "count mismatch");

        for (uint256 i=0; i < tokens.length; i++) {
            bytes32 slot = keccak256(abi.encodePacked("LenderIsiToken", tokens[i]));
            bool toggle = toggles[i];
            assembly {
                sstore(slot, toggle)
            }
        }
    }

    function updateOrderObjectParamsBatch(
        iTokenLoanData[] memory loanDataArr)
        public
        returns (bool)
    {
        // only by iTokens and supporting contracts
        require(allowedValidators[address(0)][msg.sender],
            "unauthorized"
        );

        for (uint256 i=0; i < loanDataArr.length; i++) {
            LoanOrder storage loanOrder = orders[loanDataArr[i].loanOrderHash];
            require(loanOrder.loanOrderHash == loanDataArr[i].loanOrderHash, "not found");

            loanOrder.initialMarginAmount = loanDataArr[i].initialMarginAmount;
            loanOrder.maintenanceMarginAmount = loanDataArr[i].maintenanceMarginAmount;
            loanOrder.maxDurationUnixTimestampSec = loanDataArr[i].maxDurationUnixTimestampSec;
        }

        return true;
    }

    /*function refinanceLoan(
        bytes32 loanOrderHash,
        address borrower)
        external
        payable
        tracksGas
        returns (uint256 secondsExtended)
    {
        // only callable by borrower or by iTokens and supporting contracts
        require(
            allowedValidators[address(0)][msg.sender] ||
            (msg.sender == borrower),
            "unauthorized"
        );

        LoanPosition storage loanPosition = loanPositions[loanPositionsIds[loanOrderHash][borrower]];
        LoanOrder memory loanOrder = orders[loanOrderHash];
        require(loanPosition.active &&
            loanPosition.loanTokenAmountFilled != 0 &&
            loanOrder.loanTokenAddress != address(0) &&
            block.timestamp < loanPosition.loanEndUnixTimestampSec,
            "loan not open"
        );

        require(loanOrder.maxDurationUnixTimestampSec == 0, "indefinite-term only");

        address lender = orderLender[loanOrder.loanOrderHash];
        bytes32 slot = keccak256(abi.encodePacked("LenderIsiToken", lender));
        bool isiToken;
        assembly {
            isiToken := sload(slot)
        }
        require(isiToken, "invalid lender");



                    // fixed-term loan, so need to query iToken for latest variable rate
            uint256 newRate = ILoanToken(lender).borrowInterestRate();
            require(newRate != 0, "invalid rate");



        LenderInterest storage oracleInterest = lenderOracleInterest[lender][loanOrder.oracleAddress][loanOrder.interestTokenAddress];
        TraderInterest storage traderInterest = traderLoanInterest[loanPosition.positionId];

        // update lender interest
        _payInterestForOracle(
            oracleInterest,
            lender,
            loanOrder.oracleAddress,
            loanOrder.interestTokenAddress,
            true // sendToOracle
        );

        if (traderInterest.interestUpdatedDate != 0 && traderInterest.interestOwedPerDay != 0) {
            traderInterest.interestPaid = block.timestamp
                .sub(traderInterest.interestUpdatedDate)
                .mul(traderInterest.interestOwedPerDay)
                .div(86400)
                .add(traderInterest.interestPaid);
        }

        // deposit interest
        if (useCollateral) {
            address oracle = oracleAddresses[loanOrder.oracleAddress];

            uint256 sourceTokenAmountUsed;
            if (loanPosition.collateralTokenAddressFilled == loanOrder.interestTokenAddress) {
                require (loanPosition.collateralTokenAmountFilled >= depositAmount, "can't fill interest");
                sourceTokenAmountUsed = depositAmount;
            } else {
                require (BZxVault(vaultContract).withdrawToken(
                    loanPosition.collateralTokenAddressFilled,
                    oracle,
                    loanPosition.collateralTokenAmountFilled),
                    "withdraw failed"
                );
                uint256 destTokenAmountReceived;
                (destTokenAmountReceived, sourceTokenAmountUsed) = OracleInterface(oracle).trade(
                    loanPosition.collateralTokenAddressFilled,
                    loanOrder.interestTokenAddress,
                    loanPosition.collateralTokenAmountFilled,
                    depositAmount
                );
                require (destTokenAmountReceived >= depositAmount && destTokenAmountReceived != MAX_UINT, "can't fill interest");
            }

            loanPosition.collateralTokenAmountFilled = loanPosition.collateralTokenAmountFilled
                .sub(sourceTokenAmountUsed);

            // ensure the loan is still healthy
            require (!OracleInterface(oracle)
                .shouldLiquidate(loanOrder, loanPosition),
                "unhealthy"
            );
        } else {
            if (msg.value != 0) {
                require(msg.value >= depositAmount, "insufficient ether");

                // deposit()
                (bool success,) = wethContract.call.value(depositAmount)("0xd0e30db0");
                if (success) {
                    success = EIP20(wethContract).transfer(
                        vaultContract,
                        depositAmount
                    );
                }
                if (success && msg.value > depositAmount) {
                    (success,) = msg.sender.call.value(msg.value - depositAmount)("");
                }
                require(success, "deposit failed");
            } else {
                require(BZxVault(vaultContract).depositToken(
                    loanOrder.interestTokenAddress,
                    payer,
                    depositAmount
                ), "deposit failed");
            }
        }

        secondsExtended = depositAmount
            .mul(86400)
            .div(traderInterest.interestOwedPerDay);

        loanPosition.loanEndUnixTimestampSec = loanPosition.loanEndUnixTimestampSec
            .add(secondsExtended);

        uint256 maxDuration = loanPosition.loanEndUnixTimestampSec
            .sub(block.timestamp);

        // loan term has to at least be 24 hours
        require(maxDuration >= 86400, "loan too short");

        traderInterest.interestDepositTotal = traderInterest.interestDepositTotal.add(depositAmount);
        traderInterest.interestUpdatedDate = block.timestamp;

        tokenInterestOwed[lender][loanOrder.interestTokenAddress] = tokenInterestOwed[lender][loanOrder.interestTokenAddress].add(depositAmount);
    }*/
}
