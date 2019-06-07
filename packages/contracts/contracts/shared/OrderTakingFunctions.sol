/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.3;
pragma experimental ABIEncoderV2;

import "../openzeppelin-solidity/SafeMath.sol";

import "../storage/BZxStorage.sol";
import "../BZxVault.sol";
import "../oracle/OracleRegistry.sol";
import "../oracle/OracleInterface.sol";
import "./MiscFunctions.sol";

import "../tokens/EIP20.sol";

contract OrderTakingFunctions is BZxStorage, MiscFunctions {
    using SafeMath for uint256;

    // 0x signature types.
    enum SignatureType {
        Illegal,         // 0x00, default value
        Invalid,         // 0x01
        EIP712,          // 0x02
        EthSign,         // 0x03
        Wallet,          // 0x04
        Validator,       // 0x05
        PreSigned,       // 0x06
        NSignatureTypes  // 0x07, number of signature types. Always leave at end.
    }

    /// @dev Verifies that an order signature is valid.
    /// @param signer address of signer.
    /// @param hash Signed Keccak-256 hash.
    /// @param signature ECDSA signature in raw bytes (rsv) + signatureType.
    /// @return Validity of order signature.
    function _isValidSignature(
        address signer,
        bytes32 hash,
        bytes memory signature)
        internal
        view
        returns (bool)
    {
        SignatureType signatureType;
        uint8 v;
        bytes32 r;
        bytes32 s;
        (signatureType, v, r, s) = _getSignatureParts(signature);

        // Signature using EIP712
        if (signatureType == SignatureType.EIP712) {
            return signer == ecrecover(
                hash,
                v,
                r,
                s
            );            

        // Signed using web3.eth_sign
        } else if (signatureType == SignatureType.EthSign) {
            return signer == ecrecover(
                keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash)),
                v,
                r,
                s
            );
        
        // Signer signed hash previously using the preSign function.
        } else if (signatureType == SignatureType.PreSigned) {
            return preSigned[hash][signer];
        }

        // Anything else is illegal (We do not return false because
        // the signature may actually be valid, just not in a format
        // that we currently support. In this case returning false
        // may lead the caller to incorrectly believe that the
        // signature was invalid.)
        revert("UNSUPPORTED_SIGNATURE_TYPE");
    }

    /// @param signature ECDSA signature in raw bytes (rsv).
    /// @dev This supports 0x V2 SignatureType
    function _getSignatureParts(
        bytes memory signature)
        internal
        pure
        returns (
            SignatureType signatureType,
            uint8 v,
            bytes32 r,
            bytes32 s)
    {
        require(
            signature.length == 66,
            "INVALID_SIGNATURE_LENGTH"
        );

        uint8 t;
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := mload(add(signature, 65))
            t := mload(add(signature, 66))
        }
        signatureType = SignatureType(t);
        if (v < 27) {
            v = v + 27;
        }
    }

    function _getLoanOrderHash(
        address[8] memory orderAddresses,
        uint256[11] memory orderValues,
        bytes memory oracleData)
        internal
        view
        returns (bytes32)
    {
        return(keccak256(abi.encodePacked(
            address(this),
            orderAddresses,
            orderValues,
            oracleData
        )));
    }

    function _addLoanOrder(
        address msgsender,
        address[8] memory orderAddresses,
        uint256[11] memory orderValues,
        bytes memory oracleData,
        bytes memory signature)
        internal
        returns (bytes32 loanOrderHash)
    {
        loanOrderHash = _getLoanOrderHash(orderAddresses, orderValues, oracleData);
        if (orders[loanOrderHash].loanTokenAddress == address(0)) {
            LoanOrder memory loanOrder = LoanOrder({
                loanTokenAddress: orderAddresses[1],
                interestTokenAddress: orderAddresses[2],
                collateralTokenAddress: orderAddresses[3],
                oracleAddress: orderAddresses[5],
                loanTokenAmount: orderValues[0],
                interestAmount: orderValues[1],
                initialMarginAmount: orderValues[2],
                maintenanceMarginAmount: orderValues[3],
                maxDurationUnixTimestampSec: orderValues[6],
                loanOrderHash: loanOrderHash
            });

            bool withdrawOnOpen = orderValues[8] == 1 ? (orderValues[9] % 2) != 0 : false;
            address tradeTokenToFillAddress = orderValues[8] == 1 && !withdrawOnOpen ? orderAddresses[7] : address(0);

            LoanOrderAux memory loanOrderAux = LoanOrderAux({
                makerAddress: orderAddresses[0],
                takerAddress: orderAddresses[6],
                feeRecipientAddress: orderAddresses[4],
                tradeTokenToFillAddress: tradeTokenToFillAddress,
                lenderRelayFee: orderValues[4],
                traderRelayFee: orderValues[5],
                makerRole: orderValues[8], // (0=lender, 1=trader)
                expirationUnixTimestampSec: orderValues[7],
                withdrawOnOpen: withdrawOnOpen,
                description: ""
            });

            if (orderValues[8] == 0) {
                // lender is maker
                orderLender[loanOrderHash] = orderAddresses[0];
                orderList[orderAddresses[0]].push(loanOrderHash);
                orderListIndex[loanOrderHash][orderAddresses[0]] = ListIndex({
                    index: orderList[orderAddresses[0]].length-1,
                    isSet: true
                });
            }

            if (!_verifyNewLoanOrder(
                msgsender,
                loanOrder,
                loanOrderAux,
                signature
            )) {
                revert("loan verification failed");
            }
            
            orders[loanOrderHash] = loanOrder;
            orderAux[loanOrderHash] = loanOrderAux;
            
            emit LogLoanAdded (
                loanOrderHash,
                msgsender,
                loanOrderAux.makerAddress,
                orderAddresses[4],
                orderValues[4],
                orderValues[5],
                loanOrder.maxDurationUnixTimestampSec,
                loanOrderAux.makerRole
            );

            if (! OracleInterface(oracleAddresses[loanOrder.oracleAddress]).didAddOrder(
                loanOrder,
                loanOrderAux,
                oracleData,
                msgsender,
                gasUsed
            )) {
                revert("OracleInterface.didAddOrder failed");
            }
        }

        return loanOrderHash;
    }

    function _verifyNewLoanOrder(
        address msgsender,
        LoanOrder memory loanOrder,
        LoanOrderAux memory loanOrderAux,
        bytes memory signature)
        internal
        view
        returns (bool)
    {
        // loanOrder.interestTokenAddress == address(0) is permitted for interest-free loans
        if (loanOrderAux.makerAddress == address(0)
            || loanOrder.loanTokenAddress == address(0)) {
            revert("loanOrderAux.loanTokenAddress == address(0) || loanOrder.loanTokenAddress == address(0)");
        }

        if (loanOrderAux.tradeTokenToFillAddress == loanOrder.loanTokenAddress) {
            revert("loanOrderAux.tradeTokenToFillAddress == loanOrder.loanTokenAddress");
        }

        if (loanOrderAux.expirationUnixTimestampSec > 0 && block.timestamp >= loanOrderAux.expirationUnixTimestampSec) {
            revert("block.timestamp >= loanOrderAux.expirationUnixTimestampSec");
        }

        if (loanOrder.maxDurationUnixTimestampSec == 0 || loanOrder.maxDurationUnixTimestampSec > block.timestamp + loanOrder.maxDurationUnixTimestampSec) {
            revert("loanOrder.maxDurationUnixTimestampSec == 0 || loanOrder.maxDurationUnixTimestampSec causes overflow");
        }

        if (! OracleRegistry(oracleRegistryContract).hasOracle(loanOrder.oracleAddress) || oracleAddresses[loanOrder.oracleAddress] == address(0)) {
            revert("Oracle doesn't exist");
        }

        if (loanOrder.maintenanceMarginAmount == 0 || loanOrder.maintenanceMarginAmount >= loanOrder.initialMarginAmount) {
            revert("loanOrder.maintenanceMarginAmount == 0 || loanOrder.maintenanceMarginAmount >= loanOrder.initialMarginAmount");
        }

        if (msgsender != loanOrderAux.makerAddress) {
            if (!_isValidSignature(
                loanOrderAux.makerAddress,
                loanOrder.loanOrderHash,
                signature
            )) {
                revert("signature invalid");
            }
        }

        return true;
    }

    function _verifyExistingLoanOrder(
        address msgsender,
        LoanOrder memory loanOrder,
        LoanOrderAux memory loanOrderAux,
        address collateralTokenFilled,
        uint256 loanTokenAmountFilled)
        internal
        returns (bool)
    {
        if (loanOrderAux.makerAddress == msgsender) {
            revert("loanOrderAux.makerAddress == msgsender");
        }

        if (loanOrderAux.takerAddress != address(0) && loanOrderAux.takerAddress != msgsender) {
            revert("loanOrderAux.takerAddress != msgsender");
        }

        if (collateralTokenFilled == address(0)) {
            revert("collateralTokenFilled == address(0)");
        }
        
        if (loanOrderAux.expirationUnixTimestampSec > 0 && block.timestamp >= loanOrderAux.expirationUnixTimestampSec) {
            revert("block.timestamp >= loanOrderAux.expirationUnixTimestampSec");
        }

        if (loanOrder.maxDurationUnixTimestampSec == 0 || loanOrder.maxDurationUnixTimestampSec > block.timestamp + loanOrder.maxDurationUnixTimestampSec) {
            revert("loanOrder.maxDurationUnixTimestampSec == 0 || loanOrder.maxDurationUnixTimestampSec causes overflow");
        }

        uint256 remainingLoanTokenAmount = loanOrder.loanTokenAmount.sub(_getUnavailableLoanTokenAmount(loanOrder.loanOrderHash));
        if (remainingLoanTokenAmount < loanTokenAmountFilled) {
            revert("remainingLoanTokenAmount < loanTokenAmountFilled");
        } else if (remainingLoanTokenAmount > loanTokenAmountFilled) {
            if (!orderListIndex[loanOrder.loanOrderHash][address(0)].isSet) {
                // record of fillable (non-expired/unfilled) orders
                orderList[address(0)].push(loanOrder.loanOrderHash);
                orderListIndex[loanOrder.loanOrderHash][address(0)] = ListIndex({
                    index: orderList[address(0)].length-1,
                    isSet: true
                });
            }
        } else { // remainingLoanTokenAmount == loanTokenAmountFilled
            _removeLoanOrder(loanOrder.loanOrderHash, address(0));
        }

        return true;
    }

    function _takeLoanOrder(
        address msgsender,
        bytes32 loanOrderHash,
        address collateralTokenFilled,
        uint256 loanTokenAmountFilled,
        uint256 takerRole, // (0=lender, 1=trader)
        bool withdrawOnOpen)
        internal
        returns (LoanOrder memory loanOrder)
    {
        loanOrder = orders[loanOrderHash];
        if (loanOrder.loanTokenAddress == address(0)) {
            revert("loanOrder.loanTokenAddress == address(0)");
        }

        LoanOrderAux memory loanOrderAux = orderAux[loanOrderHash];

        // makerRole and takerRole must not be equal and must have a value <= 1
        if (loanOrderAux.makerRole > 1 || takerRole > 1 || loanOrderAux.makerRole == takerRole) {
            revert("makerRole > 1 || takerRole > 1 || makerRole == takerRole");
        }

        if (!_verifyExistingLoanOrder(
            msgsender,
            loanOrder,
            loanOrderAux,
            collateralTokenFilled,
            loanTokenAmountFilled
        )) {
            revert("loan verification failed");
        }

        LoanPosition memory loanPosition = _fillLoanOrder(
            msgsender,
            loanOrder,
            collateralTokenFilled,
            loanTokenAmountFilled,
            withdrawOnOpen
        );

        _collectTotalInterest(
            loanOrder,
            loanPosition,
            loanTokenAmountFilled
        );

        emit LogLoanTaken (
            orderLender[loanOrder.loanOrderHash],
            loanPosition.trader,
            loanOrder.loanTokenAddress,
            loanPosition.collateralTokenAddressFilled,
            loanTokenAmountFilled,
            loanPosition.collateralTokenAmountFilled,
            loanPosition.loanEndUnixTimestampSec,
            block.timestamp == loanPosition.loanStartUnixTimestampSec, // firstFill
            loanOrder.loanOrderHash,
            loanPosition.positionId
        );

        /*if (loanPosition.collateralTokenAmountFilled > 0) {
            if (! OracleInterface(oracleAddresses[loanOrder.oracleAddress]).didTakeOrder(
                loanOrder,
                loanOrderAux,
                loanPosition,
                msgsender,
                gasUsed
            )) {
                revert("OracleInterface.didTakeOrder failed");
            }
        }*/
    }

    function _fillLoanOrder(
        address msgsender,
        LoanOrder memory loanOrder,
        address collateralTokenFilled,
        uint256 loanTokenAmountFilled,
        bool withdrawOnOpen)
        internal
        returns (LoanPosition memory)
    {
        uint256 collateralTokenAmountFilled = _getCollateralRequired(
            loanOrder.loanTokenAddress,
            collateralTokenFilled,
            oracleAddresses[loanOrder.oracleAddress],
            loanTokenAmountFilled,
            loanOrder.initialMarginAmount
        );

        LoanOrderAux memory loanOrderAux = orderAux[loanOrder.loanOrderHash];

        address trader;
        address lender;
        if (loanOrderAux.makerRole == 0) { // lender
            lender = loanOrderAux.makerAddress;
            trader = msgsender;
        } else { // lender
            lender = msgsender;
            trader = loanOrderAux.makerAddress;
        }

        if (withdrawOnOpen) {
            collateralTokenAmountFilled = collateralTokenAmountFilled.add(collateralTokenAmountFilled.mul(10**20).div(loanOrder.initialMarginAmount));

            // send loan token to the trader
            if (! BZxVault(vaultContract).transferTokenFrom(
                loanOrder.loanTokenAddress,
                lender,
                trader,
                loanTokenAmountFilled
            )) {
                revert("BZxVault.transferTokenFrom loan failed");
            }
        } else {
            // deposit loan token
            if (! BZxVault(vaultContract).depositToken(
                loanOrder.loanTokenAddress,
                lender,
                loanTokenAmountFilled
            )) {
                revert("BZxVault.depositToken loan failed");
            }
        }

        if (collateralTokenAmountFilled > 0) {
            // deposit collateral token
            if (! BZxVault(vaultContract).depositToken(
                collateralTokenFilled,
                trader,
                collateralTokenAmountFilled
            )) {
                revert("BZxVault.depositToken collateral failed");
            }
        }

        if (loanOrderAux.feeRecipientAddress != address(0)) {
            if (loanOrderAux.traderRelayFee > 0) {
                if (! BZxVault(vaultContract).transferTokenFrom(
                    bZRxTokenContract,
                    trader,
                    loanOrderAux.feeRecipientAddress,
                    _safeGetPartialAmountFloor(loanTokenAmountFilled, loanOrder.loanTokenAmount, loanOrderAux.traderRelayFee)
                )) {
                    revert("BZxVault.transferTokenFrom traderRelayFee failed");
                }
            }
            if (loanOrderAux.lenderRelayFee > 0) {
                if (! BZxVault(vaultContract).transferTokenFrom(
                    bZRxTokenContract,
                    lender,
                    loanOrderAux.feeRecipientAddress,
                    _safeGetPartialAmountFloor(loanTokenAmountFilled, loanOrder.loanTokenAmount, loanOrderAux.lenderRelayFee)
                )) {
                    revert("BZxVault.transferTokenFrom lenderRelayFee failed");
                }
            }
        }

        return _setOrderAndPositionState(
            loanOrder,
            trader,
            lender,
            collateralTokenFilled,
            collateralTokenAmountFilled,
            loanTokenAmountFilled,
            withdrawOnOpen
        );
    }

    function _setOrderAndPositionState(
        LoanOrder memory loanOrder,
        address trader,
        address lender,
        address collateralTokenFilled,
        uint256 collateralTokenAmountFilled,
        uint256 loanTokenAmountFilled,
        bool withdrawOnOpen)
        internal
        returns (LoanPosition memory loanPosition)
    {
        uint256 positionId = loanPositionsIds[loanOrder.loanOrderHash][trader];
        if (orderListIndex[loanOrder.loanOrderHash][trader].isSet && loanPositions[positionId].active) {
            // trader has already filled part of the loan order previously and that loan is still active

            loanPosition = loanPositions[positionId];

            require(loanPosition.collateralTokenAddressFilled == collateralTokenFilled, "collateral token mismatch");
            require(block.timestamp < loanPosition.loanEndUnixTimestampSec, "loan has expired");

            if (!withdrawOnOpen) {
                if (loanPosition.positionTokenAddressFilled != loanOrder.loanTokenAddress) {
                    // The trader has opened a position in a previous loan fill.
                    // We automatically add to that position

                    uint256 balanceBeforeTrade = EIP20(loanOrder.loanTokenAddress).balanceOf(oracleAddresses[loanOrder.oracleAddress]);

                    if (!BZxVault(vaultContract).withdrawToken(
                        loanOrder.loanTokenAddress,
                        oracleAddresses[loanOrder.oracleAddress],
                        loanTokenAmountFilled)) {
                        revert("BZxVault.withdrawToken failed");
                    }

                    (uint256 amountFilled,) = OracleInterface(oracleAddresses[loanOrder.oracleAddress]).trade(
                        loanOrder.loanTokenAddress,
                        loanPosition.positionTokenAddressFilled,
                        loanTokenAmountFilled,
                        MAX_UINT);
                    loanPosition.positionTokenAmountFilled = loanPosition.positionTokenAmountFilled.add(amountFilled);

                    // It is assumed that all of the loan token will be traded, so the remaining token balance of the oracle
                    // shouldn't be greater than the balance before we sent the token to be traded.
                    if (balanceBeforeTrade < EIP20(loanOrder.loanTokenAddress).balanceOf(oracleAddresses[loanOrder.oracleAddress])) {
                        revert("balanceBeforeTrade is less");
                    }
                } else {
                    loanPosition.positionTokenAmountFilled = loanPosition.positionTokenAmountFilled.add(loanTokenAmountFilled);
                }
            }

            loanPosition.loanTokenAmountFilled = loanPosition.loanTokenAmountFilled.add(loanTokenAmountFilled);
            loanPosition.collateralTokenAmountFilled = loanPosition.collateralTokenAmountFilled.add(collateralTokenAmountFilled);

            loanPositions[positionId] = loanPosition;
        } else {
            // trader has not previously filled part of this loan or the previous fill is inactive

            positionId = uint(keccak256(abi.encodePacked(
                loanOrder.loanOrderHash,
                orderPositionList[loanOrder.loanOrderHash].length,
                trader,
                lender,
                block.timestamp
            )));

            loanPosition = LoanPosition({
                trader: trader,
                collateralTokenAddressFilled: collateralTokenFilled,
                positionTokenAddressFilled: loanOrder.loanTokenAddress,
                loanTokenAmountFilled: loanTokenAmountFilled,
                loanTokenAmountUsed: 0,
                collateralTokenAmountFilled: collateralTokenAmountFilled,
                positionTokenAmountFilled: !withdrawOnOpen ? loanTokenAmountFilled : 0,
                loanStartUnixTimestampSec: block.timestamp,
                loanEndUnixTimestampSec: block.timestamp.add(loanOrder.maxDurationUnixTimestampSec),
                active: true,
                positionId: positionId
            });

            loanPositions[positionId] = loanPosition;

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
            // set only once per order
            orderLender[loanOrder.loanOrderHash] = lender;
            orderList[lender].push(loanOrder.loanOrderHash);
            orderListIndex[loanOrder.loanOrderHash][lender] = ListIndex({
                index: orderList[lender].length-1,
                isSet: true
            });
        } else {
            if (orderLender[loanOrder.loanOrderHash] != lender) {
                revert("this order has another lender");
            }
        }

        orderFilledAmounts[loanOrder.loanOrderHash] = orderFilledAmounts[loanOrder.loanOrderHash].add(loanTokenAmountFilled);
    }

    function _fillTradeToken(
        LoanOrder memory loanOrder,
        address trader,
        address tradeTokenToFillAddress)
        internal
        returns (uint256)
    {
        LoanPosition storage loanPosition = loanPositions[loanPositionsIds[loanOrder.loanOrderHash][trader]];
        if (tradeTokenToFillAddress == loanPosition.positionTokenAddressFilled) {
            // This trade has been filled previously.
            return 0;
        }
        
        (uint256 tradeTokenAmount, uint256 positionTokenAmountUsed) = _tradePositionWithOracle(
            loanOrder,
            loanPosition,
            tradeTokenToFillAddress,
            MAX_UINT,
            true // ensureHealthy
        );

        if (positionTokenAmountUsed < loanPosition.positionTokenAmountFilled) {
            // untradeable position token is withdrawn to the trader for manual handling
            if (! BZxVault(vaultContract).withdrawToken(
                loanPosition.positionTokenAddressFilled,
                loanPosition.trader,
                loanPosition.positionTokenAmountFilled.sub(positionTokenAmountUsed)
            )) {
                revert("BZxVault.withdrawToken untradeable token failed");
            }
        }

        if (tradeTokenAmount == 0) {
            revert("tradeTokenAmount == 0");
        }

        // the trade token becomes the new position token
        loanPosition.positionTokenAddressFilled = tradeTokenToFillAddress;
        loanPosition.positionTokenAmountFilled = tradeTokenAmount;

        return tradeTokenAmount;
    }

    function _collectTotalInterest(
        LoanOrder memory loanOrder,
        LoanPosition memory loanPosition,
        uint256 loanTokenAmountFilled)
        internal
    {
        // interest-free loan is permitted
        if (loanOrder.interestAmount > 0) {
            LenderInterest storage oracleInterest = lenderOracleInterest[orderLender[loanOrder.loanOrderHash]][loanOrder.oracleAddress][loanOrder.interestTokenAddress];
            LenderInterest storage lenderInterest = lenderOrderInterest[loanOrder.loanOrderHash];
            TraderInterest storage traderInterest = traderLoanInterest[loanPosition.positionId];

            // update lender interest
            _payInterestForOrder(loanOrder, oracleInterest, lenderInterest, true);

            uint256 owedPerDay = _safeGetPartialAmountFloor(
                loanTokenAmountFilled,
                loanOrder.loanTokenAmount,
                loanOrder.interestAmount
            );

            lenderInterest.interestOwedPerDay = lenderInterest.interestOwedPerDay.add(owedPerDay);
            oracleInterest.interestOwedPerDay = oracleInterest.interestOwedPerDay.add(owedPerDay);

            // update trader interest
            uint256 interestTime = block.timestamp;
            if (interestTime > loanPosition.loanEndUnixTimestampSec) {
                interestTime = loanPosition.loanEndUnixTimestampSec;
            }

            if (traderInterest.interestUpdatedDate > 0 && traderInterest.interestOwedPerDay > 0) {
                traderInterest.interestPaid = interestTime
                    .sub(traderInterest.interestUpdatedDate)
                    .mul(traderInterest.interestOwedPerDay)
                    .div(86400)
                    .add(traderInterest.interestPaid);
            }

            uint256 totalInterestToCollect = loanPosition.loanEndUnixTimestampSec
                .sub(interestTime)
                .mul(owedPerDay)
                .div(86400);

            traderInterest.interestUpdatedDate = interestTime;
            traderInterest.interestOwedPerDay = traderInterest.interestOwedPerDay.add(owedPerDay);
            traderInterest.interestDepositTotal = traderInterest.interestDepositTotal.add(totalInterestToCollect);

            if (totalInterestToCollect > 0) {
                // deposit interest token
                if (! BZxVault(vaultContract).depositToken(
                    loanOrder.interestTokenAddress,
                    loanPosition.trader,
                    totalInterestToCollect
                )) {
                    revert("BZxVault.depositToken interest failed");
                }
                
                tokenInterestOwed[orderLender[loanOrder.loanOrderHash]][loanOrder.interestTokenAddress] = tokenInterestOwed[orderLender[loanOrder.loanOrderHash]][loanOrder.interestTokenAddress].add(totalInterestToCollect);
            }
        }
    }
}