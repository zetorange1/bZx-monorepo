/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/DetailedERC20.sol";
import "../UnlimitedAllowanceToken.sol";


contract BZRxToken is UnlimitedAllowanceToken, DetailedERC20, Ownable {

    event Mint(address indexed to, uint256 amount);
    event MintFinished();
    event LockingFinished();

    bool public mintingFinished = false;
    bool public lockingFinished = false;

    mapping (address => bool) public minters;

    modifier canMint() {
        require(!mintingFinished);
        _;
    }

    modifier hasMintPermission() {
        require(minters[msg.sender]);
        _;
    }

    modifier isLocked() {
        require(!lockingFinished);
        _;
    }

    constructor()
        public
        DetailedERC20(
            "bZx Protocol Token",
            "BZRX", 
            18
        )
    {
        minters[msg.sender] = true;
    }

    /// @dev ERC20 transferFrom function
    /// @param _from Address to transfer from.
    /// @param _to Address to transfer to.
    /// @param _value Amount to transfer.
    /// @return Success of transfer.
    function transferFrom(
        address _from,
        address _to,
        uint256 _value)
        public
        returns (bool)
    {
        if (lockingFinished || minters[msg.sender]) {
            return super.transferFrom(
                _from,
                _to,
                _value
            );
        }

        revert("this token is locked for transfers");
    }

    /// @dev ERC20 transfer function
    /// @param _to Address to transfer to.
    /// @param _value Amount to transfer.
    /// @return Success of transfer.
    function transfer(
        address _to, 
        uint256 _value) 
        public 
        returns (bool)
    {
        if (lockingFinished || minters[msg.sender]) {
            return super.transfer(
                _to,
                _value
            );
        }

        revert("this token is locked for transfers");
    }

    /// @dev Allows minter to initiate a transfer on behalf of another spender
    /// @param _spender Minter with permission to spend.
    /// @param _from Address to transfer from.
    /// @param _to Address to transfer to.
    /// @param _value Amount to transfer.
    /// @return Success of transfer.
    function minterTransferFrom(
        address _spender,
        address _from,
        address _to,
        uint256 _value)
        public
        hasMintPermission
        canMint
        returns (bool)
    {
        require(canTransfer(
            _spender,
            _from,
            _value),
            "canTransfer is false");

        require(_to != address(0), "token burn not allowed");

        uint allowance = allowed[_from][_spender];
        balances[_from] = balances[_from].sub(_value);
        balances[_to] = balances[_to].add(_value);
        if (allowance < MAX_UINT) {
            allowed[_from][_spender] = allowance.sub(_value);
        }
        emit Transfer(_from, _to, _value);
        return true;
    }

    /**
    * @dev Function to mint tokens
    * @param _to The address that will receive the minted tokens.
    * @param _amount The amount of tokens to mint.
    * @return A boolean that indicates if the operation was successful.
    */
    function mint(
        address _to,
        uint256 _amount)
        public
        hasMintPermission
        canMint
        returns (bool)
    {
        require(_to != address(0), "token burn not allowed");
        totalSupply_ = totalSupply_.add(_amount);
        balances[_to] = balances[_to].add(_amount);
        emit Mint(_to, _amount);
        emit Transfer(address(0), _to, _amount);
        return true;
    }

    /**
    * @dev Function to stop minting new tokens.
    * @return True if the operation was successful.
    */
    function finishMinting() 
        public 
        onlyOwner 
        canMint 
    {
        mintingFinished = true;
        emit MintFinished();
    }

    /**
    * @dev Function to stop locking token.
    * @return True if the operation was successful.
    */
    function finishLocking() 
        public 
        onlyOwner 
        isLocked 
    {
        lockingFinished = true;
        emit LockingFinished();
    }

    /**
    * @dev Function to add minter address.
    * @return True if the operation was successful.
    */
    function addMinter(
        address _minter) 
        public 
        onlyOwner 
        canMint 
    {
        minters[_minter] = true;
    }

    /**
    * @dev Function to remove minter address.
    * @return True if the operation was successful.
    */
    function removeMinter(
        address _minter) 
        public 
        onlyOwner 
        canMint 
    {
        minters[_minter] = false;
    }

    /**
    * @dev Function to check balance and allowance for a spender.
    * @return True transfer will succeed based on balance and allowance.
    */
    function canTransfer(
        address _spender,
        address _from,
        uint256 _value)
        public
        view
        returns (bool)
    {
        return (
            balances[_from] >= _value && 
            (_spender == _from || allowed[_from][_spender] >= _value)
        );
    }
}