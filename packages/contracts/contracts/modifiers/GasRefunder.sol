/**
 * Copyright 2017-2020, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.3;

import "../openzeppelin-solidity/SafeMath.sol";


contract GasRefunder {
    using SafeMath for uint256;

    // If true, uses the "transfer" method, which throws on failure, reverting state.
    // If false, a failed "send" won't throw, and fails silently.
    // Note that a throw will prevent a GasRefund event.
    bool public throwOnGasRefundFail = false;

    event GasRefund(
        address indexed payer,
        uint256 gasUsed,
        uint256 currentGasPrice,
        uint256 refundAmount,
        bool refundSuccess
    );

    modifier refundsGas(address payer, uint256 gasPrice, uint256 gasUsed, uint256 percentMultiplier)
    {
        _; // modified function body inserted here

        calculateAndSendGasRefund(
            payer,
            gasUsed,
            gasPrice,
            percentMultiplier
        );
    }

    modifier refundsGasAfterCollection(address payer, uint256 gasPrice, uint256 percentMultiplier)
    {
        uint256 startingGas = gasleft();

        _; // modified function body inserted here

        calculateAndSendGasRefund(
            payer,
            startingGas,
            gasPrice,
            percentMultiplier
        );
    }

    function calculateAndSendGasRefund(
        address payer,
        uint256 gasUsed,
        uint256 gasPrice,
        uint256 percentMultiplier)
        internal
    {
        (uint256 refundAmount, uint256 finalGasUsed) = getGasRefund(
            gasUsed,
            gasPrice,
            percentMultiplier
        );

        if (refundAmount > 0) {
            sendGasRefund(
                payer,
                refundAmount,
                finalGasUsed,
                gasPrice
            );
        }
    }

    function getGasRefund(
        uint256 gasUsed,
        uint256 gasPrice,
        uint256 percentMultiplier)
        internal
        view
        returns (uint256 refundAmount, uint256 finalGasUsed)
    {
        if (gasUsed == 0 || gasPrice == 0)
            return (0,0);

        if (percentMultiplier == 0) // 0 percentMultiplier not allowed
            percentMultiplier = 100 * 10**18;

        finalGasUsed = gasUsed.sub(gasleft());

        refundAmount = finalGasUsed.mul(gasPrice).mul(percentMultiplier).div(10**20);
    }

    function sendGasRefund(
        address payer,
        uint256 refundAmount,
        uint256 finalGasUsed,
        uint256 gasPrice)
        internal
        returns (bool)
    {
        (bool success, ) = payer.call.value(refundAmount)("");
        require(!throwOnGasRefundFail || success, "gas refund failed");

        emit GasRefund(
            payer,
            finalGasUsed,
            gasPrice,
            refundAmount,
            success
        );

        return true;
    }
}