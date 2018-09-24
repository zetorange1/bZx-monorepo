/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
 
pragma solidity 0.4.24;


interface WETHInterface {
    function deposit() external payable;
    function withdraw(uint wad) external;
}
