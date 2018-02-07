
pragma solidity ^0.4.19;

import 'zeppelin-solidity/contracts/math/SafeMath.sol';

// supports a single EMA calculated for the inheriting contract
contract EMACollector {
    //using SafeMath for uint256;

    uint public emaValue; // the last ema calculated
    uint public emaPeriods; // averaging periods for EMA calculation

    event EMAUpdated(uint newEMA);

    modifier updatesEMA(uint value) {
        updateEMA(value);

        _;
    }
    
    function updateEMA(uint value) 
        internal {
        /*
            Multiplier: 2 / (emaPeriods + 1)
            EMA: (LastestValue - PreviousEMA) * Multiplier + PreviousEMA 
        */

        require(emaPeriods >= 2);

        // calculate new EMA
        emaValue = 
                SafeMath.sub(
                    SafeMath.add(
                        value / (emaPeriods + 1) * 2,   // no overflow
                        emaValue
                    ),
                    emaValue / (emaPeriods + 1) * 2     // no overflow
                );
        EMAUpdated(emaValue);
    }
}
