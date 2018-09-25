/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

import "./BZRxToken.sol";
import "../../shared/WETHInterface.sol";


interface PriceFeed {
    function read() external view returns (bytes32);
}

contract BZRxTokenSale is Ownable {
    using SafeMath for uint256;

    struct TokenPurchases {
        uint totalETH;
        uint totalTokens;
        uint totalTokenBonus;
    }

    event BonusChanged(uint oldBonus, uint newBonus);
    event TokenPurchase(address indexed buyer, uint ethAmount, uint ethRate, uint tokensReceived);
    
    event SaleOpened(uint bonusMultiplier);
    event SaleClosed(uint bonusMultiplier);
    
    bool public saleClosed = true;

    address public bZRxTokenContractAddress;    // BZRX Token
    address public bZxVaultAddress;             // bZx Vault
    address public wethContractAddress;         // WETH Token
    address public priceContractAddress;        // MakerDao Medianizer price feed

    // The current token bonus offered to purchasers (example: 110 == 10% bonus)
    uint public bonusMultiplier;

    uint public ethRaised;

    address[] public purchasers;
    mapping (address => TokenPurchases) public purchases;

    bool public whitelistEnforced = false;
    mapping (address => uint) public whitelist;

    modifier saleOpen() {
        require(!saleClosed, "sale is closed");
        _;
    }

    modifier whitelisted(address user, uint value) {
        require(canPurchaseAmount(user, value), "not whitelisted");
        _;
    }

    constructor(
        address _bZRxTokenContractAddress,
        address _bZxVaultAddress,
        address _wethContractAddress,
        address _priceContractAddress,
        uint _bonusMultiplier)
        public
    {
        require(_bonusMultiplier > 100);
        
        bZRxTokenContractAddress = _bZRxTokenContractAddress;
        bZxVaultAddress = _bZxVaultAddress;
        wethContractAddress = _wethContractAddress;
        priceContractAddress = _priceContractAddress;
        bonusMultiplier = _bonusMultiplier;
    }

    function()  
        public
        payable 
    {
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
        
        uint ethRate = getEthRate();

        ethRaised += msg.value;

        uint tokenAmount = msg.value                        // amount of ETH sent
                            .mul(ethRate).div(10**18)       // curent ETH/USD rate
                            .mul(1000).div(73);             // fixed price per token $0.073

        uint tokenAmountAndBonus = tokenAmount
                                            .mul(bonusMultiplier).div(100);

        TokenPurchases storage purchase = purchases[msg.sender];
        
        if (purchase.totalETH == 0) {
            purchasers.push(msg.sender);
        }
        
        purchase.totalETH += msg.value;
        purchase.totalTokens += tokenAmountAndBonus;
        purchase.totalTokenBonus += tokenAmountAndBonus.sub(tokenAmount);

        emit TokenPurchase(msg.sender, msg.value, ethRate, tokenAmountAndBonus);

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
            uint ethRate = getEthRate();
            
            uint wethValue = _value                             // amount of BZRX
                                .mul(73).div(1000)              // fixed price per token $0.073
                                .mul(10**18).div(ethRate);      // curent ETH/USD rate

            // discount on purchase
            wethValue -= wethValue.mul(bonusMultiplier).div(100).sub(wethValue);

            require(canPurchaseAmount(_from, wethValue), "not whitelisted");

            require(StandardToken(wethContractAddress).transferFrom(
                _from,
                this,
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

    function changePriceContract(
        address _priceContractAddress) 
        public 
        onlyOwner 
        returns (bool)
    {
        priceContractAddress = _priceContractAddress;
        return true;
    }

    function changeBonusMultiplier(
        uint _newBonusMultiplier) 
        public 
        onlyOwner 
        returns (bool)
    {
        require(bonusMultiplier != _newBonusMultiplier && _newBonusMultiplier > 100);
        emit BonusChanged(bonusMultiplier, _newBonusMultiplier);
        bonusMultiplier = _newBonusMultiplier;
        return true;
    }

    function unwrapEth() 
        public 
        onlyOwner 
        returns (bool)
    {
        uint balance = StandardToken(wethContractAddress).balanceOf.gas(4999)(this);
        if (balance == 0)
            return false;

        WETHInterface(wethContractAddress).withdraw(balance);
        return true;
    }

    function transferEther(
        address _to,
        uint _value)
        public
        onlyOwner
        returns (bool)
    {
        uint amount = _value;
        if (amount > address(this).balance) {
            amount = address(this).balance;
        }

        return (_to.send(amount)); // solhint-disable-line check-send-result, multiple-sends
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
        address[] _users,
        uint[] _values) 
        public 
        onlyOwner 
        returns (bool)
    {
        require(_users.length == _values.length, "users and values count mismatch");
        
        for (uint i=0; i < _users.length; i++) {
            whitelist[_users[i]] = _values[i];
        }

        return true;
    }


    function getEthRate()
        public
        view
        returns (uint)
    {
        return uint(PriceFeed(priceContractAddress).read());
    }

    function canPurchaseAmount(
        address _user,
        uint _value)
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