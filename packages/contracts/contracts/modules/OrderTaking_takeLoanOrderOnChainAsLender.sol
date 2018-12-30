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
        LoanOrderAux memory loanOrderAux = orderAux[loanOrderHash];
        
        // lenders have to fill the entire uncanceled loanTokenAmount
        uint256 loanTokenAmountFilled = orders[loanOrderHash].loanTokenAmount.sub(_getUnavailableLoanTokenAmount(loanOrderHash));
        LoanOrder memory loanOrder = _takeLoanOrder(
            loanOrderHash,
            orders[loanOrderHash].collateralTokenAddress,
            loanTokenAmountFilled,
            0, // takerRole
            loanOrderAux.withdrawOnOpen
        );

        if (!loanOrderAux.withdrawOnOpen && loanOrderAux.tradeTokenToFillAddress != address(0)) {
            _fillTradeToken(
                loanOrder,
                loanOrderAux.makerAddress, // trader
                loanOrderAux.tradeTokenToFillAddress
            );
        }

        return loanTokenAmountFilled;
    }
}
