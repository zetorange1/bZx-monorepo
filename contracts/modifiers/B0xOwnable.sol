
pragma solidity ^0.4.24;

import 'openzeppelin-solidity/contracts/ownership/Ownable.sol';

// This provides a gatekeeping modifier for functions that can only be used by the b0x contract
// Since it inherits Ownable provides typical ownership functionality with a slight modification to the transferOwnership function
// Setting owner and b0xContractAddress to the same address is not supported.
contract B0xOwnable is Ownable {

    address public b0xContractAddress;

    event B0xOwnershipTransferred(address indexed previousB0xContract, address indexed newB0xContract);

    // modifier reverts if b0xContractAddress isn't set
    modifier onlyB0x() {
        require(msg.sender == b0xContractAddress);
        _;
    }

    /**
    * @dev Allows the current owner to transfer the b0x contract owner to a new contract address
    * @param newB0xContractAddress The b0x contract address to transfer ownership to.
    */
    function transferB0xOwnership(address newB0xContractAddress) public onlyOwner {
        require(newB0xContractAddress != address(0) && newB0xContractAddress != owner);
        emit B0xOwnershipTransferred(b0xContractAddress, newB0xContractAddress);
        b0xContractAddress = newB0xContractAddress;
    }

    /**
    * @dev Allows the current owner to transfer control of the contract to a newOwner.
    * @param newOwner The address to transfer ownership to.
    * This overrides transferOwnership in Ownable to prevent setting the new owner the same as the b0xContract
    */
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0) && newOwner != b0xContractAddress);
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
