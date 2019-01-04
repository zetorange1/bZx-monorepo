/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
 
pragma solidity 0.5.2;


interface ExchangeInterface {
    event LogError(uint8 indexed errorId, bytes32 indexed orderHash);

    function fillOrder(
          address[5] calldata orderAddresses,
          uint256[6] calldata orderValues,
          uint256 fillTakerTokenAmount,
          bool shouldThrowOnInsufficientBalanceOrAllowance,
          uint8 v,
          bytes32 r,
          bytes32 s)
          external
          returns (uint256 filledTakerTokenAmount);

    function fillOrdersUpTo(
        address[5][] calldata orderAddresses,
        uint256[6][] calldata orderValues,
        uint256 fillTakerTokenAmount,
        bool shouldThrowOnInsufficientBalanceOrAllowance,
        uint8[] calldata v,
        bytes32[] calldata r,
        bytes32[] calldata s)
        external
        returns (uint256);

    function isValidSignature(
        address signer,
        bytes32 hash,
        uint8 v,
        bytes32 r,
        bytes32 s)
        external
        view
        returns (bool);
}
