/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
 
pragma solidity 0.5.7;
pragma experimental ABIEncoderV2;

import "./shared/openzeppelin-solidity/Ownable.sol";


interface KyberNetworkInterface {
    /// @notice use token address ETH_TOKEN_ADDRESS for ether
    function getExpectedRate(
        address src,
        address dest,
        uint256 srcQty)
        external
        view
        returns (uint256 expectedRate, uint256 slippageRate);
}

// A price-feed ONLY for frond-end display.
// Do not assume precise data!
contract ReferencePriceFeed is Ownable {

    struct PriceDatum {
        uint256 rate;
        uint256 timestamp;
    }

    mapping (address => mapping (uint256 => uint256)) public prices;
    mapping (address => uint256) internal mostRecentTimestamp;

    KyberNetworkInterface public KyberContract;
    address public DAITokenAddress;

    uint256 public minPeriod = 3600;
    uint256 internal baseAmount_ = 1 ether;

    constructor(
        address _kyber,
        address _dai)
        public
    {
        KyberContract = KyberNetworkInterface(_kyber);
        DAITokenAddress = _dai;
    }

    function() 
        external
    {
        revert();
    }

    function setAssetPriceManually(
        address asset,
        uint256[] calldata rates,
        uint256[] calldata timestamps)
        external
        onlyOwner
    {
        require(rates.length > 0 
            && rates.length == timestamps.length, "param length error");

        for(uint256 i=0; i < rates.length; i++) {
            // skip 0 timestamps
            if (timestamps[i] == 0)
                continue;

            if (rates[i] > 0 && timestamps[i] > mostRecentTimestamp[asset])
                mostRecentTimestamp[asset] = timestamps[i];

            prices[asset][timestamps[i]] = rates[i];
        }
    }

    function setPricesByKyber(
        address[] calldata assets,
        uint256 timestamp) // assign to this timestamp (0 use to use the nearest minPeriod)
        external
        onlyOwner
    {
        require(assets.length > 0, "param length error");

        uint256 time;
        if (timestamp == 0) {
            time = block.timestamp / minPeriod * minPeriod;
        }

        for(uint256 i=0; i < assets.length; i++) {
            (uint256 expectedRate,) = KyberContract.getExpectedRate(
                assets[i],
                DAITokenAddress,
                baseAmount_
            );

            if (expectedRate > 0 && time > mostRecentTimestamp[assets[i]])
                mostRecentTimestamp[assets[i]] = time;

            prices[assets[i]][time] = expectedRate;
        }
    }

    function setMinPeriod(
        uint256 _period)
        external
        onlyOwner
    {
        minPeriod = _period;
    }

    function setBaseAmount(
        uint256 _baseAmount)
        external
        onlyOwner
    {
        baseAmount_ = _baseAmount;
    }

    function setKyber(
        address _kyber)
        external
        onlyOwner
    {
        KyberContract = KyberNetworkInterface(_kyber);
    }

    function getPricesForAsset(
        address asset,
        uint256 startTime, // 0 for latest time
        uint256 period,
        uint256 count)
        public
        view
        returns (PriceDatum[] memory rates)
    {
        if (startTime == 0)
            startTime = mostRecentTimestamp[asset];

        uint256 i = 0;
        rates = new PriceDatum[](count);
        for (uint256 t=startTime+period; t >= period; t-=period) {
            if (i >= count)
                break;

            rates[i] = PriceDatum({
                rate: prices[asset][t-period],
                timestamp: t-period
            });
            i++;
        }
    }

    function getSwapPrice(
        address src,
        address dest,
        uint256 srcQty)
        external
        view
        returns (uint256 expectedRate, uint256 slippageRate)
    {
        (expectedRate, slippageRate) = KyberContract.getExpectedRate(
            src,
            dest,
            srcQty
        );
    }
}
