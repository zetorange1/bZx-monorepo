/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.4.25;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";


contract TestNetPriceFeed is Ownable {

    uint public ethPrice = 210 ether;

    function read() 
        public 
        view 
        returns (bytes32)
    {
        return bytes32(ethPrice);
    }
    
    function changeEthPrice(
        uint _newPrice) 
        public 
        onlyOwner
        returns (bool)
    {
        ethPrice = _newPrice;
        return true;
    }
}