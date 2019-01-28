/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.3;
pragma experimental ABIEncoderV2;

import "../openzeppelin-solidity/Math.sol";

import "../proxy/BZxProxiable.sol";
import "../shared/OrderTakingFunctions.sol";


contract OrderTaking_takeLoanOrderOnChainAsTraderByDelegate is BZxStorage, BZxProxiable, OrderTakingFunctions {
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
        targets[bytes4(keccak256("takeLoanOrderOnChainAsTraderByDelegate(address,bytes32,address,uint256,address,bool)"))] = _target;
    }

    /// @dev Allows a delegate to take an on-chain order on behalf of a trader
    /// @param trader The trader to which to fill the order.
    /// @param loanOrderHash A unique hash representing the loan order.
    /// @param collateralTokenFilled Desired address of the collateralTokenAddress the trader wants to use.
    /// @param loanTokenAmountFilled Desired amount of loanToken the trader wants to borrow.
    /// @param tradeTokenToFillAddress If non-zero address, will swap the loanToken for this asset using the oracle.
    /// @param withdrawOnOpen If true, will overcollateralize the loan and withdraw the position token to the trader's wallet. If set, tradeTokenToFillAddress is ignored.
    /// @return Total amount of loanToken borrowed (uint256).
    /// @dev Traders can take a portion of the total coin being lended (loanTokenAmountFilled).
    /// @dev Traders also specify the token that will fill the margin requirement if they are taking the order.
    function takeLoanOrderOnChainAsTraderByDelegate(
        address trader,
        bytes32 loanOrderHash,
        address collateralTokenFilled,
        uint256 loanTokenAmountFilled,
        address tradeTokenToFillAddress,
        bool withdrawOnOpen)
        external
        nonReentrant
        tracksGas
        returns (uint256)
    {
        require(allowedValidators[trader][msg.sender], "takeLoanOrderOnChainAsTraderByDelegate: not authorized");
        
        LoanOrder memory loanOrder = _takeLoanOrder(
            trader,
            loanOrderHash,
            collateralTokenFilled,
            loanTokenAmountFilled,
            1, // takerRole
            withdrawOnOpen
        );

        if (!withdrawOnOpen && tradeTokenToFillAddress != address(0)) {
            _fillTradeToken(
                loanOrder,
                trader,
                tradeTokenToFillAddress
            );
        }

        return loanTokenAmountFilled;
    }
}
