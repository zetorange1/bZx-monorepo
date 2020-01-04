/**
 * Copyright 2017-2020, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.3;

import "../openzeppelin-solidity/SafeMath.sol";


// supports a single EMA calculated for the inheriting contract
contract EMACollector {
    //using SafeMath for uint256;

    uint256 public emaValue; // the last ema calculated
    uint256 public emaPeriods; // averaging periods for EMA calculation

    uint256 public outlierMultiplier = 2;
    uint256 public outlierAdder = 5**9 wei; // 5 gwei

    //uint256 internal emaLastUpdate;

    //event EMAUpdated(uint256 newEMA);

    modifier updatesEMA(uint256 value)
    {
        _;

        updateEMA(value);
    }

    function updateEMA(uint256 value)
        internal
    {
        /*if (emaLastUpdate == block.timestamp)
            return;*/

        /*
            Multiplier: 2 / (emaPeriods + 1)
            EMA: (LastestValue - PreviousEMA) * Multiplier + PreviousEMA
        */

        //require(emaPeriods >= 2, "emaPeriods < 2");

        // outliers are ignored
        if (value > emaValue && value >= SafeMath.add(SafeMath.mul(outlierMultiplier, emaValue), outlierAdder))
            return;

        // calculate new EMA
        emaValue =
            SafeMath.sub(
                SafeMath.add(
                    value / (emaPeriods + 1) * 2,   // no overflow
                    emaValue
                ),
                emaValue / (emaPeriods + 1) * 2     // no overflow
            );
        //emit EMAUpdated(emaValue);

        //emaLastUpdate = block.timestamp;
    }
}
