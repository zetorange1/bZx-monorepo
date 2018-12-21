/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.2;

import "../openzeppelin-solidity/SafeMath.sol";


contract GasRefunder {
    using SafeMath for uint256;

    // If true, uses the "transfer" method, which throws on failure, reverting state.
    // If false, a failed "send" won't throw, and fails silently.
    // Note that a throw will prevent a GasRefund event.
    bool public throwOnGasRefundFail = false;

    event GasRefund(
        address indexed payer, 
        uint gasUsed, 
        uint currentGasPrice, 
        uint refundAmount, 
        bool refundSuccess
    );

    modifier refundsGas(address payable payer, uint gasPrice, uint gasUsed, uint percentMultiplier)
    {
        _; // modified function body inserted here

        calculateAndSendGasRefund(
            payer,
            gasUsed,
            gasPrice,
            percentMultiplier
        );
    }

    modifier refundsGasAfterCollection(address payable payer, uint gasPrice, uint percentMultiplier)
    {
        uint startingGas = gasleft();

        _; // modified function body inserted here

        calculateAndSendGasRefund(
            payer,
            startingGas,
            gasPrice,
            percentMultiplier
        );
    }

    function calculateAndSendGasRefund(
        address payable payer,
        uint gasUsed,
        uint gasPrice,
        uint percentMultiplier)
        internal
    {
        (uint refundAmount, uint finalGasUsed) = getGasRefund(
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
        uint gasUsed,
        uint gasPrice,
        uint percentMultiplier)
        internal
        view
        returns (uint refundAmount, uint finalGasUsed)
    {
        if (gasUsed == 0 || gasPrice == 0)
            return (0,0);

        if (percentMultiplier == 0) // 0 percentMultiplier not allowed
            percentMultiplier = 100 * 10**18;

        finalGasUsed = gasUsed - gasleft();

        refundAmount = finalGasUsed.mul(gasPrice).mul(percentMultiplier).div(10**20);
    }

    function sendGasRefund(
        address payable payer,
        uint refundAmount,
        uint finalGasUsed,
        uint gasPrice)
        internal
        returns (bool)
    {
        if (throwOnGasRefundFail) {
            payer.transfer(refundAmount);
            emit GasRefund(
                payer,
                finalGasUsed,
                gasPrice,
                refundAmount,
                true
            );
        } else {
            // allow payer.send(refundAmount) to silently fail
            emit GasRefund(
                payer,
                finalGasUsed,
                gasPrice,
                refundAmount,
                payer.send(refundAmount) // solhint-disable-line check-send-result
            );
        }

        return true;
    }

}
