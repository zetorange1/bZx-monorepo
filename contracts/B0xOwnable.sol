pragma solidity ^0.4.18;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';

contract B0xOwnable is Ownable {

    address public b0xContractAddress;

    event B0xOwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyB0x() {
        require(b0xContractAddress != address(0));
        require(msg.sender == b0xContractAddress);
        _;
    }

    function setB0xOwner(address newB0xContractAddress) public onlyOwner {
        require(newB0xContractAddress != address(0));
        B0xOwnershipTransferred(b0xContractAddress, newB0xContractAddress);
        b0xContractAddress = newB0xContractAddress;
    }
}
