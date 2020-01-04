/**
 * Copyright 2017-2020, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.3;

import "../../openzeppelin-solidity/Ownable.sol";

import "./BZRxToken.sol";
import "../../shared/WETHInterface.sol";


contract BZRxTokenConvert is Ownable {
    using SafeMath for uint256;

    uint256 public tokenPrice = 73 * 10**12;    // 0.000073 ETH
    uint256 public ethCollected;

    bool public conversionAllowed = true;

    address public bZRxTokenContractAddress;    // BZRX Token
    address public bZxVaultAddress;             // bZx Vault
    address public wethContractAddress;         // WETH Token

    modifier conversionIsAllowed() {
        require(conversionAllowed, "conversion not allowed");
        _;
    }

    constructor(
        address _bZRxTokenContractAddress,
        address _bZxVaultAddress,
        address _wethContractAddress,
        uint256 _previousAmountCollected)
        public
    {
        bZRxTokenContractAddress = _bZRxTokenContractAddress;
        bZxVaultAddress = _bZxVaultAddress;
        wethContractAddress = _wethContractAddress;
        ethCollected = _previousAmountCollected;
    }

    function()
        external
        payable 
    {}

    // conforms to ERC20 transferFrom function for BZRX token support
    function transferFrom(
        address _from,
        address _to,
        uint256 _value)
        public
        conversionIsAllowed
        returns (bool)
    {
        require(msg.sender == bZxVaultAddress, "only the bZx vault can call this function");
        
        if (BZRxToken(bZRxTokenContractAddress).canTransfer(msg.sender, _from, _value)) {
            return BZRxToken(bZRxTokenContractAddress).minterTransferFrom(
                msg.sender,
                _from,
                _to,
                _value
            );
        } else {
            uint256 wethValue = _value                          // amount of BZRX
                                .mul(tokenPrice).div(10**18);   // fixed ETH price per token (0.000073 ETH)

            require(StandardToken(wethContractAddress).transferFrom(
                _from,
                address(this),
                wethValue
            ), "weth transfer failed");

            ethCollected += wethValue;

            return BZRxToken(bZRxTokenContractAddress).mint(
                _to,
                _value
            );
        }
    }

    /**
    * @dev Function to stop conversion for this contract.
    * @return True if the operation was successful.
    */
    function toggleConversionAllowed(
        bool _conversionAllowed) 
        public 
        onlyOwner 
        returns (bool)
    {
        conversionAllowed = _conversionAllowed;
        return true;
    }

    function changeTokenPrice(
        uint256 _tokenPrice) 
        public 
        onlyOwner 
        returns (bool)
    {
        tokenPrice = _tokenPrice;
        return true;
    }

    function changeBZRxTokenContract(
        address _bZRxTokenContractAddress) 
        public 
        onlyOwner 
        returns (bool)
    {
        bZRxTokenContractAddress = _bZRxTokenContractAddress;
        return true;
    }

    function changeBZxVault(
        address _bZxVaultAddress) 
        public 
        onlyOwner 
        returns (bool)
    {
        bZxVaultAddress = _bZxVaultAddress;
        return true;
    }

    function changeWethContract(
        address _wethContractAddress) 
        public 
        onlyOwner 
        returns (bool)
    {
        wethContractAddress = _wethContractAddress;
        return true;
    }

    function unwrapEth() 
        public 
        onlyOwner 
        returns (bool)
    {
        uint256 balance = StandardToken(wethContractAddress).balanceOf(address(this));
        if (balance == 0)
            return false;

        WETHInterface(wethContractAddress).withdraw(balance);
        return true;
    }

    function transferEther(
        address payable _to,
        uint256 _value)
        public
        onlyOwner
        returns (bool)
    {
        uint256 amount = _value;
        if (amount > address(this).balance) {
            amount = address(this).balance;
        }

        return (_to.send(amount)); // solhint-disable-line check-send-result, multiple-sends
    }

    function transferToken(
        address _tokenAddress,
        address _to,
        uint256 _value)
        public
        onlyOwner
        returns (bool)
    {
        uint256 balance = StandardToken(_tokenAddress).balanceOf(address(this));
        if (_value > balance) {
            return StandardToken(_tokenAddress).transfer(
                _to,
                balance
            );
        } else {
            return StandardToken(_tokenAddress).transfer(
                _to,
                _value
            );
        }
    }
}