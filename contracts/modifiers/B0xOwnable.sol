
pragma solidity 0.4.18;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';

// This provides a gatekeeping modifier for functions that can only be used by the b0x contract
// Since it inherits Ownable provides typical ownership functionlaity
// Owner must not be the b0x contract
contract B0xOwnable is Ownable {

    address public b0xContractAddress;

    event B0xOwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // modifier reverts if b0xContractAddress isn't set
    modifier onlyB0x() {
        require(msg.sender == b0xContractAddress);
        _;
    }

    function setB0xOwner(address newB0xContractAddress) public onlyOwner {
        require(newB0xContractAddress != address(0) && newB0xContractAddress != owner);
        B0xOwnershipTransferred(b0xContractAddress, newB0xContractAddress);
        b0xContractAddress = newB0xContractAddress;
    }
}
