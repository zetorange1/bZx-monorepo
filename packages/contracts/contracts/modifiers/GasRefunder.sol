
pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";


contract GasRefunder {
    using SafeMath for uint256;

    // If true, uses the "transfer" method, which throws on failure, reverting state.
    // If false, a failed "send" won't throw, and fails silently.
    // Note that a throw will prevent a GasRefund event.
    bool public throwOnGasRefundFail = false;

    event GasRefund(address payer, uint gasUsed, uint currentGasPrice, uint refundAmount, bool refundSuccess);

    modifier refundsGas(address payer, uint gasPrice, uint gasUsed, uint percentMultiplier)
    {
        _; // modified function body inserted here

        calculateAndSendRefund(
            payer,
            gasUsed,
            gasPrice,
            percentMultiplier
        );
    }

    modifier refundsGasAfterCollection(address payer, uint gasPrice, uint percentMultiplier)
    {
        uint startingGas = gasleft();

        _; // modified function body inserted here
        
        calculateAndSendRefund(
            payer,
            startingGas,
            gasPrice,
            percentMultiplier
        );
    }

    function calculateAndSendRefund(
        address payer,
        uint gasUsed,
        uint gasPrice,
        uint percentMultiplier)
        internal
    {

        if (gasUsed == 0 || gasPrice == 0)
            return;

        gasUsed = gasUsed - gasleft();

        sendRefund(
            payer,
            gasUsed,
            gasPrice,
            percentMultiplier
        );
    }

    function sendRefund(
        address payer,
        uint gasUsed,
        uint gasPrice,
        uint percentMultiplier)
        internal
        returns (bool)
    {
        if (percentMultiplier == 0) // 0 percentMultiplier not allowed
            percentMultiplier = 100;
        
        uint refundAmount = gasUsed.mul(gasPrice).mul(percentMultiplier).div(100);

        if (throwOnGasRefundFail) {
            payer.transfer(refundAmount);
            emit GasRefund(
                payer,
                gasUsed,
                gasPrice,
                refundAmount,
                true
            );
        } else {
            // allow payer.send(refundAmount) to silently fail
            emit GasRefund(
                payer,
                gasUsed,
                gasPrice,
                refundAmount,
                payer.send(refundAmount) // solhint-disable-line check-send-result
            );
        }

        return true;
    }

}
