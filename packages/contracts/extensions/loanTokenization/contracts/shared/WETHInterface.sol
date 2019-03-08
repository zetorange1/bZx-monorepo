/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
 
pragma solidity 0.5.5;


interface WETHInterface {
    function deposit() external payable;
    function withdraw(uint256 wad) external;
}
