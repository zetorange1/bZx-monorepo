/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.3;
pragma experimental ABIEncoderV2;

import "./ExchangeV2Interface.sol";
import "./LibEIP712.sol";


// ref: https://github.com/0xProject/0x-monorepo/blob/development/packages/contracts/src/2.0.0/protocol/Exchange/libs/LibOrder.sol
contract ZeroExV2Helper is LibEIP712
{
    // Allowed signature types.
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

    // Hash for the EIP712 Order Schema
    bytes32 constant internal EIP712_ORDER_SCHEMA_HASH = keccak256(abi.encodePacked(
        "Order(",
        "address makerAddress,",
        "address takerAddress,",
        "address feeRecipientAddress,",
        "address senderAddress,",
        "uint256 makerAssetAmount,",
        "uint256 takerAssetAmount,",
        "uint256 makerFee,",
        "uint256 takerFee,",
        "uint256 expirationTimeSeconds,",
        "uint256 salt,",
        "bytes makerAssetData,",
        "bytes takerAssetData",
        ")"
    ));

    constructor(
        address _exchangeV2)
        public
    {
        EIP712_DOMAIN_HASH = keccak256(abi.encode(
            EIP712_DOMAIN_SEPARATOR_SCHEMA_HASH,
            keccak256(bytes(EIP712_DOMAIN_NAME)),
            keccak256(bytes(EIP712_DOMAIN_VERSION)),
            _exchangeV2
        ));
    }

    /// @dev Calculates Keccak-256 hash of the order.
    /// @param order The order structure.
    /// @return Keccak-256 EIP712 hash of the order.
    function getOrderHash(ExchangeV2Interface.OrderV2 memory order)
        public
        view
        returns (bytes32 orderHash)
    {
        orderHash = hashEIP712Message(hashOrder(order));
        return orderHash;
    }

    /// @dev Calculates EIP712 hash of the order.
    /// @param order The order structure.
    /// @return EIP712 hash of the order.
    function hashOrder(ExchangeV2Interface.OrderV2 memory order)
        internal
        pure
        returns (bytes32 result)
    {
        bytes32 schemaHash = EIP712_ORDER_SCHEMA_HASH;
        bytes32 makerAssetDataHash = keccak256(order.makerAssetData);
        bytes32 takerAssetDataHash = keccak256(order.takerAssetData);

        // Assembly for more efficiently computing:
        // keccak256(abi.encode(
        //     order.makerAddress,
        //     order.takerAddress,
        //     order.feeRecipientAddress,
        //     order.senderAddress,
        //     order.makerAssetAmount,
        //     order.takerAssetAmount,
        //     order.makerFee,
        //     order.takerFee,
        //     order.expirationTimeSeconds,
        //     order.salt,
        //     keccak256(order.makerAssetData),
        //     keccak256(order.takerAssetData)
        // ));

        assembly {
            // Backup
            // solhint-disable-next-line space-after-comma
            let temp1 := mload(sub(order,  32))
            let temp2 := mload(add(order, 320))
            let temp3 := mload(add(order, 352))

            // Hash in place
            // solhint-disable-next-line space-after-comma
            mstore(sub(order,  32), schemaHash)
            mstore(add(order, 320), makerAssetDataHash)
            mstore(add(order, 352), takerAssetDataHash)
            result := keccak256(sub(order, 32), 416)

            // Restore
            // solhint-disable-next-line space-after-comma
            mstore(sub(order,  32), temp1)
            mstore(add(order, 320), temp2)
            mstore(add(order, 352), temp3)
        }
        return result;
    }
}
