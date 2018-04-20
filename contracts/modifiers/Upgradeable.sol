
pragma solidity ^0.4.23;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';

import '../tokens/EIP20.sol';

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
        require(newAddress != address(0) && newAddress != UPGRADED_TO_ADDRESS);
        UPGRADED_TO_ADDRESS = newAddress;
        emit ContractUpgraded(newAddress);
    }

    /**
    * @dev Reclaim all EIP20 compatible tokens
    * @param tokens List of addresses of EIP20 token contracts.
    */    
    function reclaimTokens (
        EIP20[] tokens
    ) 
        external 
        onlyOwner
    {
        _reclaimTokens(tokens, msg.sender);
    }

    /**
    * @dev Reclaim any Ether in this contract.
    * @dev This contract does not accept ether directly, but it is impossible to prevent receiving ether
    * @dev in all situations.
    */    
    function reclaimEther()
        external
        onlyOwner
    {
        require(msg.sender.send(address(this).balance));
    }
    
    /**
    * @dev Upgrade to a new version of the b0x contract
    * @param newContract Address of new b0x contract.
    */   
    function upgrade (
        address newContract
    )
        public
        onlyOwner
        wasNotUpgraded
    {
        setUpgraded(newContract);
    }
    
    function destroy (
        EIP20[] tokens
    )
        public
        onlyOwner
    {
        _destroyAndSend(tokens, msg.sender);
    }

    function destroyAndSend (
        EIP20[] tokens,
        address recipient
    ) 
        public
        onlyOwner
    {
        _destroyAndSend(tokens, recipient);
    }

    // private function to reclaim tokens
    function _reclaimTokens (
        EIP20[] tokens,
        address recipient
    ) 
        private
    {
        for(uint256 i = 0; i < tokens.length; i++) {
            uint256 balance = tokens[i].balanceOf(this);
            tokens[i].transfer(recipient, balance);
        }
    }

    // private function to destroy contract
    function _destroyAndSend (
        EIP20[] tokens,
        address recipient
    ) 
        private
        wasUpgraded
    {
        _reclaimTokens(tokens, recipient);
        selfdestruct(recipient);
    }
}
