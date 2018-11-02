/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
 
pragma solidity 0.4.25;
pragma experimental ABIEncoderV2;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

import "../proxy/BZxProxiable.sol";

import "../BZxVault.sol";
import "../oracle/OracleInterface.sol";


// solhint-disable-next-line contract-name-camelcase
contract BZxTo0xV2_Interface {
    // solhint-disable max-line-length
    // ref: https://github.com/0xProject/0x-monorepo/blob/development/packages/contracts/src/2.0.0/protocol/Exchange/libs/LibOrder.sol
    struct OrderV2 {
        address makerAddress;           // Address that created the order.
        address takerAddress;           // Address that is allowed to fill the order. If set to 0, any address is allowed to fill the order.
        address feeRecipientAddress;    // Address that will recieve fees when order is filled.
        address senderAddress;          // Address that is allowed to call Exchange contract methods that affect this order. If set to 0, any address is allowed to call these methods.
        uint256 makerAssetAmount;       // Amount of makerAsset being offered by maker. Must be greater than 0.
        uint256 takerAssetAmount;       // Amount of takerAsset being bid on by maker. Must be greater than 0.
        uint256 makerFee;               // Amount of ZRX paid to feeRecipient by maker when order is filled. If set to 0, no transfer of ZRX from maker to feeRecipient will be attempted.
        uint256 takerFee;               // Amount of ZRX paid to feeRecipient by taker when order is filled. If set to 0, no transfer of ZRX from taker to feeRecipient will be attempted.
        uint256 expirationTimeSeconds;  // Timestamp in seconds at which order expires.
        uint256 salt;                   // Arbitrary number to facilitate uniqueness of the order's hash.
        bytes makerAssetData;           // Encoded data that can be decoded by a specified proxy contract when transferring makerAsset. The last byte references the id of this proxy.
        bytes takerAssetData;           // Encoded data that can be decoded by a specified proxy contract when transferring takerAsset. The last byte references the id of this proxy.
    }
    // solhint-enable max-line-length

   function take0xV2Trade(
        address trader,
        address vaultAddress,
        uint sourceTokenAmountToUse,
        OrderV2[] orders0x, // Array of 0x V2 order structs
        bytes[] signatures0x) // Array of signatures for each of the V2 orders
        external
        returns (
            address destTokenAddress,
            uint destTokenAmount,
            uint sourceTokenUsedAmount);
}

contract BZxTradePlacing0xV2 is BZxStorage, BZxProxiable {
    using SafeMath for uint256;

    constructor() public {}

    function()  
        public
    {
        revert("fallback not allowed");
    }

    function initialize(
        address _target)
        public
    {
        targets[bytes4(keccak256("tradePositionWith0xV2(bytes32,(address,address,address,address,uint256,uint256,uint256,uint256,uint256,uint256,bytes,bytes)[],bytes[])"))] = _target;
    }

    /// @dev Executes a 0x trade using loaned funds.
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param orders0x Array of 0x V2 order structs
    /// @param signatures0x Array of signatures for each of the V2 orders
    /// @return The amount of token received in the trade.
    function tradePositionWith0xV2(
        bytes32 loanOrderHash,
        BZxTo0xV2_Interface.OrderV2[] memory orders0x,
        bytes[] memory signatures0x)
        public
        nonReentrant
        tracksGas
        returns (uint)
    {
        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.loanTokenAddress == address(0)) {
            revert("BZxTradePlacing::tradePositionWith0x: loanOrder.loanTokenAddress == address(0)");
        }

        LoanPosition storage loanPosition = loanPositions[loanPositionsIds[loanOrderHash][msg.sender]];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            revert("BZxTradePlacing::tradePositionWith0x: loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active");
        }

        if (block.timestamp >= loanPosition.loanEndUnixTimestampSec) {
            revert("BZxTradePlacing::tradePositionWith0x: block.timestamp >= loanPosition.loanEndUnixTimestampSec");
        }

        // transfer the current position token to the BZxTo0xV2 contract
        if (!BZxVault(vaultContract).withdrawToken(
            loanPosition.positionTokenAddressFilled,
            bZxTo0xV2Contract,
            loanPosition.positionTokenAmountFilled)) {
            revert("BZxTradePlacing::tradePositionWith0x: BZxVault.withdrawToken failed");
        }

        address tradeTokenAddress;
        uint tradeTokenAmount;
        uint positionTokenUsedAmount;
        (tradeTokenAddress, tradeTokenAmount, positionTokenUsedAmount) = BZxTo0xV2_Interface(bZxTo0xV2Contract).take0xV2Trade(
            loanPosition.trader,
            vaultContract,
            loanPosition.positionTokenAmountFilled,
            orders0x, // Array of 0x V2 order structs
            signatures0x);

        if (tradeTokenAmount == 0 || positionTokenUsedAmount != loanPosition.positionTokenAmountFilled) {
            revert("BZxTradePlacing::tradePositionWith0x: tradeTokenAmount == 0 || positionTokenUsedAmount != loanPosition.positionTokenAmountFilled");
        }

        // trade can't trigger liquidation
        if (OracleInterface(oracleAddresses[loanOrder.oracleAddress]).shouldLiquidate(
                loanOrderHash,
                loanPosition.trader,
                loanOrder.loanTokenAddress,
                tradeTokenAddress,
                loanPosition.collateralTokenAddressFilled,
                loanPosition.loanTokenAmountFilled,
                tradeTokenAmount,
                loanPosition.collateralTokenAmountFilled,
                loanOrder.maintenanceMarginAmount)) {
            revert("BZxTradePlacing::tradePositionWith0x: trade triggers liquidation");
        }

        emit LogPositionTraded(
            loanOrderHash,
            loanPosition.trader,
            loanPosition.positionTokenAddressFilled,
            tradeTokenAddress,
            positionTokenUsedAmount,
            tradeTokenAmount,
            loanPosition.positionId
        );

        // the trade token becomes the new position token
        loanPosition.positionTokenAddressFilled = tradeTokenAddress;
        loanPosition.positionTokenAmountFilled = tradeTokenAmount;

        if (! OracleInterface(oracleAddresses[loanOrder.oracleAddress]).didTradePosition(
            loanOrder,
            loanPosition,
            gasUsed // initial used gas, collected in modifier
        )) {
            revert("BZxTradePlacing::tradePositionWith0x: OracleInterface.didTradePosition failed");
        }

        return tradeTokenAmount;
    }
}
