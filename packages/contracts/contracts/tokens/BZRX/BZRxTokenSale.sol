/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.2;

import "../../openzeppelin-solidity/Ownable.sol";

import "./BZRxToken.sol";
import "../../shared/WETHInterface.sol";


contract BZRxTokenSale is Ownable {
    using SafeMath for uint256;

    uint256 public constant tokenPrice = 73 * 10**12; // 0.000073 ETH

    struct TokenPurchases {
        uint256 totalETH;
        uint256 totalTokens;
        uint256 totalTokenBonus;
    }

    event BonusChanged(uint256 oldBonus, uint256 newBonus);
    event TokenPurchase(address indexed buyer, uint256 ethAmount, uint256 tokensReceived);
    
    event SaleOpened(uint256 bonusMultiplier);
    event SaleClosed(uint256 bonusMultiplier);
    
    bool public saleClosed = true;

    address public bZRxTokenContractAddress;    // BZRX Token
    address public bZxVaultAddress;             // bZx Vault
    address public wethContractAddress;         // WETH Token

    // The current token bonus offered to purchasers (example: 110 == 10% bonus)
    uint256 public bonusMultiplier;

    uint256 public ethRaised;

    address[] public purchasers;
    mapping (address => TokenPurchases) public purchases;

    bool public whitelistEnforced = false;
    mapping (address => uint) public whitelist;

    modifier saleOpen() {
        require(!saleClosed, "sale is closed");
        _;
    }

    modifier whitelisted(address user, uint256 value) {
        require(canPurchaseAmount(user, value), "not whitelisted");
        _;
    }

    constructor(
        address _bZRxTokenContractAddress,
        address _bZxVaultAddress,
        address _wethContractAddress,
        uint256 _bonusMultiplier,
        uint256 _previousAmountRaised)
        public
    {
        require(_bonusMultiplier > 100 * 10**18);
        
        bZRxTokenContractAddress = _bZRxTokenContractAddress;
        bZxVaultAddress = _bZxVaultAddress;
        wethContractAddress = _wethContractAddress;
        bonusMultiplier = _bonusMultiplier;
        ethRaised = _previousAmountRaised;
    }

    function()
        external
        payable 
    {
        if (msg.sender != wethContractAddress && msg.sender != owner)
            buyToken();
    }

    function buyToken()
        public
        payable 
        saleOpen
        whitelisted(msg.sender, msg.value)
        returns (bool)
    {
        require(msg.value > 0, "no ether sent");
        
        ethRaised += msg.value;

        uint256 tokenAmount = msg.value                        // amount of ETH sent
                            .mul(10**18).div(tokenPrice);   // fixed ETH price per token (0.000073 ETH)

        uint256 tokenAmountAndBonus = tokenAmount
                                        .mul(bonusMultiplier).div(10**20);

        TokenPurchases storage purchase = purchases[msg.sender];
        
        if (purchase.totalETH == 0) {
            purchasers.push(msg.sender);
        }
        
        purchase.totalETH += msg.value;
        purchase.totalTokens += tokenAmountAndBonus;
        purchase.totalTokenBonus += tokenAmountAndBonus.sub(tokenAmount);

        emit TokenPurchase(msg.sender, msg.value, tokenAmountAndBonus);

        return BZRxToken(bZRxTokenContractAddress).mint(
            msg.sender,
            tokenAmountAndBonus
        );
    }

    // conforms to ERC20 transferFrom function for BZRX token support
    function transferFrom(
        address _from,
        address _to,
        uint256 _value)
        public
        saleOpen
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
            uint256 wethValue = _value                             // amount of BZRX
                                .mul(tokenPrice).div(10**18);   // fixed ETH price per token (0.000073 ETH)

            require(canPurchaseAmount(_from, wethValue), "not whitelisted");

            require(StandardToken(wethContractAddress).transferFrom(
                _from,
                address(this),
                wethValue
            ), "weth transfer failed");

            ethRaised += wethValue;

            TokenPurchases storage purchase = purchases[_from];

            if (purchase.totalETH == 0) {
                purchasers.push(_from);
            }

            purchase.totalETH += wethValue;
            purchase.totalTokens += _value;

            return BZRxToken(bZRxTokenContractAddress).mint(
                _to,
                _value
            );
        }
    }

    /**
    * @dev Function to close the token sale for this contract.
    * @return True if the operation was successful.
    */
    function closeSale(
        bool _closed) 
        public 
        onlyOwner 
        returns (bool)
    {
        saleClosed = _closed;

        if (_closed)
            emit SaleClosed(bonusMultiplier);
        else
            emit SaleOpened(bonusMultiplier);

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

    function changeBonusMultiplier(
        uint256 _newBonusMultiplier) 
        public 
        onlyOwner 
        returns (bool)
    {
        require(bonusMultiplier != _newBonusMultiplier && _newBonusMultiplier > 100 * 10**18);
        emit BonusChanged(bonusMultiplier, _newBonusMultiplier);
        bonusMultiplier = _newBonusMultiplier;
        return true;
    }

    function unwrapEth() 
        public 
        onlyOwner 
        returns (bool)
    {
        uint256 balance = StandardToken(wethContractAddress).balanceOf.gas(4999)(address(this));
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
        uint256 balance = StandardToken(_tokenAddress).balanceOf.gas(4999)(address(this));
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

    function enforceWhitelist(
        bool _isEnforced) 
        public 
        onlyOwner 
        returns (bool)
    {
        whitelistEnforced = _isEnforced;

        return true;
    }

    function setWhitelist(
        address[] memory _users,
        uint256[] memory _values) 
        public 
        onlyOwner 
        returns (bool)
    {
        require(_users.length == _values.length, "users and values count mismatch");
        
        for (uint256 i=0; i < _users.length; i++) {
            whitelist[_users[i]] = _values[i];
        }

        return true;
    }


    function canPurchaseAmount(
        address _user,
        uint256 _value)
        public
        view
        returns (bool)
    {
        if (!whitelistEnforced || (whitelist[_user] > 0 && purchases[_user].totalETH.add(_value) <= whitelist[_user])) {
            return true;
        } else {
            return false;
        }
    }
}