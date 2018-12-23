/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.2;
pragma experimental ABIEncoderV2;

import "../openzeppelin-solidity/Math.sol";

import "../proxy/BZxProxiable.sol";
import "../shared/OrderTakingFunctions.sol";


contract OrderTaking_takeLoanOrderOnChainAsLender is BZxStorage, BZxProxiable, OrderTakingFunctions {
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
        targets[bytes4(keccak256("takeLoanOrderOnChainAsLender(bytes32)"))] = _target;
    }

    /// @dev Takes the order as lender that's already pushed on chain
    /// @param loanOrderHash A unique hash representing the loan order.
    /// @return Total amount of loanToken borrowed (uint).
    /// @dev Lenders have to fill the entire desired amount the trader wants to borrow.
    /// @dev This makes loanTokenAmountFilled = loanOrder.loanTokenAmount.
    function takeLoanOrderOnChainAsLender(
        bytes32 loanOrderHash)
        external
        nonReentrant
        tracksGas
        returns (uint)
    {
        // lenders have to fill the entire uncanceled loanTokenAmount
        uint loanTokenAmountFilled = orders[loanOrderHash].loanTokenAmount.sub(_getUnavailableLoanTokenAmount(loanOrderHash));
        LoanOrder memory loanOrder = _takeLoanOrder(
            loanOrderHash,
            orders[loanOrderHash].collateralTokenAddress,
            loanTokenAmountFilled,
            0, // takerRole
            orderAux[loanOrderHash].withdrawOnOpen
        );

        if (!orderAux[loanOrderHash].withdrawOnOpen && orderAux[loanOrderHash].tradeTokenToFillAddress != address(0)) {
            _fillTradeToken(
                loanOrder,
                orderAux[loanOrderHash].makerAddress, // trader
                orderAux[loanOrderHash].tradeTokenToFillAddress
            );
        }

        return loanTokenAmountFilled;
    }
}
