/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./AdvancedToken.sol";


interface IBZxSettings {
    function pushLoanOrderOnChain(
        address[8] calldata orderAddresses,
        uint256[11] calldata orderValues,
        bytes calldata oracleData,
        bytes calldata signature)
        external
        returns (bytes32); // loanOrderHash

    function setLoanOrderDesc(
        bytes32 loanOrderHash,
        string calldata desc)
        external
        returns (bool);

    function oracleAddresses(
        address oracleAddress)
        external
        view
        returns (address);
}

interface IBZxOracleSettings {
    function tradeUserAsset(
        address sourceTokenAddress,
        address destTokenAddress,
        address receiverAddress,
        address returnToSenderAddress,
        uint256 sourceTokenAmount,
        uint256 maxDestTokenAmount,
        uint256 minConversionRate)
        external
        returns (uint256 destTokenAmountReceived, uint256 sourceTokenAmountUsed);

    function interestFeePercent()
        external
        view
        returns (uint256);
}

contract LoanTokenSettings is AdvancedToken {
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


    function initLeverage(
        uint256[4] memory orderParams) // leverageAmount, initialMarginAmount, maintenanceMarginAmount, maxDurationUnixTimestampSec
        public
        onlyAdmin
    {
        require(loanOrderHashes[orderParams[0]] == 0);

        address[8] memory orderAddresses = [
            address(this), // makerAddress
            loanTokenAddress, // loanTokenAddress
            loanTokenAddress, // interestTokenAddress (same as loanToken)
            address(0), // collateralTokenAddress
            address(0), // feeRecipientAddress
            bZxOracle, // (leave as original value)
            address(0), // takerAddress
            address(0) // tradeTokenAddress
        ];

        uint256[11] memory orderValues = [
            0, // loanTokenAmount
            0, // interestAmountPerDay
            orderParams[1], // initialMarginAmount,
            orderParams[2], // maintenanceMarginAmount,
            0, // lenderRelayFee
            0, // traderRelayFee
            orderParams[3], // maxDurationUnixTimestampSec,
            0, // expirationUnixTimestampSec
            0, // makerRole (0 = lender)
            0, // withdrawOnOpen
            uint(keccak256(abi.encodePacked(msg.sender, block.timestamp))) // salt
        ];

        bytes32 loanOrderHash = IBZxSettings(bZxContract).pushLoanOrderOnChain(
            orderAddresses,
            orderValues,
            abi.encodePacked(address(this)), // oracleData -> closeLoanNotifier
            ""
        );
        IBZxSettings(bZxContract).setLoanOrderDesc(
            loanOrderHash,
            name
        );
        loanOrderData[loanOrderHash] = LoanData({
            loanOrderHash: loanOrderHash,
            leverageAmount: orderParams[0],
            initialMarginAmount: orderParams[1],
            maintenanceMarginAmount: orderParams[2],
            maxDurationUnixTimestampSec: orderParams[3],
            index: leverageList.length
        });
        loanOrderHashes[orderParams[0]] = loanOrderHash;
        leverageList.push(orderParams[0]);
    }

    function removeLeverage(
        uint256 leverageAmount)
        public
        onlyAdmin
    {
        bytes32 loanOrderHash = loanOrderHashes[leverageAmount];
        require(loanOrderHash != 0);

        if (leverageList.length > 1) {
            uint256 index = loanOrderData[loanOrderHash].index;
            leverageList[index] = leverageList[leverageList.length - 1];
            loanOrderData[loanOrderHashes[leverageList[index]]].index = index;
        }
        leverageList.length--;

        delete loanOrderHashes[leverageAmount];
        delete loanOrderData[loanOrderHash];
    }

    function migrateLeverage(
        uint256 oldLeverageValue,
        uint256 newLeverageValue)
        public
        onlyAdmin
    {
        require(oldLeverageValue != newLeverageValue);
        bytes32 loanOrderHash = loanOrderHashes[oldLeverageValue];
        LoanData storage loanData = loanOrderData[loanOrderHash];
        require(loanData.initialMarginAmount != 0);

        delete loanOrderHashes[oldLeverageValue];

        leverageList[loanData.index] = newLeverageValue;
        loanData.leverageAmount = newLeverageValue;
        loanOrderHashes[newLeverageValue] = loanOrderHash;
    }

    // These params should be percentages represented like so: 5% = 5000000000000000000
    // rateMultiplier + baseRate can't exceed 100%
    function setDemandCurve(
        uint256 _baseRate,
        uint256 _rateMultiplier,
        uint256 _lowUtilBaseRate,
        uint256 _lowUtilRateMultiplier)
        public
        onlyAdmin
    {
        require(_rateMultiplier.add(_baseRate) <= 10**20);
        require(_lowUtilRateMultiplier.add(_lowUtilBaseRate) <= 10**20);

        baseRate = _baseRate;
        rateMultiplier = _rateMultiplier;

        bytes32 slotLowUtilBaseRate = keccak256("iToken_LowUtilBaseRate");
        bytes32 slotLowUtilRateMultiplier = keccak256("iToken_LowUtilRateMultiplier");
        assembly {
            sstore(slotLowUtilBaseRate, _lowUtilBaseRate)
            sstore(slotLowUtilRateMultiplier, _lowUtilRateMultiplier)
        }
    }

    function setInterestFeePercent(
        uint256 _newRate)
        public
        onlyAdmin
    {
        require(_newRate <= 10**20);
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

    function recoverEther(
        address payable receiver,
        uint256 amount)
        public
        onlyAdmin
    {
        uint256 balance = address(this).balance;
        if (balance < amount)
            amount = balance;

        receiver.transfer(amount);
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

    function swapIntoLoanToken(
        address sourceTokenAddress,
        uint256 amount)
        public
        onlyAdmin
    {
        require(sourceTokenAddress != loanTokenAddress, "invalid token");

        address oracleAddress = IBZxSettings(bZxContract).oracleAddresses(bZxOracle);

        uint256 balance = ERC20(sourceTokenAddress).balanceOf(address(this));
        if (balance < amount)
            amount = balance;

        uint256 tempAllowance = ERC20(sourceTokenAddress).allowance(address(this), oracleAddress);
        if (tempAllowance < amount) {
            if (tempAllowance != 0) {
                // reset approval to 0
                require(ERC20(sourceTokenAddress).approve(oracleAddress, 0), "token approval reset failed");
            }

            require(ERC20(sourceTokenAddress).approve(oracleAddress, MAX_UINT), "token approval failed");
        }

        IBZxOracleSettings(oracleAddress).tradeUserAsset(
            sourceTokenAddress,
            loanTokenAddress,
            address(this),  // receiverAddress
            address(this),  // returnToSenderAddress
            amount,         // sourceTokenAmount
            MAX_UINT,       // maxDestTokenAmount
            0               // minConversionRate
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
