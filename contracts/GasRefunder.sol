pragma solidity ^0.4.18;

contract GasRefunder {

    // If true, uses the safer transfer method, which throws on failure, rather than send, which returns false.
    // Note that a throw will prevent a GasRefund event.
    bool public throwOnGasRefundFail = true;

    event GasRefund(uint gasUsed, uint currentGasPrice, uint refundAmount, bool refundSuccess);

    modifier refundsGas(uint gasPrice, uint gasUsed) {
        require(gasPrice > 0);

        _; // modified function body inserted here
        
        sendGasRefund(
            gasPrice,
            gasUsed
        );
    }

    modifier refundsGasAfterCollection(uint gasPrice) {
        uint startingGas = msg.gas;
        require(gasPrice > 0);

        _; // modified function body inserted here
        
        sendGasRefund(
            gasPrice,
            startingGas
        );
    }

    function sendGasRefund(
        uint gasPrice,
        uint gasUsed)
        internal {

        gasUsed = gasUsed - msg.gas;
        uint refundAmount = gasUsed * gasPrice;// +
                                //21000; // estimated value transfer cost

        if (throwOnGasRefundFail) {
            msg.sender.transfer(refundAmount);
        }
        else {
            GasRefund(
                gasUsed,
                gasPrice,
                refundAmount,
                msg.sender.send(refundAmount)
            );
        }
    }

}
