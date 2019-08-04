/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.3;
pragma experimental ABIEncoderV2;

import "../openzeppelin-solidity/SafeMath.sol";
import "../proxy/BZxProxiable.sol";
import "../storage/BZxStorage.sol";
import "../BZxVault.sol";
import "../oracle/OracleInterface.sol";


contract OrderTaking_takeOrderFromiToken is BZxStorage, BZxProxiable {
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
        targets[bytes4(keccak256("takeOrderFromiToken(bytes32,address,address,address,uint256,uint256,uint256[4])"))] = _target;
    }

    // assumption: loan and interest are the same token
    function takeOrderFromiToken(
        bytes32 loanOrderHash,          // existing loan order hash
        address trader,                 // borrower/trader
        address collateralTokenAddress, // collateral token
        address tradeTokenAddress,      // trade token
        uint256 newInterestRate,        // new loan interest rate
        uint256 newLoanAmount,          // new loan size
        uint256[4] calldata sentAmounts)
            // interestInitialAmount: interestAmount sent to determine initial loan length (this is included in one of the below)
            // loanTokenSent: loanTokenAmount + interestAmount + any extra
            // collateralTokenSent: collateralAmountRequired + any extra
            // tradeTokenSent: tradeTokenAmount (optional)
        external
        nonReentrant
        tracksGas
        returns (uint256)
    {
        // only callable by iTokens
        require(allowedValidators[address(0)][msg.sender], "not authorized");

        require(newLoanAmount != 0 && sentAmounts[1] >= newLoanAmount, "loanTokenSent insufficient");

        // update order
        LoanOrder storage loanOrder = orders[loanOrderHash];
        loanOrder.loanTokenAmount = loanOrder.loanTokenAmount.add(newLoanAmount);
        loanOrder.interestAmount = loanOrder.loanTokenAmount.mul(newInterestRate).div(365).div(10**20);

        // initialize loan
        LoanPosition storage loanPosition = loanPositions[
            _initializeLoan(
                loanOrder,
                trader,
                collateralTokenAddress,
                tradeTokenAddress,
                newLoanAmount
            )
        ];

        // get required collateral
        uint256 collateralAmountRequired = _getRequiredCollateral(
            loanOrder.loanTokenAddress,
            collateralTokenAddress,
            oracleAddresses[loanOrder.oracleAddress],
            newLoanAmount,
            loanOrder.initialMarginAmount
        );
        if (loanOrder.loanTokenAddress == loanPosition.positionTokenAddressFilled) { // withdrawOnOpen == true
            collateralAmountRequired = collateralAmountRequired
                .add(
                    collateralAmountRequired
                        .mul(10**20)
                        .div(loanOrder.initialMarginAmount)
                    );
        }

        // get required interest
        uint256 interestAmountRequired = _initializeInterest(
            loanOrder,
            loanPosition,
            newLoanAmount,
            sentAmounts[0] // interestInitialAmount
        );

        // handle transfer and swaps
        _handleTransfersAndSwaps(
            loanOrder,
            loanPosition,
            newLoanAmount,
            interestAmountRequired,
            collateralAmountRequired,
            sentAmounts[1], // loanTokenSent,
            sentAmounts[2], // collateralTokenSent
            sentAmounts[3]  // tradeTokenSent
        );

        return newLoanAmount;
    }

    function _initializeLoan(
        LoanOrder memory loanOrder,
        address trader,
        address collateralTokenAddress,
        address tradeTokenAddress,
        uint256 newLoanAmount)
        internal
        returns (uint256 positionId)
    {
        positionId = loanPositionsIds[loanOrder.loanOrderHash][trader];
        LoanPosition memory loanPosition = loanPositions[positionId];
        if (loanPosition.active) {
            // trader has already filled part of the loan order previously and that loan is still active
            require (block.timestamp < loanPosition.loanEndUnixTimestampSec, "loan has ended");

            require(tradeTokenAddress != address(0) || loanOrder.loanTokenAddress == loanPosition.positionTokenAddressFilled, "no withdrawals when in trade");
            loanPosition.loanTokenAmountFilled = loanPosition.loanTokenAmountFilled.add(newLoanAmount);
        } else {
            // trader has not previously filled part of this loan or the previous fill is inactive

            positionId = uint(keccak256(abi.encodePacked(
                loanOrder.loanOrderHash,
                orderPositionList[loanOrder.loanOrderHash].length,
                trader,
                msg.sender, // lender
                block.timestamp
            )));

            loanPosition = LoanPosition({
                trader: trader,
                collateralTokenAddressFilled: collateralTokenAddress,
                positionTokenAddressFilled: tradeTokenAddress == address(0) ? loanOrder.loanTokenAddress : tradeTokenAddress,
                loanTokenAmountFilled: newLoanAmount,
                loanTokenAmountUsed: 0,
                collateralTokenAmountFilled: 0, // set later
                positionTokenAmountFilled: 0, // set later, unless tradeTokenAddress == address(0) (withdrawOnOpen)
                loanStartUnixTimestampSec: block.timestamp,
                loanEndUnixTimestampSec: 0, // set later
                active: true,
                positionId: positionId
            });

            if (!orderListIndex[loanOrder.loanOrderHash][trader].isSet) {
                orderList[trader].push(loanOrder.loanOrderHash);
                orderListIndex[loanOrder.loanOrderHash][trader] = ListIndex({
                    index: orderList[trader].length-1,
                    isSet: true
                });
            }

            orderPositionList[loanOrder.loanOrderHash].push(positionId);

            positionList.push(PositionRef({
                loanOrderHash: loanOrder.loanOrderHash,
                positionId: positionId
            }));
            positionListIndex[positionId] = ListIndex({
                index: positionList.length-1,
                isSet: true
            });

            loanPositionsIds[loanOrder.loanOrderHash][trader] = positionId;
        }

        if (orderLender[loanOrder.loanOrderHash] == address(0)) {
            // send lender (msg.sender)
            orderLender[loanOrder.loanOrderHash] = msg.sender;
            orderList[msg.sender].push(loanOrder.loanOrderHash);
            orderListIndex[loanOrder.loanOrderHash][msg.sender] = ListIndex({
                index: orderList[msg.sender].length-1,
                isSet: true
            });
        }
        orderFilledAmounts[loanOrder.loanOrderHash] = orderFilledAmounts[loanOrder.loanOrderHash].add(newLoanAmount);

        loanPositions[positionId] = loanPosition;
    }

    function _initializeInterest(
        LoanOrder memory loanOrder,
        LoanPosition storage loanPosition,
        uint256 newLoanAmount,
        uint256 interestInitialAmount) // ignored for fixed-term loans
        internal
        returns (uint256 interestAmountRequired)
    {
        LenderInterest storage oracleInterest = lenderOracleInterest[msg.sender][loanOrder.oracleAddress][loanOrder.interestTokenAddress];
        TraderInterest storage traderInterest = traderLoanInterest[loanPosition.positionId];

        // update lender interest
        _payInterestForOracleAsLender(
            oracleInterest,
            loanOrder.oracleAddress,
            loanOrder.interestTokenAddress,
            true // sendToOracle
        );

        uint256 owedPerDay = SafeMath.div(
            SafeMath.mul(newLoanAmount, loanOrder.interestAmount),
            loanOrder.loanTokenAmount
        );
        oracleInterest.interestOwedPerDay = oracleInterest.interestOwedPerDay.add(owedPerDay);

        uint256 maxDuration = loanOrder.maxDurationUnixTimestampSec;
        uint256 interestTime = block.timestamp;

        if (maxDuration == 0 && interestInitialAmount != 0) {
            // indefinite-term loan

            loanPosition.loanEndUnixTimestampSec = interestInitialAmount
                .mul(86400)
                .div(owedPerDay)
                .add(interestTime);

            interestAmountRequired = interestInitialAmount;
        } else {
            // fixed-term loan

            if (maxDuration == 0) {
                maxDuration = 2419200; // 28 days
            }

            if (loanPosition.loanEndUnixTimestampSec == 0) {
                loanPosition.loanEndUnixTimestampSec = block.timestamp.add(maxDuration);
            }

            interestAmountRequired = loanPosition.loanEndUnixTimestampSec
                .sub(interestTime)
                .mul(owedPerDay)
                .div(86400);
        }

        traderInterest.interestDepositTotal = traderInterest.interestDepositTotal.add(interestAmountRequired);
        traderInterest.interestUpdatedDate = interestTime;
        traderInterest.interestOwedPerDay = traderInterest.interestOwedPerDay.add(owedPerDay);
        traderInterest.interestPaid = interestTime
            .sub(traderInterest.interestUpdatedDate)
            .mul(traderInterest.interestOwedPerDay)
            .div(86400)
            .add(traderInterest.interestPaid);
    }

    function _getRequiredCollateral(
        address loanTokenAddress,
        address collateralTokenAddress,
        address oracleAddress,
        uint256 newLoanAmount,
        uint256 marginAmount)
        internal
        view
        returns (uint256 collateralTokenAmount)
    {
        if (loanTokenAddress == collateralTokenAddress) {
            collateralTokenAmount = newLoanAmount
                .mul(marginAmount)
                .div(10**20);
        } else {
            (uint256 sourceToDestRate, uint256 sourceToDestPrecision,) = OracleInterface(oracleAddresses[oracleAddress]).getTradeData(
                collateralTokenAddress,
                loanTokenAddress,
                MAX_UINT // get best rate
            );
            collateralTokenAmount = newLoanAmount
                .mul(sourceToDestPrecision)
                .div(sourceToDestRate)
                .mul(marginAmount)
                .div(10**20);
        }
        if (collateralTokenAmount == 0) {
            revert("_getRequiredCollateral: collateralTokenAmount == 0");
        }
    }

    function _handleTransfersAndSwaps(
        LoanOrder memory loanOrder,
        LoanPosition memory loanPosition,
        uint256 newLoanAmount,
        uint256 interestAmountRequired,
        uint256 collateralAmountRequired,
        uint256 loanTokenUsable,
        uint256 collateralTokenUsable,
        uint256 tradeTokenUsable)
        internal
    {
        if (tradeTokenUsable != 0) {
            if (loanPosition.collateralTokenAddressFilled == loanPosition.positionTokenAddressFilled) {
                collateralTokenUsable = collateralTokenUsable
                    .add(tradeTokenUsable);
            } else if (loanOrder.loanTokenAddress == loanPosition.positionTokenAddressFilled) {
                loanTokenUsable = loanTokenUsable
                    .add(tradeTokenUsable);
            }
        }

        // deposit collateral token, unless same as loan token
        if (collateralTokenUsable != 0) {
            if (loanPosition.collateralTokenAddressFilled == loanOrder.loanTokenAddress) {
                loanTokenUsable = loanTokenUsable
                    .add(collateralTokenUsable);
                collateralTokenUsable = 0;
            }
        }

        // withdraw loan token if needed
        if (loanOrder.loanTokenAddress == loanPosition.positionTokenAddressFilled) { // withdrawOnOpen == true
            loanTokenUsable = loanTokenUsable
                .sub(newLoanAmount);
        }

        address oracle = oracleAddresses[loanOrder.oracleAddress];
        uint256 destTokenAmountReceived;
        uint256 sourceTokenAmountUsed;

        if (interestAmountRequired > loanTokenUsable) {
            require (collateralTokenUsable != 0, "can't fill interest");

            // spend collateral token to fill interest required
            uint256 interestTokenNeeded = interestAmountRequired - loanTokenUsable;
            if (!BZxVault(vaultContract).withdrawToken(
                loanPosition.collateralTokenAddressFilled,
                oracle,
                collateralTokenUsable)) {
                revert("BZxVault.withdrawToken failed");
            }
            (destTokenAmountReceived, sourceTokenAmountUsed) = OracleInterface(oracle).trade(
                loanPosition.collateralTokenAddressFilled,
                loanOrder.loanTokenAddress,
                collateralTokenUsable,
                interestTokenNeeded
            );

            require (destTokenAmountReceived >= interestTokenNeeded, "can't fill interest");
            collateralTokenUsable = collateralTokenUsable.sub(sourceTokenAmountUsed);
            loanTokenUsable = loanTokenUsable.add(destTokenAmountReceived);
        }

        // interestAmountRequired is reserved from usable loan amount
        loanTokenUsable = loanTokenUsable.sub(interestAmountRequired);

        if (loanPosition.collateralTokenAddressFilled == loanOrder.loanTokenAddress) {
            // collateralAmountRequired is reserved from usable loan amount (collateralTokenUsable is zero until now)
            loanTokenUsable = loanTokenUsable.sub(collateralAmountRequired);
            collateralTokenUsable = collateralAmountRequired;
        }

        if (loanOrder.loanTokenAddress != loanPosition.positionTokenAddressFilled) { // withdrawOnOpen == false

            require(loanTokenUsable >= newLoanAmount, "can't fill position");

            if (loanPosition.collateralTokenAddressFilled == loanOrder.loanTokenAddress) {
                if (loanTokenUsable > newLoanAmount) {
                    collateralTokenUsable = collateralTokenUsable
                        .add(loanTokenUsable - newLoanAmount);
                    loanTokenUsable = newLoanAmount;
                }
            }

            if (loanTokenUsable != 0) {
                if (!BZxVault(vaultContract).withdrawToken(
                    loanOrder.loanTokenAddress,
                    oracle,
                    loanTokenUsable)) {
                    revert("BZxVault.withdrawToken failed");
                }
                (destTokenAmountReceived, sourceTokenAmountUsed) = OracleInterface(oracle).trade(
                    loanOrder.loanTokenAddress,
                    loanPosition.positionTokenAddressFilled,
                    loanTokenUsable,
                    MAX_UINT
                );

                loanTokenUsable = loanTokenUsable
                    .sub(sourceTokenAmountUsed);
            }

            if (tradeTokenUsable != 0) {
                destTokenAmountReceived = destTokenAmountReceived
                    .add(tradeTokenUsable);
            }

            uint256 newPositionTokenAmount;
            if (loanPosition.collateralTokenAddressFilled == loanPosition.positionTokenAddressFilled) {
                newPositionTokenAmount = collateralAmountRequired.mul(10**20);
                newPositionTokenAmount = newPositionTokenAmount.div(loanOrder.initialMarginAmount);

                collateralTokenUsable = collateralTokenUsable.add(destTokenAmountReceived);
                collateralTokenUsable = collateralTokenUsable.sub(newPositionTokenAmount);
            } else {
                newPositionTokenAmount = destTokenAmountReceived;
            }

            loanPosition.positionTokenAmountFilled = loanPosition.positionTokenAmountFilled
                .add(newPositionTokenAmount);
        }

        require (collateralTokenUsable >= collateralAmountRequired, "collateral insufficient");
        loanPosition.collateralTokenAmountFilled = loanPosition.collateralTokenAmountFilled
            .add(collateralTokenUsable);

        if (loanTokenUsable != 0) {
            if (loanOrder.loanTokenAddress == loanPosition.positionTokenAddressFilled) {
                // since withdrawOnOpen == true, we pay back some of the borrowed token with loan token excess
                loanPosition.positionTokenAmountFilled = loanPosition.positionTokenAmountFilled
                    .add(loanTokenUsable);
            } else {
                revert("surplus loan token");
            }
        }

        loanPositions[loanPosition.positionId] = loanPosition;
    }

    // same function as in MiscFunctions.sol
    function _payInterestForOracleAsLender(
        LenderInterest memory oracleInterest,
        address oracleAddress,
        address interestTokenAddress,
        bool sendToOracle)
        internal
        returns (uint256)
    {
        address oracleRef = oracleAddresses[oracleAddress];

        uint256 interestOwedNow = 0;
        if (oracleInterest.interestOwedPerDay > 0 && oracleInterest.interestPaidDate > 0 && interestTokenAddress != address(0)) {
            interestOwedNow = block.timestamp.sub(oracleInterest.interestPaidDate).mul(oracleInterest.interestOwedPerDay).div(86400);

            if (interestOwedNow > 0) {
                oracleInterest.interestPaid = oracleInterest.interestPaid.add(interestOwedNow);

                if (sendToOracle) {
                    // send the interest to the oracle for further processing
                    if (!BZxVault(vaultContract).withdrawToken(
                        interestTokenAddress,
                        oracleRef,
                        interestOwedNow
                    )) {
                        revert("_payInterestForOracle: BZxVault.withdrawToken failed");
                    }

                    // calls the oracle to signal processing of the interest (ie: paying the lender, retaining fees)
                    if (!OracleInterface(oracleRef).didPayInterestByLender(
                        msg.sender, // lender
                        interestTokenAddress,
                        interestOwedNow,
                        gasUsed // initial used gas, collected in modifier
                    )) {
                        revert("_payInterestForOracle: OracleInterface.didPayInterestByLender failed");
                    }
                } else {
                    if (!BZxVault(vaultContract).withdrawToken(
                        interestTokenAddress,
                        msg.sender, // lender
                        interestOwedNow
                    )) {
                        revert("_payInterestForOracle: BZxVault.withdrawToken interest failed");
                    }
                }
            }
        }

        oracleInterest.interestPaidDate = block.timestamp;
        lenderOracleInterest[msg.sender][oracleAddress][interestTokenAddress] = oracleInterest;

        return interestOwedNow;
    }
}
