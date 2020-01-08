/**
 * Copyright 2017-2020, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./SplittableTokenV2.sol";


contract PositionTokenLogicV2_Initialize is SplittableTokenV2 {
    using SafeMath for uint256;

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
        address[7] memory addresses,
        bool _shortPosition,
        uint256 _leverageAmount,
        bool _newFormat,
        bytes32 _loanOrderHash,
        string memory _name,
        string memory _symbol)
        public
        onlyOwner
    {
        require (!isInitialized_);

        bZxContract = addresses[0];
        bZxVault = addresses[1];
        bZxOracle = addresses[2];
        wethContract = addresses[3];
        loanTokenAddress = addresses[4];
        tradeTokenAddress = addresses[5];
        loanTokenLender = addresses[6];

        shortPosition = _shortPosition;

        loanOrderHash = _loanOrderHash;

        // collateralTokenAddress == tradeTokenAddress
        leverageAmount = !_newFormat ?
            _leverageAmount :
            uint256(keccak256(abi.encodePacked(_leverageAmount,addresses[5])));

        name = _name;
        symbol = _symbol;
        decimals = 18;

        loanTokenDecimals = uint256(EIP20(loanTokenAddress).decimals());
        // 10**18 * 10**(18-decimals_of_loan_token)
        loanTokenAdjustment = SafeMath.mul(
            10**18,
            10**(
                SafeMath.sub(
                    18,
                    loanTokenDecimals
                )
            )
        );

        tradeTokenDecimals = uint256(EIP20(tradeTokenAddress).decimals());
        // 10**18 * 10**(18-decimals_of_trade_token)
        tradeTokenAdjustment = SafeMath.mul(
            10**18,
            10**(
                SafeMath.sub(
                    18,
                    tradeTokenDecimals
                )
            )
        );

        initialPrice = 10**21; // starting price of 1,000

        setApprovals();

        isInitialized_ = true;
    }
}
