pragma solidity ^0.4.18;

// supports a single EMA calculated for the inheriting contract
contract EMACollector {

    uint public emaValue; // the last ema calculated
    uint8 public emaPeriods; // averaging periods for EMA calculation

    function updateEMA(uint value) 
        internal {
        /*
            Multiplier: 2 / (emaPeriods + 1)
            EMA: (LastestValue - PreviousEMA) * Multiplier + PreviousEMA 
        */

        // calculate new EMA
        emaValue = (value - emaValue) * ( 2 / (emaPeriods + 1) ) + emaValue;
    }
}
