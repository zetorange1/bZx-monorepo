pragma solidity ^0.4.18;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';

/**
 * @title Upgradeable
 * @dev Ownable contract that can be upgraded
 */
contract Upgradeable is Ownable {
    address public UPGRADED_TO_ADDRESS;

    modifier wasUpgraded() {
        require(UPGRADED_TO_ADDRESS != address(0));
        _;
    }

    modifier wasNotUpgraded() {
        require(UPGRADED_TO_ADDRESS == address(0));
        _;
    }

    event ContractUpgraded(address indexed newAddress);

    function setUpgraded(address newAddress) public wasNotUpgraded onlyOwner {
        UPGRADED_TO_ADDRESS = newAddress;
        ContractUpgraded(newAddress);
    }
}
