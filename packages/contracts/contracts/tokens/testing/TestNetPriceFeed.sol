
pragma solidity 0.4.24;

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