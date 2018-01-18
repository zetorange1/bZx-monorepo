pragma solidity ^0.4.18;

import './EMACollector.sol';
import 'zeppelin-solidity/contracts/ownership/Ownable.sol';

contract GasRefunder is EMACollector, Ownable {

    // If true, uses the safer transfer method, which throws on failure, rather than send, which returns false.
    // Note that a throw will prevent a GasRefund event.
    bool public throwOnGasRefundFail = true;

    event GasRefund(uint currentGasPrice, uint refundAmount, bool refundSuccess);

    modifier refundsGas(uint gasPrice) {
        uint startingGas = msg.gas;
        require(gasPrice > 0);

        _; // modified function body inserted here
        
        // TODO (maybe): add estimated gas that will used by refund transfer to this
        uint refundAmount = (startingGas - msg.gas) * gasPrice;

        if (throwOnGasRefundFail) {
            msg.sender.transfer(refundAmount);
        }
        else {
            GasRefund(
                gasPrice,
                refundAmount,
                msg.sender.send(refundAmount)
            );
        }
    }

    function setEMAPeriods (
        uint8 _newEMAPeriods)
        public
        onlyOwner {
        require(_newEMAPeriods > 1 && _newEMAPeriods != emaPeriods);
        emaPeriods = _newEMAPeriods;
    }
}
