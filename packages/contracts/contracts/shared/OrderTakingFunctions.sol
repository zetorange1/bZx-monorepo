/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.4.24;
pragma experimental ABIEncoderV2;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

import "../storage/BZxStorage.sol";
import "../BZxVault.sol";
import "../oracle/OracleRegistry.sol";
import "../oracle/OracleInterface.sol";
import "./InternalFunctions.sol";


contract OrderTakingFunctions is BZxStorage, InternalFunctions {
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

    /// @dev Calculates the sum of values already filled and cancelled for a given loanOrder.
    /// @param loanOrderHash A unique hash representing the loan order.
    /// @return Sum of values already filled and cancelled.
    function _getUnavailableLoanTokenAmount(
        bytes32 loanOrderHash)
        internal
        view
        returns (uint)
    {
        return orderFilledAmounts[loanOrderHash].add(orderCancelledAmounts[loanOrderHash]);
    }

    /// @dev Verifies that an order signature is valid.
    /// @param signer address of signer.
    /// @param hash Signed Keccak-256 hash.
    /// @param signature ECDSA signature in raw bytes (rsv) + signatureType.
    /// @return Validity of order signature.
    function _isValidSignature(
        address signer,
        bytes32 hash,
        bytes signature)
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
        bytes signature)
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
        address[6] orderAddresses,
        uint[10] orderValues)
        internal
        view
        returns (bytes32)
    {
        return(keccak256(abi.encodePacked(
            address(this),
            orderAddresses,
            orderValues
        )));
    }

    function _addLoanOrder(
        address[6] orderAddresses,
        uint[10] orderValues,
        bytes signature)
        internal
        returns (bytes32 loanOrderHash)
    {
        loanOrderHash = _getLoanOrderHash(orderAddresses, orderValues);
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

            LoanOrderAux memory loanOrderAux = LoanOrderAux({
                maker: orderAddresses[0],
                feeRecipientAddress: orderAddresses[4],
                lenderRelayFee: orderValues[4],
                traderRelayFee: orderValues[5],
                makerRole: orderValues[8],
                expirationUnixTimestampSec: orderValues[7]
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
                loanOrderAux.maker,
                orderAddresses[4],
                orderValues[4],
                orderValues[5],
                loanOrder.maxDurationUnixTimestampSec,
                loanOrderAux.makerRole
            );
        }

        return loanOrderHash;
    }

    function _verifyNewLoanOrder(
        LoanOrder loanOrder,
        LoanOrderAux loanOrderAux,
        bytes signature)
        internal
        view
        returns (bool)
    {
        // loanOrder.interestTokenAddress == address(0) is permitted for interest-free loans
        if (loanOrderAux.maker == address(0)
            || loanOrder.loanTokenAddress == address(0)) {
            revert("BZxOrderTaking::_verifyNewLoanOrder: loanOrderAux.loanTokenAddress == address(0) || loanOrder.loanTokenAddress == address(0)");
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

        if (!_isValidSignature(
            loanOrderAux.maker,
            loanOrder.loanOrderHash,
            signature
        )) {
            revert("BZxOrderTaking::_verifyNewLoanOrder: signature invalid");
        }

        return true;
    }

    function _verifyExistingLoanOrder(
        LoanOrder loanOrder,
        LoanOrderAux loanOrderAux,
        address collateralTokenFilled,
        uint loanTokenAmountFilled)
        internal
        returns (bool)
    {
        if (loanOrderAux.maker == msg.sender) {
            revert("BZxOrderTaking::_verifyExistingLoanOrder: loanOrderAux.maker == msg.sender");
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
        uint takerRole) // (0=lender, 1=trader)
        internal
        returns (uint)
    {
        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.loanTokenAddress == address(0)) {
            revert("BZxOrderTaking::_takeLoanOrder: loanOrder.loanTokenAddress == address(0)");
        }

        LoanOrderAux memory loanOrderAux = orderAux[loanOrderHash];

        if (!_verifyExistingLoanOrder(
            loanOrder,
            loanOrderAux,
            collateralTokenFilled,
            loanTokenAmountFilled
        )) {
            revert("BZxOrderTaking::_takeLoanOrder: loan verification failed");
        }

        address lender;
        address trader;
        if (takerRole == 1) { // trader
            lender = loanOrderAux.maker;
            trader = msg.sender;
        } else { // lender
            lender = msg.sender;
            trader = loanOrderAux.maker;
        }

        if (orderListIndex[loanOrderHash][trader].isSet) {
            // A trader can only fill a portion or all of a loanOrder once:
            //  - this avoids complex interest payments for parts of an order filled at different times by the same trader
            //  - this avoids potentially large loops when calculating margin reqirements and interest payments
            revert("BZxOrderTaking::_takeLoanOrder: trader has already filled order");
        }

        // makerRole and takerRole must not be equal and must have a value <= 1
        if (loanOrderAux.makerRole > 1 || takerRole > 1 || loanOrderAux.makerRole == takerRole) {
            revert("BZxOrderTaking::_takeLoanOrder: makerRole > 1 || takerRole > 1 || makerRole == takerRole");
        }

        uint collateralTokenAmountFilled = _fillLoanOrder(
            loanOrder,
            trader,
            lender,
            collateralTokenFilled,
            loanTokenAmountFilled
        );

        LoanPosition memory loanPosition = _setOrderAndPositionState(
            loanOrder,
            trader,
            lender,
            collateralTokenFilled,
            collateralTokenAmountFilled,
            loanTokenAmountFilled
        );

        emit LogLoanTaken (
            orderLender[loanOrder.loanOrderHash],
            loanPosition.trader,
            loanPosition.collateralTokenAddressFilled,
            loanPosition.positionTokenAddressFilled,
            loanPosition.loanTokenAmountFilled,
            loanPosition.collateralTokenAmountFilled,
            loanPosition.positionTokenAmountFilled,
            loanPosition.loanStartUnixTimestampSec,
            loanPosition.active,
            loanOrder.loanOrderHash
        );

        if (collateralTokenAmountFilled > 0) {
            if (! OracleInterface(oracleAddresses[loanOrder.oracleAddress]).didTakeOrder(
                loanOrder,
                loanOrderAux,
                loanPosition,
                loanPositionsIds[loanOrder.loanOrderHash][trader],
                msg.sender,
                gasUsed
            )) {
                revert("BZxOrderTaking::_takeLoanOrder: OracleInterface.didTakeOrder failed");
            }
        }

        return loanTokenAmountFilled;
    }

    function _setOrderAndPositionState(
        LoanOrder memory loanOrder,
        address trader,
        address lender,
        address collateralTokenFilled,
        uint collateralTokenAmountFilled,
        uint loanTokenAmountFilled)
        internal
        returns (LoanPosition memory loanPosition)
    {
        // this function should not be called if trader has already filled the loanOrder
        assert(!orderListIndex[loanOrder.loanOrderHash][trader].isSet);
        
        orderFilledAmounts[loanOrder.loanOrderHash] = orderFilledAmounts[loanOrder.loanOrderHash].add(loanTokenAmountFilled);

        orderLender[loanOrder.loanOrderHash] = lender;

        loanPosition = LoanPosition({
            trader: trader,
            collateralTokenAddressFilled: collateralTokenFilled,
            positionTokenAddressFilled: loanOrder.loanTokenAddress,
            loanTokenAmountFilled: loanTokenAmountFilled,
            loanTokenAmountUsed: 0,
            collateralTokenAmountFilled: collateralTokenAmountFilled,
            positionTokenAmountFilled: loanTokenAmountFilled,
            loanStartUnixTimestampSec: block.timestamp,
            loanEndUnixTimestampSec: block.timestamp.add(loanOrder.maxDurationUnixTimestampSec),
            active: true
        });
        
        uint positionId = uint(keccak256(abi.encodePacked(
            loanOrder.loanOrderHash,
            orderPositionList[loanOrder.loanOrderHash].length,
            trader,
            lender,
            block.timestamp
        )));
        assert(!positionListIndex[positionId].isSet);

        loanPositions[positionId] = loanPosition;

        if (!orderListIndex[loanOrder.loanOrderHash][lender].isSet) {
            // set only once per order per lender
            orderList[lender].push(loanOrder.loanOrderHash);
            orderListIndex[loanOrder.loanOrderHash][lender] = ListIndex({
                index: orderList[lender].length-1,
                isSet: true
            });
        }

        orderList[trader].push(loanOrder.loanOrderHash);
        orderListIndex[loanOrder.loanOrderHash][trader] = ListIndex({
            index: orderList[trader].length-1,
            isSet: true
        });

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

    function _fillLoanOrder(
        LoanOrder memory loanOrder,
        address trader,
        address lender,
        address collateralTokenFilled,
        uint loanTokenAmountFilled)
        internal
        returns (uint)
    {
        uint collateralTokenAmountFilled = _getInitialCollateralRequired(
            loanOrder.loanTokenAddress,
            collateralTokenFilled,
            oracleAddresses[loanOrder.oracleAddress],
            loanTokenAmountFilled,
            loanOrder.initialMarginAmount
        );
        if (collateralTokenAmountFilled == 0) {
            revert("BZxOrderTaking::_fillLoanOrder: collateralTokenAmountFilled == 0");
        }

        // deposit collateral token
        if (! BZxVault(vaultContract).depositToken(
            collateralTokenFilled,
            trader,
            collateralTokenAmountFilled
        )) {
            revert("BZxOrderTaking::_fillLoanOrder: BZxVault.depositToken collateral failed");
        }

        // interest-free loan is permitted
        if (loanOrder.interestAmount > 0) {
            // total interest required if loan is kept until order expiration
            // unused interest at the end of a loan is refunded to the trader
            uint totalInterestRequired = _getTotalInterestRequired(
                loanOrder.loanTokenAmount,
                loanTokenAmountFilled,
                loanOrder.interestAmount,
                loanOrder.maxDurationUnixTimestampSec);

            if (totalInterestRequired > 0) {
                // deposit interest token
                if (! BZxVault(vaultContract).depositToken(
                    loanOrder.interestTokenAddress,
                    trader,
                    totalInterestRequired
                )) {
                    revert("BZxOrderTaking::_fillLoanOrder: BZxVault.depositToken interest failed");
                }
            }
        }

        // deposit loan token
        if (! BZxVault(vaultContract).depositToken(
            loanOrder.loanTokenAddress,
            lender,
            loanTokenAmountFilled
        )) {
            revert("BZxOrderTaking::_fillLoanOrder: BZxVault.depositToken loan failed");
        }

        LoanOrderAux memory loanOrderAux = orderAux[loanOrder.loanOrderHash];
        if (loanOrderAux.feeRecipientAddress != address(0)) {
            if (loanOrderAux.traderRelayFee > 0) {
                uint paidTraderFee = _safeGetPartialAmountFloor(loanTokenAmountFilled, loanOrder.loanTokenAmount, loanOrderAux.traderRelayFee);
                
                if (! BZxVault(vaultContract).transferTokenFrom(
                    bZRxTokenContract, 
                    trader,
                    loanOrderAux.feeRecipientAddress,
                    paidTraderFee
                )) {
                    revert("BZxOrderTaking::_fillLoanOrder: BZxVault.transferTokenFrom traderRelayFee failed");
                }
            }
            if (loanOrderAux.lenderRelayFee > 0) {
                uint paidLenderFee = _safeGetPartialAmountFloor(loanTokenAmountFilled, loanOrder.loanTokenAmount, loanOrderAux.lenderRelayFee);
                
                if (! BZxVault(vaultContract).transferTokenFrom(
                    bZRxTokenContract, 
                    lender,
                    loanOrderAux.feeRecipientAddress,
                    paidLenderFee
                )) {
                    revert("BZxOrderTaking::_fillLoanOrder: BZxVault.transferTokenFrom lenderRelayFee failed");
                }
            }
        }

        return collateralTokenAmountFilled;
    }
}