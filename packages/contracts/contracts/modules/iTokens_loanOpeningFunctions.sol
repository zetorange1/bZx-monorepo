/**
 * Copyright 2017-2020, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.3;
pragma experimental ABIEncoderV2;

import "../openzeppelin-solidity/SafeMath.sol";
import "../proxy/BZxProxiable.sol";
import "../storage/BZxStorage.sol";
import "../BZxVault.sol";
import "../oracle/OracleInterface.sol";


contract iTokens_loanOpeningFunctions is BZxStorage, BZxProxiable {
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
        targets[bytes4(keccak256("takeOrderFromiToken(bytes32,address[4],uint256[7],bytes)"))] = _target;
        targets[bytes4(keccak256("getRequiredCollateral(address,address,address,uint256,uint256)"))] = _target;
        targets[bytes4(keccak256("getBorrowAmount(address,address,address,uint256,uint256)"))] = _target;
    }

    // assumption: loan and interest are the same token
    function takeOrderFromiToken(
        bytes32 loanOrderHash, // existing loan order hash
        address[4] calldata sentAddresses,
            // trader: borrower/trader
            // collateralTokenAddress: collateral token
            // tradeTokenAddress: trade token
            // receiver: receiver of funds (address(0) assumes trader address)
        uint256[7] calldata sentAmounts,
            // newInterestRate: new loan interest rate
            // newLoanAmount: new loan size (principal from lender)
            // interestInitialAmount: interestAmount sent to determine initial loan length (this is included in one of the below)
            // loanTokenSent: loanTokenAmount + interestAmount + any extra
            // collateralTokenSent: collateralAmountRequired + any extra
            // tradeTokenSent: tradeTokenAmount (optional)
            // withdrawalAmount: Actual amount sent to borrower (can't exceed newLoanAmount)
        bytes calldata loanData)
        external
        nonReentrant
        tracksGas
        returns (uint256)
    {
        // only callable by iTokens
        require(allowedValidators[address(0)][msg.sender], "not authorized");

        require(sentAmounts[6] <= sentAmounts[1], "invalid withdrawal");
        require(sentAmounts[1] != 0 && sentAmounts[3] >= sentAmounts[1], "loanTokenSent insufficient");

        // update order
        LoanOrder storage loanOrder = orders[loanOrderHash];
        require(loanOrder.maxDurationUnixTimestampSec != 0 ||
            sentAmounts[2] != 0, // interestInitialAmount
            "invalid interest");

        loanOrder.loanTokenAmount = loanOrder.loanTokenAmount.add(sentAmounts[1]);

        loanOrder.interestAmount = loanOrder.loanTokenAmount
            .mul(sentAmounts[0]);
        loanOrder.interestAmount = loanOrder.interestAmount
            .div(365 * 10**20);

        // initialize loan
        LoanPosition storage loanPosition = loanPositions[
            _initializeLoan(
                loanOrder,
                sentAddresses[0], // trader
                sentAddresses[1], // collateralTokenAddress
                sentAddresses[2], // tradeTokenAddress,
                sentAmounts[1]    // newLoanAmount
            )
        ];

        address oracle = oracleAddresses[loanOrder.oracleAddress];

        // get required collateral
        uint256 collateralAmountRequired = _getRequiredCollateral(
            loanOrder.loanTokenAddress,
            sentAddresses[1], // collateralTokenAddress
            oracle,
            sentAmounts[6],  // withdrawalAmount
            loanOrder.initialMarginAmount
        );
        require(collateralAmountRequired != 0, "collateral is 0");
        if (loanOrder.loanTokenAddress == loanPosition.positionTokenAddressFilled) { // withdrawOnOpen == true
            uint256 collateralInitialPremium = collateralAmountRequired
                .mul(10**20)
                .div(loanOrder.initialMarginAmount);

            /*if (sentAmounts[7] != 0) { // marginPremiumAmount
                collateralInitialPremium = collateralInitialPremium
                    .mul(sentAmounts[7])
                    .div(10**20)
                    .add(collateralInitialPremium);
            }*/

            collateralAmountRequired = collateralAmountRequired
                .add(collateralInitialPremium);
        }

        // get required interest
        uint256 interestAmountRequired = _initializeInterest(
            loanOrder,
            loanPosition,
            sentAmounts[1], // newLoanAmount,
            sentAmounts[2]  // interestInitialAmount
        );

        // handle transfer and swaps
        _handleTransfersAndSwaps(
            loanOrder,
            loanPosition,
            interestAmountRequired,
            collateralAmountRequired,
            sentAmounts,
            loanData
        );

        require (sentAmounts[6] == sentAmounts[1] || // newLoanAmount
            !OracleInterface(oracle).shouldLiquidate(
                loanOrder,
                loanPosition
            ),
            "unhealthy position"
        );

        return sentAmounts[1]; // newLoanAmount
    }

    function getRequiredCollateral(
        address loanTokenAddress,
        address collateralTokenAddress,
        address oracleAddress,
        uint256 newLoanAmount,
        uint256 marginAmount)
        public
        view
        returns (uint256 collateralAmountRequired)
    {
        if (marginAmount != 0) {
            collateralAmountRequired = _getRequiredCollateral(
                loanTokenAddress,
                collateralTokenAddress,
                oracleAddress,
                newLoanAmount,
                marginAmount
            );
        }
    }

    function getBorrowAmount(
        address loanTokenAddress,
        address collateralTokenAddress,
        address oracleAddress,
        uint256 collateralTokenAmount,
        uint256 marginAmount)
        public
        view
        returns (uint256 borrowAmount)
    {
        if (marginAmount != 0) {
            if (loanTokenAddress == collateralTokenAddress) {
                borrowAmount = collateralTokenAmount
                    .mul(10**20)
                    .div(marginAmount);
            } else {
                (uint256 sourceToDestRate, uint256 sourceToDestPrecision,) = OracleInterface(oracleAddresses[oracleAddress]).getTradeData(
                    collateralTokenAddress,
                    loanTokenAddress,
                    MAX_UINT // get best rate
                );
                if (sourceToDestPrecision != 0) {
                    borrowAmount = collateralTokenAmount
                        .mul(10**20)
                        .div(marginAmount)
                        .mul(sourceToDestRate)
                        .div(sourceToDestPrecision);
                }
            }
        }
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

            require(collateralTokenAddress == loanPosition.collateralTokenAddressFilled, "wrong collateral");

            if (tradeTokenAddress == address(0)) {
                require(loanOrder.loanTokenAddress == loanPosition.positionTokenAddressFilled, "no withdrawals when in trade");
            } else {
                require(tradeTokenAddress == loanPosition.positionTokenAddressFilled, "wrong trade");
            }

            loanPosition.loanTokenAmountFilled = loanPosition.loanTokenAmountFilled.add(newLoanAmount);
        } else {
            // trader has not previously filled part of this loan or the previous fill is inactive

            positionId = uint256(keccak256(abi.encodePacked(
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
            loanOrder.interestTokenAddress
        );

        uint256 maxDuration = loanOrder.maxDurationUnixTimestampSec;

        uint256 previousDepositRemaining;
        if (maxDuration == 0 && loanPosition.loanEndUnixTimestampSec != 0) {
            previousDepositRemaining = loanPosition.loanEndUnixTimestampSec
                .sub(block.timestamp) // block.timestamp < loanEndUnixTimestampSec was confirmed earlier
                .mul(traderInterest.interestOwedPerDay)
                .div(86400);
        }

        uint256 owedPerDay = SafeMath.div(
            SafeMath.mul(newLoanAmount, loanOrder.interestAmount),
            loanOrder.loanTokenAmount
        );
        oracleInterest.interestOwedPerDay = oracleInterest.interestOwedPerDay.add(owedPerDay);

        if (traderInterest.interestUpdatedDate != 0 && traderInterest.interestOwedPerDay != 0) {
            traderInterest.interestPaid = block.timestamp
                .sub(traderInterest.interestUpdatedDate)
                .mul(traderInterest.interestOwedPerDay)
                .div(86400)
                .add(traderInterest.interestPaid);
        }
        traderInterest.interestOwedPerDay = traderInterest.interestOwedPerDay.add(owedPerDay);

        if (maxDuration == 0) {
            // indefinite-term loan

            // interestInitialAmount != 0 was confirmed earlier
            loanPosition.loanEndUnixTimestampSec = interestInitialAmount
                .add(previousDepositRemaining)
                .mul(86400)
                .div(traderInterest.interestOwedPerDay)
                .add(block.timestamp);

            // update maxDuration
            maxDuration = loanPosition.loanEndUnixTimestampSec
                .sub(block.timestamp);

            // loan term has to at least be 24 hours
            require(maxDuration >= 86400, "loan too short");

            interestAmountRequired = interestInitialAmount;
        } else {
            // fixed-term loan

            if (loanPosition.loanEndUnixTimestampSec == 0) {
                loanPosition.loanEndUnixTimestampSec = block.timestamp.add(maxDuration);
            }

            interestAmountRequired = loanPosition.loanEndUnixTimestampSec
                .sub(block.timestamp)
                .mul(owedPerDay)
                .div(86400);
        }

        traderInterest.interestDepositTotal = traderInterest.interestDepositTotal.add(interestAmountRequired);
        traderInterest.interestUpdatedDate = block.timestamp;

        tokenInterestOwed[orderLender[loanOrder.loanOrderHash]][loanOrder.interestTokenAddress] = tokenInterestOwed[orderLender[loanOrder.loanOrderHash]][loanOrder.interestTokenAddress].add(interestAmountRequired);
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
            return newLoanAmount
                .mul(marginAmount)
                .div(10**20);
        } else {
            (uint256 sourceToDestRate, uint256 sourceToDestPrecision,) = OracleInterface(oracleAddresses[oracleAddress]).getTradeData(
                collateralTokenAddress,
                loanTokenAddress,
                MAX_UINT // get best rate
            );
            if (sourceToDestRate != 0) {
                return newLoanAmount
                    .mul(sourceToDestPrecision)
                    .div(sourceToDestRate)
                    .mul(marginAmount)
                    .div(10**20);
            } else {
                return 0;
            }
        }
    }

    function _handleTransfersAndSwaps(
        LoanOrder memory loanOrder,
        LoanPosition memory loanPosition,
        uint256 interestAmountRequired,
        uint256 collateralAmountRequired,
        uint256[7] memory sentAmounts,
        bytes memory /* loanData */)
        internal
    {
        uint256 loanTokenUsable = sentAmounts[3];
        uint256 collateralTokenUsable = sentAmounts[4];

        if (sentAmounts[5] != 0) { // tradeTokenUsable
            if (loanPosition.collateralTokenAddressFilled == loanPosition.positionTokenAddressFilled) {
                collateralTokenUsable = collateralTokenUsable
                    .add(sentAmounts[5]); // tradeTokenUsable
            } else if (loanOrder.loanTokenAddress == loanPosition.positionTokenAddressFilled) {
                loanTokenUsable = loanTokenUsable
                    .add(sentAmounts[5]); // tradeTokenUsable
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
                .sub(sentAmounts[6]); // withdrawalAmount
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
            require (destTokenAmountReceived >= interestTokenNeeded && destTokenAmountReceived != MAX_UINT, "can't fill interest");

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

            require(sentAmounts[5] != 0 || // tradeTokenUsable
                (collateralTokenUsable != 0 && loanPosition.collateralTokenAddressFilled == loanPosition.positionTokenAddressFilled) ||
                loanTokenUsable >= sentAmounts[1], // newLoanAmount
                "can't fill position");

            if (loanPosition.collateralTokenAddressFilled == loanOrder.loanTokenAddress) {
                if (loanTokenUsable > sentAmounts[1]) { // newLoanAmount
                    collateralTokenUsable = collateralTokenUsable
                        .add(loanTokenUsable - sentAmounts[1]); // newLoanAmount
                    loanTokenUsable = sentAmounts[1]; // newLoanAmount
                }
            }

            destTokenAmountReceived = 0;
            sourceTokenAmountUsed = 0;

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
                require(destTokenAmountReceived != 0 && destTokenAmountReceived != MAX_UINT, "destTokenAmountReceived == 0");

                loanTokenUsable = loanTokenUsable
                    .sub(sourceTokenAmountUsed);
            }

            if (sentAmounts[5] != 0) { // tradeTokenUsable
                destTokenAmountReceived = destTokenAmountReceived
                    .add(sentAmounts[5]); // tradeTokenUsable
            }

            uint256 newPositionTokenAmount;
            if (loanPosition.collateralTokenAddressFilled == loanPosition.positionTokenAddressFilled) {
                newPositionTokenAmount = collateralTokenUsable.add(destTokenAmountReceived)
                    .sub(collateralAmountRequired);

                collateralTokenUsable = collateralAmountRequired;
            } else {
                newPositionTokenAmount = destTokenAmountReceived;
            }

            loanPosition.positionTokenAmountFilled = loanPosition.positionTokenAmountFilled
                .add(newPositionTokenAmount);
        }

       //require (collateralTokenUsable >= collateralAmountRequired, "collateral insufficient");
        loanPosition.collateralTokenAmountFilled = loanPosition.collateralTokenAmountFilled
            .add(collateralTokenUsable);
        if (collateralTokenUsable < collateralAmountRequired) {
            // allow at most 2% under-collateralized
            collateralTokenUsable = collateralAmountRequired
                .sub(collateralTokenUsable);
            collateralTokenUsable = collateralTokenUsable
                .mul(10**20);
            collateralTokenUsable = collateralTokenUsable
                .div(collateralAmountRequired);
            require(
                collateralTokenUsable <= (2 * 10**18),
                "collateral insufficient"
            );
        }

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

    function _payInterestForOracleAsLender(
        LenderInterest memory oracleInterest,
        address oracleAddress,
        address interestTokenAddress)
        internal
    {
        address oracleRef = oracleAddresses[oracleAddress];

        uint256 interestOwedNow = 0;
        if (oracleInterest.interestOwedPerDay > 0 && oracleInterest.interestPaidDate > 0 && interestTokenAddress != address(0)) {
            interestOwedNow = block.timestamp.sub(oracleInterest.interestPaidDate).mul(oracleInterest.interestOwedPerDay).div(86400);
            if (interestOwedNow > tokenInterestOwed[msg.sender][interestTokenAddress])
	        interestOwedNow = tokenInterestOwed[msg.sender][interestTokenAddress];

            if (interestOwedNow > 0) {
                oracleInterest.interestPaid = oracleInterest.interestPaid.add(interestOwedNow);
                tokenInterestOwed[msg.sender][interestTokenAddress] = tokenInterestOwed[msg.sender][interestTokenAddress].sub(interestOwedNow);

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
            }
        }

        oracleInterest.interestPaidDate = block.timestamp;
        lenderOracleInterest[msg.sender][oracleAddress][interestTokenAddress] = oracleInterest;
    }
}
