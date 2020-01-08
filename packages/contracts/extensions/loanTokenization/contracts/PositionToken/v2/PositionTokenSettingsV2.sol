/**
 * Copyright 2017-2020, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./SplittableTokenStorageV2.sol";


interface IBZxSettings {
    function withdrawCollateral(
        bytes32 loanOrderHash,
        uint256 withdrawAmount)
        external
        returns (uint256 amountWithdrawn);
}

contract PositionTokenSettingsV2 is SplittableTokenStorageV2 {
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

    function setLeverageValue(
        uint256 _leverageAmount,
        bool _newFormat,
        bytes32 _loanOrderHash)
        public
        onlyAdmin
    {
        // collateralTokenAddress == tradeTokenAddress
        leverageAmount = !_newFormat ?
            _leverageAmount :
            uint256(keccak256(abi.encodePacked(_leverageAmount,tradeTokenAddress)));

        loanOrderHash = _loanOrderHash;
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
}
