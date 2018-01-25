
pragma solidity 0.4.18;

contract GasRefunder {

    // If true, uses the "transfer" method, which throws on failure, reverting state.
    // If false, a failed "send" won't throw, and fails silently.
    // Note that a throw will prevent a GasRefund event.
    bool public throwOnGasRefundFail = false;

    // Refund this percentage of the calculated gas
    uint8 public refundPercent = 80;

    event GasRefund(address payer, uint gasUsed, uint currentGasPrice, uint refundAmount, bool refundSuccess);

    modifier refundsGas(address payer, uint gasPrice, uint gasUsed) {

        _; // modified function body inserted here

        sendGasRefund(
            payer,
            gasUsed,
            gasPrice
        );
    }

    modifier refundsGasAfterCollection(address payer, uint gasPrice) {
        uint startingGas = msg.gas;

        _; // modified function body inserted here
        
        sendGasRefund(
            payer,
            startingGas,
            gasPrice
        );
    }

    function sendGasRefund(
        address payer,
        uint gasUsed,
        uint gasPrice)
        internal {

        if (gasUsed == 0 || gasPrice == 0)
            return;

        gasUsed = gasUsed - msg.gas
                    - 10000; // the GasTracker zeros out persistent storage when finished
                    //+ 21000; // estimated value transfer cost

        uint refundAmount = gasUsed * gasPrice * refundPercent / 100;
                                

        if (throwOnGasRefundFail) {
            payer.transfer(refundAmount);
        }
        else {
            GasRefund(
                payer,
                gasUsed,
                gasPrice,
                refundAmount,
                payer.send(refundAmount)
            );
        }
    }

}
