/**
 * Copyright 2017-2020, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./AdvancedTokenStorage.sol";


interface IBZxSettings {
    function updateOrderObjectParamsBatch(
        AdvancedTokenStorage.LoanData[] calldata loanDataArr)
        external
        returns (bool);
}

interface IBZxOracleSettings {
    function interestFeePercent()
        external
        view
        returns (uint256);
}

contract LoanTokenSettings is AdvancedTokenStorage {
    using SafeMath for uint256;

    modifier onlyAdmin() {
        require(msg.sender == address(this) ||
            msg.sender == owner, "unauthorized");
        _;
    }

    function()
        external
    {
        revert("invalid");
    }

    function setLoanDataParamsBatch(
        LoanData[] memory loanDataArr)
        public
        onlyAdmin
    {
        for (uint256 i=0; i < loanDataArr.length; i++) {
            loanOrderData[loanDataArr[i].loanOrderHash] = loanDataArr[i];
        }

        require(IBZxSettings(bZxContract).updateOrderObjectParamsBatch(
            loanDataArr),
            "failed"
        );
    }

    function migrateLeverage(
        uint256 oldLeverageValue,
        uint256 newLeverageValue)
        public
        onlyAdmin
    {
        require(oldLeverageValue != newLeverageValue, "mismatch");
        bytes32 loanOrderHash = loanOrderHashes[oldLeverageValue];
        LoanData storage loanData = loanOrderData[loanOrderHash];
        require(loanData.initialMarginAmount != 0, "loan not found");

        delete loanOrderHashes[oldLeverageValue];

        leverageList[loanData.index] = newLeverageValue;
        loanData.leverageAmount = newLeverageValue;
        loanOrderHashes[newLeverageValue] = loanOrderHash;
    }

    function setLowerAdminValues(
        address _lowerAdmin,
        address _lowerAdminContract)
        public
        onlyAdmin
    {
        //keccak256("iToken_LowerAdminAddress"), keccak256("iToken_LowerAdminContract")
        assembly {
            sstore(0x7ad06df6a0af6bd602d90db766e0d5f253b45187c3717a0f9026ea8b10ff0d4b, _lowerAdmin)
            sstore(0x34b31cff1dbd8374124bd4505521fc29cab0f9554a5386ba7d784a4e611c7e31, _lowerAdminContract)
        }
    }

    function setInterestFeePercent(
        uint256 _newRate)
        public
        onlyAdmin
    {
        require(_newRate <= 10**20, "");
        spreadMultiplier = SafeMath.sub(10**20, _newRate);
    }

    function setBZxOracle(
        address _addr)
        public
        onlyAdmin
    {
        bZxOracle = _addr;
    }

    function setTokenizedRegistry(
        address _addr)
        public
        onlyAdmin
    {
        tokenizedRegistry = _addr;
    }

    function setWethContract(
        address _addr)
        public
        onlyAdmin
    {
        wethContract = _addr;
    }

    function setDisplayParams(
        string memory _name,
        string memory _symbol)
        public
        onlyAdmin
    {
        name = _name;
        symbol = _symbol;
    }

    function recoverEther(
        address receiver,
        uint256 amount)
        public
        onlyAdmin
    {
        uint256 balance = address(this).balance;
        if (balance < amount)
            amount = balance;

        (bool success,) = receiver.call.value(amount)("");
        require(success,
            "transfer failed"
        );
    }

    function recoverToken(
        address tokenAddress,
        address receiver,
        uint256 amount)
        public
        onlyAdmin
    {
        require(tokenAddress != loanTokenAddress, "invalid token");

        ERC20 token = ERC20(tokenAddress);

        uint256 balance = token.balanceOf(address(this));
        if (balance < amount)
            amount = balance;

        require(token.transfer(
            receiver,
            amount),
            "transfer failed"
        );
    }

    function initialize(
        address _bZxContract,
        address _bZxVault,
        address _bZxOracle,
        address _wethContract,
        address _loanTokenAddress,
        address _tokenizedRegistry,
        string memory _name,
        string memory _symbol)
        public
        onlyAdmin
    {
        require (!isInitialized_);

        bZxContract = _bZxContract;
        bZxVault = _bZxVault;
        bZxOracle = _bZxOracle;
        wethContract = _wethContract;
        loanTokenAddress = _loanTokenAddress;
        tokenizedRegistry = _tokenizedRegistry;

        name = _name;
        symbol = _symbol;
        decimals = EIP20(loanTokenAddress).decimals();

        spreadMultiplier = SafeMath.sub(10**20, IBZxOracleSettings(_bZxOracle).interestFeePercent());

        initialPrice = 10**18; // starting price of 1

        isInitialized_ = true;
    }
}
