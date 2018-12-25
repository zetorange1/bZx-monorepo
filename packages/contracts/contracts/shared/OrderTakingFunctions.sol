/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.2;
pragma experimental ABIEncoderV2;

import "../openzeppelin-solidity/SafeMath.sol";

import "../storage/BZxStorage.sol";
import "../BZxVault.sol";
import "../oracle/OracleRegistry.sol";
import "../oracle/OracleInterface.sol";
import "./InterestFunctions.sol";

import "../tokens/EIP20.sol";

contract OrderTakingFunctions is BZxStorage, InterestFunctions {
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
        uint[11] memory orderValues,
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
        address[8] memory orderAddresses,
        uint[11] memory orderValues,
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

            if (!_verifyNewLoanOrder(
                loanOrder,
                loanOrderAux,
                signature
            )) {
                revert("BZxOrderTaking::_addLoanOrder: loan verification failed");
            }
            
            orders[loanOrderHash] = loanOrder;
            orderAux[loanOrderHash] = loanOrderAux;
            
            emit LogLoanAdded (
                loanOrderHash,
                msg.sender,
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
                msg.sender,
                gasUsed
            )) {
                revert("BZxOrderTaking::_addLoanOrder: OracleInterface.didAddOrder failed");
            }
        }

        return loanOrderHash;
    }

    function _verifyNewLoanOrder(
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
            revert("BZxOrderTaking::_verifyNewLoanOrder: loanOrderAux.loanTokenAddress == address(0) || loanOrder.loanTokenAddress == address(0)");
        }

        if (loanOrderAux.tradeTokenToFillAddress == loanOrder.loanTokenAddress) {
            revert("BZxOrderTaking::_verifyNewLoanOrder: loanOrderAux.tradeTokenToFillAddress == loanOrder.loanTokenAddress");
        }

        if (loanOrderAux.expirationUnixTimestampSec > 0 && block.timestamp >= loanOrderAux.expirationUnixTimestampSec) {
            revert("BZxOrderTaking::_verifyNewLoanOrder: block.timestamp >= loanOrderAux.expirationUnixTimestampSec");
        }

        if (loanOrder.maxDurationUnixTimestampSec == 0 || loanOrder.maxDurationUnixTimestampSec > block.timestamp + loanOrder.maxDurationUnixTimestampSec) {
            revert("BZxOrderTaking::_verifyNewLoanOrder: loanOrder.maxDurationUnixTimestampSec == 0 || loanOrder.maxDurationUnixTimestampSec causes overflow");
        }

        if (! OracleRegistry(oracleRegistryContract).hasOracle(loanOrder.oracleAddress) || oracleAddresses[loanOrder.oracleAddress] == address(0)) {
            revert("BZxOrderTaking::_verifyNewLoanOrder: Oracle doesn't exist");
        }

        if (loanOrder.maintenanceMarginAmount == 0 || loanOrder.maintenanceMarginAmount >= loanOrder.initialMarginAmount) {
            revert("BZxOrderTaking::_verifyNewLoanOrder: loanOrder.maintenanceMarginAmount == 0 || loanOrder.maintenanceMarginAmount >= loanOrder.initialMarginAmount");
        }

        if (msg.sender != loanOrderAux.makerAddress) {
            if (!_isValidSignature(
                loanOrderAux.makerAddress,
                loanOrder.loanOrderHash,
                signature
            )) {
                revert("BZxOrderTaking::_verifyNewLoanOrder: signature invalid");
            }
        }

        return true;
    }

    function _verifyExistingLoanOrder(
        LoanOrder memory loanOrder,
        LoanOrderAux memory loanOrderAux,
        address collateralTokenFilled,
        uint loanTokenAmountFilled)
        internal
        returns (bool)
    {
        if (loanOrderAux.makerAddress == msg.sender) {
            revert("BZxOrderTaking::_verifyExistingLoanOrder: loanOrderAux.makerAddress == msg.sender");
        }

        if (loanOrderAux.takerAddress != address(0) && loanOrderAux.takerAddress != msg.sender) {
            revert("BZxOrderTaking::_verifyExistingLoanOrder: loanOrderAux.takerAddress != msg.sender");
        }

        if (collateralTokenFilled == address(0)) {
            revert("BZxOrderTaking::_verifyExistingLoanOrder: collateralTokenFilled == address(0)");
        }
        
        if (loanOrderAux.expirationUnixTimestampSec > 0 && block.timestamp >= loanOrderAux.expirationUnixTimestampSec) {
            revert("BZxOrderTaking::_verifyExistingLoanOrder: block.timestamp >= loanOrderAux.expirationUnixTimestampSec");
        }

        if (loanOrder.maxDurationUnixTimestampSec == 0 || loanOrder.maxDurationUnixTimestampSec > block.timestamp + loanOrder.maxDurationUnixTimestampSec) {
            revert("BZxOrderTaking::_verifyExistingLoanOrder: loanOrder.maxDurationUnixTimestampSec == 0 || loanOrder.maxDurationUnixTimestampSec causes overflow");
        }

        uint remainingLoanTokenAmount = loanOrder.loanTokenAmount.sub(_getUnavailableLoanTokenAmount(loanOrder.loanOrderHash));
        if (remainingLoanTokenAmount < loanTokenAmountFilled) {
            revert("BZxOrderTaking::_verifyExistingLoanOrder: remainingLoanTokenAmount < loanTokenAmountFilled");
        } else if (remainingLoanTokenAmount > loanTokenAmountFilled) {
            if (!orderListIndex[loanOrder.loanOrderHash][address(0)].isSet) {
                // record of fillable (non-expired, unfilled) orders
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
        bytes32 loanOrderHash,
        address collateralTokenFilled,
        uint loanTokenAmountFilled,
        uint takerRole, // (0=lender, 1=trader)
        bool withdrawOnOpen)
        internal
        returns (LoanOrder memory loanOrder)
    {
        loanOrder = orders[loanOrderHash];
        if (loanOrder.loanTokenAddress == address(0)) {
            revert("BZxOrderTaking::_takeLoanOrder: loanOrder.loanTokenAddress == address(0)");
        }

        LoanOrderAux memory loanOrderAux = orderAux[loanOrderHash];

        // makerRole and takerRole must not be equal and must have a value <= 1
        if (loanOrderAux.makerRole > 1 || takerRole > 1 || loanOrderAux.makerRole == takerRole) {
            revert("BZxOrderTaking::_takeLoanOrder: makerRole > 1 || takerRole > 1 || makerRole == takerRole");
        }

        if (!_verifyExistingLoanOrder(
            loanOrder,
            loanOrderAux,
            collateralTokenFilled,
            loanTokenAmountFilled
        )) {
            revert("BZxOrderTaking::_takeLoanOrder: loan verification failed");
        }

        LoanPosition memory loanPosition = _fillLoanOrder(
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

        if (loanPosition.collateralTokenAmountFilled > 0) {
            if (! OracleInterface(oracleAddresses[loanOrder.oracleAddress]).didTakeOrder(
                loanOrder,
                loanOrderAux,
                loanPosition,
                msg.sender,
                gasUsed
            )) {
                revert("BZxOrderTaking::_takeLoanOrder: OracleInterface.didTakeOrder failed");
            }
        }
    }

    function _fillLoanOrder(
        LoanOrder memory loanOrder,
        address collateralTokenFilled,
        uint loanTokenAmountFilled,
        bool withdrawOnOpen)
        internal
        returns (LoanPosition memory)
    {
        uint collateralTokenAmountFilled = _getCollateralRequired(
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
            trader = msg.sender;
        } else { // lender
            lender = msg.sender;
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
                revert("BZxOrderTaking::_fillLoanOrder: BZxVault.transferTokenFrom loan failed");
            }
        } else {
            // deposit loan token
            if (! BZxVault(vaultContract).depositToken(
                loanOrder.loanTokenAddress,
                lender,
                loanTokenAmountFilled
            )) {
                revert("BZxOrderTaking::_fillLoanOrder: BZxVault.depositToken loan failed");
            }
        }

        if (collateralTokenAmountFilled > 0) {
            // deposit collateral token
            if (! BZxVault(vaultContract).depositToken(
                collateralTokenFilled,
                trader,
                collateralTokenAmountFilled
            )) {
                revert("BZxOrderTaking::_fillLoanOrder: BZxVault.depositToken collateral failed");
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
                    revert("BZxOrderTaking::_fillLoanOrder: BZxVault.transferTokenFrom traderRelayFee failed");
                }
            }
            if (loanOrderAux.lenderRelayFee > 0) {
                if (! BZxVault(vaultContract).transferTokenFrom(
                    bZRxTokenContract, 
                    lender,
                    loanOrderAux.feeRecipientAddress,
                    _safeGetPartialAmountFloor(loanTokenAmountFilled, loanOrder.loanTokenAmount, loanOrderAux.lenderRelayFee)
                )) {
                    revert("BZxOrderTaking::_fillLoanOrder: BZxVault.transferTokenFrom lenderRelayFee failed");
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
        uint collateralTokenAmountFilled,
        uint loanTokenAmountFilled,
        bool withdrawOnOpen)
        internal
        returns (LoanPosition memory loanPosition)
    {
        uint positionId = loanPositionsIds[loanOrder.loanOrderHash][trader];
        if (orderListIndex[loanOrder.loanOrderHash][trader].isSet && loanPositions[positionId].active) {
            // trader has already filled part of the loan order previously and that loan is still active

            loanPosition = loanPositions[positionId];

            require(loanPosition.collateralTokenAddressFilled == collateralTokenFilled, "collateral token mismatch");
            require(block.timestamp < loanPosition.loanEndUnixTimestampSec, "loan has expired");

            if (!withdrawOnOpen) {
                if (loanPosition.positionTokenAddressFilled != loanOrder.loanTokenAddress) {
                    // The trader has opened a position in a previous loan fill.
                    // We automatically add to that position

                    uint balanceBeforeTrade = EIP20(loanOrder.loanTokenAddress).balanceOf.gas(4999)(oracleAddresses[loanOrder.oracleAddress]); // Changes to state require at least 5000 gas

                    if (!BZxVault(vaultContract).withdrawToken(
                        loanOrder.loanTokenAddress,
                        oracleAddresses[loanOrder.oracleAddress],
                        loanTokenAmountFilled)) {
                        revert("MiscFunctions::_setOrderAndPositionState: BZxVault.withdrawToken failed");
                    }
                    
                    (uint amountFilled,) = OracleInterface(oracleAddresses[loanOrder.oracleAddress]).trade(
                        loanOrder.loanTokenAddress,
                        loanPosition.positionTokenAddressFilled,
                        loanTokenAmountFilled,
                        MAX_UINT);
                    loanPosition.positionTokenAmountFilled = loanPosition.positionTokenAmountFilled.add(amountFilled);

                    // It is assumed that all of the loan token will be traded, so the remaining token balance of the oracle
                    // shouldn't be greater than the balance before we sent the token to be traded.
                    if (balanceBeforeTrade < EIP20(loanOrder.loanTokenAddress).balanceOf.gas(4999)(oracleAddresses[loanOrder.oracleAddress])) {
                        revert("BZxTradePlacing::_setOrderAndPositionState: balanceBeforeTrade is less");
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
                revert("BZxTradePlacing::_setOrderAndPositionState: this order has another lender");
            }
        }

        orderFilledAmounts[loanOrder.loanOrderHash] = orderFilledAmounts[loanOrder.loanOrderHash].add(loanTokenAmountFilled);
    }

    function _fillTradeToken(
        LoanOrder memory loanOrder,
        address trader,
        address tradeTokenToFillAddress)
        internal
        returns (uint)
    {
        LoanPosition storage loanPosition = loanPositions[loanPositionsIds[loanOrder.loanOrderHash][trader]];
        if (tradeTokenToFillAddress == loanPosition.positionTokenAddressFilled) {
            // This trade has been filled previously.
            return 0;
        }
        
        (uint tradeTokenAmount, uint positionTokenAmountUsed) = _tradePositionWithOracle(
            loanOrder,
            loanPosition,
            tradeTokenToFillAddress,
            MAX_UINT,
            false, // isLiquidation
            true // ensureHealthy
        );

        if (positionTokenAmountUsed < loanPosition.positionTokenAmountFilled) {
            // untradeable position token is withdrawn to the trader for manual handling
            if (! BZxVault(vaultContract).withdrawToken(
                loanPosition.positionTokenAddressFilled,
                loanPosition.trader,
                loanPosition.positionTokenAmountFilled.sub(positionTokenAmountUsed)
            )) {
                revert("OrderTakingFunctions::_fillTradeToken: BZxVault.withdrawToken untradeable token failed");
            }
        }

        if (tradeTokenAmount == 0) {
            revert("OrderTakingFunctions::_fillTradeToken: tradeTokenAmount == 0");
        }

        // the trade token becomes the new position token
        loanPosition.positionTokenAddressFilled = tradeTokenToFillAddress;
        loanPosition.positionTokenAmountFilled = tradeTokenAmount;

        return tradeTokenAmount;
    }

    function _collectTotalInterest(
        LoanOrder memory loanOrder,
        LoanPosition memory loanPosition,
        uint loanTokenAmountFilled)
        internal
    {
        // interest-free loan is permitted
        if (loanOrder.interestAmount > 0) {

            if (block.timestamp > loanPosition.loanStartUnixTimestampSec) {
                // pay any accured interest from an earlier loan fill
                _payInterestForPosition(
                    loanOrder,
                    loanPosition,
                    true, // convert,
                    false // emitEvent
                );
            }
            
            // Total interest required if loan is kept open for the full duration.
            // Unused interest at the end of a loan is refunded to the trader.
            uint totalInterestRequired = _safeGetPartialAmountFloor(
                loanTokenAmountFilled,
                loanOrder.loanTokenAmount,
                loanPosition.loanEndUnixTimestampSec.sub(block.timestamp).mul(loanOrder.interestAmount).div(86400)
            );

            if (totalInterestRequired > 0) {
                interestTotal[loanPositionsIds[loanOrder.loanOrderHash][loanPosition.trader]] = 
                    interestTotal[loanPositionsIds[loanOrder.loanOrderHash][loanPosition.trader]].add(totalInterestRequired);

                // deposit interest token
                if (! BZxVault(vaultContract).depositToken(
                    loanOrder.interestTokenAddress,
                    loanPosition.trader,
                    totalInterestRequired
                )) {
                    revert("BZxOrderTaking::_collectTotalInterest: BZxVault.depositToken interest failed");
                }
            }
        }
    }
}