pragma solidity ^0.4.18;

contract GasRefunder {

    // If true, uses the safer transfer method, which throws on failure, rather than send, which returns false.
    // Note that a throw will prevent a GasRefund event.
    bool public throwOnGasRefundFail = true;

    event GasRefund(uint gasUsed, uint currentGasPrice, uint refundAmount, bool refundSuccess);

    modifier refundsGas(uint gasPrice) {
        uint startingGas = msg.gas;
        require(gasPrice > 0);

        _; // modified function body inserted here
        
        // TODO (maybe): add estimated gas that will used by refund transfer to this
        uint gasUsed = startingGas - msg.gas;
        uint refundAmount = gasUsed * gasPrice 
                                + 21000; // value transfer cost

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
