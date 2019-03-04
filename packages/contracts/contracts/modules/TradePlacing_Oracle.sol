/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
 
pragma solidity 0.5.3;
pragma experimental ABIEncoderV2;

import "../openzeppelin-solidity/Math.sol";

import "../proxy/BZxProxiable.sol";
import "../shared/MiscFunctions.sol";

import "../BZxVault.sol";
import "../oracle/OracleInterface.sol";

import "../tokens/EIP20.sol";

contract TradePlacing_Oracle is BZxStorage, BZxProxiable, MiscFunctions {
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
        
        targets[bytes4(keccak256("tradePositionWithOracle(bytes32,address)"))] = _target;
    }

    /// @dev Executes a market order trade using the oracle contract specified in the loan referenced by loanOrderHash
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param tradeTokenAddress The address of the token to buy in the trade
    /// @return The amount of token received in the trade.
    function tradePositionWithOracle(
        bytes32 loanOrderHash,
        address tradeTokenAddress)
        external
        nonReentrant
        tracksGas
        returns (uint256)
    {
        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.loanTokenAddress == address(0)) {
            revert("BZxTradePlacing::tradePositionWithOracle: loanOrder.loanTokenAddress == address(0)");
        }

        LoanPosition storage loanPosition = loanPositions[loanPositionsIds[loanOrderHash][msg.sender]];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            revert("BZxTradePlacing::tradePositionWithOracle: loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active");
        }

        if (tradeTokenAddress == loanPosition.positionTokenAddressFilled) {
            revert("BZxTradePlacing::tradePositionWithOracle: tradeTokenAddress == loanPosition.positionTokenAddressFilled");
        }

        (uint256 tradeTokenAmount, uint256 positionTokenAmountUsed) = _tradePositionWithOracle(
            loanOrder,
            loanPosition,
            tradeTokenAddress,
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
                revert("BZxTradePlacing::tradePositionWithOracle: BZxVault.withdrawToken untradeable token failed");
            }
        }

        if (tradeTokenAmount == 0) {
            revert("BZxTradePlacing::tradePositionWithOracle: tradeTokenAmount == 0");
        }

        emit LogPositionTraded(
            loanOrderHash,
            loanPosition.trader,
            loanPosition.positionTokenAddressFilled,
            tradeTokenAddress,
            loanPosition.positionTokenAmountFilled,
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
            revert("BZxTradePlacing::tradePositionWithOracle: OracleInterface.didTradePosition");
        }

        return tradeTokenAmount;
    }
}
