/**
 * Copyright 2017-2020, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./SplittableTokenStorage.sol";


interface IBZxSettings {
    function withdrawCollateral(
        bytes32 loanOrderHash,
        uint256 withdrawAmount)
        external
        returns (uint256 amountWithdrawn);
}

contract PositionTokenSettings is SplittableTokenStorage {
    using SafeMath for uint256;

    modifier onlyAdmin() {
        require(msg.sender == address(this) ||
            msg.sender == owner, "unauthorized");
        _;
    }

    function setLoanTokenLender(
        address _lender)
        public
        onlyAdmin
    {
        loanTokenLender = _lender;
    }

    function setBZxOracle(
        address _addr)
        public
        onlyAdmin
    {
        bZxOracle = _addr;
    }

    function setLeverageAmount(
        uint256 _amount)
        public
        onlyAdmin
    {
        leverageAmount = _amount;
    }

    function setInitialPrice(
        uint256 _value)
        public
        onlyAdmin
    {
        require(_value != 0, "value can't be 0");
        initialPrice = _value;
    }

    function setSplitValue(
        uint256 _value)
        public
        onlyAdmin
    {
        require(_value != 0, "value can't be 0");
        splitFactor = _value;
    }

    function withdrawCollateral(
        uint256 withdrawAmount)
        public
        onlyAdmin
        returns (uint256 amountWithdrawn)
    {
        return IBZxSettings(bZxContract).withdrawCollateral(
            loanOrderHash,
            withdrawAmount
        );
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

    function setApprovals()
        public
        returns (bool)
    {
        require(ERC20(tradeTokenAddress).approve(loanTokenLender, 0), "token approval reset failed");
        require(ERC20(tradeTokenAddress).approve(loanTokenLender, MAX_UINT), "token approval failed");
        require(ERC20(loanTokenAddress).approve(loanTokenLender, 0), "token approval reset failed");
        require(ERC20(loanTokenAddress).approve(loanTokenLender, MAX_UINT), "token approval failed");
    }

    function initialize(
        address _bZxContract,
        address _bZxVault,
        address _bZxOracle,
        address _wethContract,
        address _loanTokenAddress,
        address _tradeTokenAddress,
        address _lender,
        uint256 _leverageAmount,
        bytes32 _loanOrderHash,
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
        tradeTokenAddress = _tradeTokenAddress;
        loanTokenLender = _lender;

        loanOrderHash = _loanOrderHash;
        leverageAmount = _leverageAmount;

        name = _name;
        symbol = _symbol;
        decimals = 18;

        initialPrice = 10**21; // starting price of 1,000

        setApprovals();

        isInitialized_ = true;
    }
}
