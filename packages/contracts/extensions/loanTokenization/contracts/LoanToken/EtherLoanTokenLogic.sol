/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
 
pragma solidity 0.5.9;
pragma experimental ABIEncoderV2;

import "./LoanTokenLogic.sol";


contract EtherLoanTokenLogic is LoanTokenLogic {
    using SafeMath for uint256;


    function()  
        external
        payable
    {
        if (msg.sender != wethContract)
            _mintWithEther(msg.sender);
    }


    /* Public functions */

    function mintWithEther(
        address receiver)
        external
        payable
        returns (uint256 mintAmount)
    {
        mintAmount = _mintWithEther(receiver);
    }

    function burnToEther(
        address payable receiver,
        uint256 burnAmount)
        external
        nonReentrant
        returns (uint256 loanAmountPaid)
    {
        loanAmountPaid = _burnToken(
            receiver,
            burnAmount
        );

        if (loanAmountPaid > 0) {
            WETHInterface(wethContract).withdraw(loanAmountPaid);
            require(receiver.send(loanAmountPaid), "transfer of ETH failed");
        }
    }


    /* Internal functions */

    function _mintWithEther(
        address receiver)
        internal
        nonReentrant
        returns (uint256 mintAmount)
    {
        require (msg.value > 0, "msg.value == 0");

        if (burntTokenReserveList.length > 0) {
            _claimLoanToken(burntTokenReserveList[0].lender);
            _claimLoanToken(receiver);
            if (msg.sender != receiver)
                _claimLoanToken(msg.sender);
        } else {
            _settleInterest();
        }

        uint256 currentPrice = _tokenPrice(_totalAssetSupply(0));
        mintAmount = msg.value.mul(10**18).div(currentPrice);

        WETHInterface(wethContract).deposit.value(msg.value)();

        _mint(receiver, mintAmount, msg.value, currentPrice);

        checkpointPrices_[receiver] = currentPrice;
    }

    function setWETHContract(
        address _addr)
        public
        onlyOwner
    {
        wethContract = _addr;
    }

    function initialize(
        address _bZxContract,
        address _bZxVault,
        address _bZxOracle,
        address _loanTokenAddress,
        address _tokenizedRegistry,
        string memory _name,
        string memory _symbol)
        public
        onlyOwner
    {
        wethContract = _loanTokenAddress;

        super.initialize(
            _bZxContract,
            _bZxVault,
            _bZxOracle,
            _loanTokenAddress,
            _tokenizedRegistry,
            _name,
            _symbol
        );
    }
}
