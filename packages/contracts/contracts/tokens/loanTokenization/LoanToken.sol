/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
 
pragma solidity 0.5.2;
pragma experimental ABIEncoderV2;

import "./LoanTokenization.sol";
import "../../oracle/OracleNotifierInterface.sol";


interface bZxInterface {

    function pushLoanOrderOnChain(
        address[8] calldata orderAddresses,
        uint256[11] calldata orderValues,
        bytes calldata oracleData,
        bytes calldata signature)
        external
        returns (bytes32); // loanOrderHash

    function takeLoanOrderOnChainAsTraderByDelegate(
        address trader,
        bytes32 loanOrderHash,
        address collateralTokenFilled,
        uint256 loanTokenAmountFilled,
        address tradeTokenToFillAddress,
        bool withdrawOnOpen)
        external
        returns (uint256); // filledAmount

    function updateLoanAsLender(
        bytes32 loanOrderHash,
        uint256 increaseAmountForLoan,
        uint256 newInterestRate,
        uint256 futureExpirationTimestamp)
        external
        returns (bool); // success

    function getLenderInterestForOracle(
        address lender,
        address oracleAddress,
        address interestTokenAddress)
        external
        view
        returns (
            uint256,    // interestPaid
            uint256,    // interestPaidDate
            uint256,    // interestOwedPerDay
            uint256);   // interestUnPaid

    function getLoanTokenFillable(
        bytes32 loanOrderHash)
        external
        view
        returns (uint256);
}

contract LoanToken is LoanTokenization, OracleNotifierInterface {
    using SafeMath for uint256;

    struct TokenReserves {
        address lender;
        uint256 amount;
    }

    uint public baseRate = 5000000000000000000; // 5%
    uint public rateMultiplier = 45000000000000000000; // 45%

    mapping (uint => bytes32) public loanOrderHashes;  // mapping of levergeAmount to loanOrderHash
    mapping (bytes32 => LoanData) public loanOrderData; // mapping of loanOrderHash to LoanOrder
    bytes32[] public loanOrderHashList;

    TokenReserves[] public burntTokenReserveList; // array of TokenReserves
    mapping (address => BZxObjects.ListIndex) public burntTokenReserveListIndex; // mapping of lender address to ListIndex objects
    uint public burntTokenReserved; // total outstanding burnt token amount

    uint public loanTokenUsed = 0; // current amount of loan token amount tied up in loans

    uint internal lastSettleTime;
    uint internal lastPrice = 10**18;

    modifier onlyOracle() {
        require(msg.sender == bZxOracle, "only Oracle allowed");
        _;
    }

    constructor(
        address _bZxContract,
        address _bZxVault,
        address _bZxOracle,
        address _wethContract,
        address _loanTokenAddress,
        string memory _name,
        string memory _symbol)
        DetailedERC20(
            _name,
            _symbol,
            18)
        public
    {
        bZxContract = _bZxContract;
        bZxVault = _bZxVault;
        bZxOracle = _bZxOracle;
        wethContract = _wethContract;
        loanTokenAddress = _loanTokenAddress;
    }

    function()  
        external
        payable 
    {
        require(msg.sender == wethContract, "calls to fallback not allowed");
    }

    function initLeverage(
        uint[3] memory orderParams) // leverageAmount, initialMarginAmount, maintenanceMarginAmount
        public
        onlyOwner
    {
        address[8] memory orderAddresses = [
            address(this), // makerAddress
            loanTokenAddress, // loanTokenAddress
            loanTokenAddress, // interestTokenAddress (same as loanToken)
            address(0), // collateralTokenAddress
            address(0), // feeRecipientAddress
            bZxOracle,
            address(0), // takerAddress
            address(0) // tradeTokenToFillAddress
        ];

        uint[11] memory orderValues = [
            0, // loanTokenAmount
            0, // interestAmountPerDay
            orderParams[1], // initialMarginAmount, 
            orderParams[2], // maintenanceMarginAmount, 
            0, // lenderRelayFee 
            0, // traderRelayFee
            maxDurationUnixTimestampSec, 
            0, // expirationUnixTimestampSec (no expiration)
            0, // makerRole (0 = lender)
            0, // withdrawOnOpen
            uint(keccak256(abi.encodePacked(msg.sender, block.timestamp))) // salt
        ];

        bytes32 loanOrderHash = bZxInterface(bZxContract).pushLoanOrderOnChain(
            orderAddresses,
            orderValues,
            abi.encodePacked(address(0),address(0),address(0),address(this)), // oracleData -> takeOrderNotifier, tradePositionNotifier, payInterestNotifier, closeLoanNotifier
            ""
        );
        loanOrderData[loanOrderHash] = LoanData({
            loanOrderHash: loanOrderHash,
            initialMarginAmount: orderParams[1],
            maintenanceMarginAmount: orderParams[2]
        });
        loanOrderHashList.push(loanOrderHash);
        loanOrderHashes[orderParams[0]] = loanOrderHash;
    }

    function _getAllInterest()
        internal
        view
        returns (
            uint256 interestPaidSoFar, 
            uint256 interestUnPaid)
    {
        (interestPaidSoFar,,,interestUnPaid) = bZxInterface(bZxContract).getLenderInterestForOracle(
            address(this),
            bZxOracle,
            loanTokenAddress // same as interestTokenAddress
        );
    }

    function borrowerInterestRate()
        public
        view
        returns (uint)
    {
        uint utilizationRatio = 0;
        
        if (loanTokenUsed > 0 && totalSupply_ > 0) {
            // U = total_borrow / total_supply
            utilizationRatio = loanTokenUsed.mul(10**20).div(totalSupply_);
        }

        // borrow rate = U * 45% + 5%
        return utilizationRatio.mul(rateMultiplier).div(10**20).add(baseRate);
    }

    function lenderInterestRate()
        public
        view
        returns (uint)
    {
        uint utilizationRatio = 0;
        
        if (loanTokenUsed > 0 && totalSupply_ > 0) {
            // U = total_borrow / total_supply
            utilizationRatio = loanTokenUsed.mul(10**20).div(totalSupply_);
        }
        
        // borrow rate = U * 45% + 5%
        uint borrowRate = utilizationRatio.mul(rateMultiplier).div(10**20).add(baseRate);

        return borrowRate.mul(utilizationRatio).div(10**20);
    }

    function interestReceived()
        public
        view
        returns (uint interestTotalAccrued)
    {
        // this gets the combined total of paid and unpaid interest
        (uint256 interestPaidSoFar, uint256 interestUnPaid) = _getAllInterest();
        return interestPaidSoFar.add(interestUnPaid);
    }

    function tokenPrice()
        public
        view
        returns (uint)
    {
        (,uint256 interestUnPaid) = _getAllInterest();
        return _tokenPrice(interestUnPaid);
    }

    function _tokenPrice(
        uint256 unpaidInterest)
        internal
        view
        returns (uint)
    {
        uint actualTotalSupply = totalSupply_.add(burntTokenReserved);

        return actualTotalSupply > 0 ? 
            ERC20(loanTokenAddress).balanceOf(address(this))
            .add(loanTokenUsed)
            .add(unpaidInterest)
            .mul(10**18)
            .div(actualTotalSupply) : lastPrice;
    }

    function mintWithEther()
        public
        payable
        returns (uint mintAmount)
    {
        require (loanTokenAddress == wethContract, "ether is not supported");

        if (burntTokenReserveList.length > 0) {
            // this will settle interest and claim free token previously reserved
            _claimLoanToken(burntTokenReserveList[0].lender);
            _claimLoanToken(msg.sender);
        }

        mintAmount = msg.value.mul(10**18).div(_tokenPrice(0));

        WETHInterface(wethContract).deposit.value(msg.value)();

        _mint(msg.sender, mintAmount);
    }

    function mint(
        uint depositAmount)
        public
        returns (uint mintAmount)
    {
        if (burntTokenReserveList.length > 0) {
            // this will settle interest and claim free token previously reserved
            _claimLoanToken(burntTokenReserveList[0].lender);
            _claimLoanToken(msg.sender);
        }

        mintAmount = depositAmount.mul(10**18).div(_tokenPrice(0));

        require(ERC20(loanTokenAddress).transferFrom(
            msg.sender,
            address(this),
            depositAmount
        ), "transfer of loanToken failed");

        _mint(msg.sender, mintAmount);
    }

    function burnToEther(
        uint burnAmount)
        public
        returns (uint loanAmountPaid)
    {
        require (loanTokenAddress == wethContract, "ether is not supported");

        loanAmountPaid = _burnToken(burnAmount);

        if (loanAmountPaid > 0) {
            WETHInterface(wethContract).withdraw(loanAmountPaid);
            require(msg.sender.send(loanAmountPaid), "transfer of ETH failed");
        }
    }

    function burn(
        uint burnAmount)
        public
        returns (uint loanAmountPaid)
    {
        loanAmountPaid = _burnToken(burnAmount);

        if (loanAmountPaid > 0) {
            require(ERC20(loanTokenAddress).transfer(
                msg.sender, 
                loanAmountPaid
            ), "transfer of loanToken failed");
        }
    }

    function _burnToken(
        uint burnAmount)
        internal
        returns (uint loanAmountPaid)
    {
        require(burnAmount > 0, "burnAmount == 0");

        // balance is verified in the _burn function
        // require(balances[msg.sender] >= burnAmount, "burnAmount too high");

        if (burntTokenReserveList.length > 0) {
            // this will settle interest and claim free token previously reserved
            _claimLoanToken(burntTokenReserveList[0].lender);
            _claimLoanToken(msg.sender);
        }

        uint currentPrice = _tokenPrice(0);

        uint loanAmountOwed = burnAmount.mul(currentPrice).div(10**18);
        uint loanTokenAvailable = ERC20(loanTokenAddress).balanceOf(address(this));

        loanAmountPaid = loanAmountOwed;
        if (loanAmountPaid > loanTokenAvailable) {
            uint reserveAmount = loanAmountPaid.sub(loanTokenAvailable);
            uint reserveTokenAmount = reserveAmount.mul(10**18).div(currentPrice);

            burntTokenReserved = burntTokenReserved.add(reserveTokenAmount);
            if (burntTokenReserveListIndex[msg.sender].isSet) {
                uint index = burntTokenReserveListIndex[msg.sender].index;
                burntTokenReserveList[index].amount = burntTokenReserveList[index].amount.add(reserveTokenAmount);
            } else {
                burntTokenReserveList.push(TokenReserves({
                    lender: msg.sender,
                    amount: reserveTokenAmount
                }));
                burntTokenReserveListIndex[msg.sender] = BZxObjects.ListIndex({
                    index: burntTokenReserveList.length-1,
                    isSet: true
                });
            }

            loanAmountPaid = loanTokenAvailable;
        }

        _burn(msg.sender, burnAmount);

        if (totalSupply_.add(burntTokenReserved) == 0)
            lastPrice = currentPrice; // only store lastPrice if lender supply is 0
    }

    function getFillAmount(
        uint depositAmount,
        uint leverageAmount)
        public
        view
        returns (uint)
    {
        if (depositAmount == 0)
            return 0;
        
        LoanData memory loanData = loanOrderData[loanOrderHashes[leverageAmount]];
        if (loanData.initialMarginAmount == 0)
            return 0;

        return _getFillAmount(
            loanData,
            depositAmount);
    }

    function _getFillAmount(
        LoanData memory loanData,
        uint depositAmount)
        internal
        view
        returns (uint)
    {
        // assumes that collateral and interest token are the same
        return depositAmount
            .mul(10**40)
            .div(
                borrowerInterestRate()
                .mul(10**20)
                .div(31536000) // 86400 * 365
                .mul(maxDurationUnixTimestampSec)
                .div(loanData.initialMarginAmount)
                .add(10**20))
            .div(loanData.initialMarginAmount);
    }

    // called by a borrower to open a loan
    function borrowToken(
        uint fillAmount,
        uint leverageAmount,
        address collateralTokenAddress,
        address tradeTokenToFillAddress,
        bool withdrawOnOpen)
        public
        returns (uint)
    {
        require(fillAmount > 0, "fillAmount == 0");

        bytes32 loanOrderHash = loanOrderHashes[leverageAmount];
        LoanData memory loanData = loanOrderData[loanOrderHash];
        require(loanData.initialMarginAmount != 0, "invalid leverage amount");

        _settleInterest();

        require(ERC20(loanTokenAddress).balanceOf(address(this)) >= fillAmount, "insufficient loan supply");

        // re-up the BZxVault spend approval if needed
        uint tempAllowance = ERC20(loanTokenAddress).allowance.gas(4999)(address(this), bZxVault);
        if (tempAllowance < fillAmount) {
            if (tempAllowance > 0) {
                // reset approval to 0
                require(ERC20(loanTokenAddress).approve(bZxVault, 0), "approval reset of loanToken failed");
            }

            require(ERC20(loanTokenAddress).approve(bZxVault, MAX_UINT), "approval of loanToken failed");
        }

        uint loanTokenFillableOnChain = bZxInterface(bZxContract).getLoanTokenFillable(loanOrderHash);
        require(bZxInterface(bZxContract).updateLoanAsLender(
            loanOrderHash,
            fillAmount > loanTokenFillableOnChain ? fillAmount.sub(loanTokenFillableOnChain) : 0,
            borrowerInterestRate().div(365),
            0),
            "updateLoanAsLender failed");

        require (bZxInterface(bZxContract).takeLoanOrderOnChainAsTraderByDelegate(
            msg.sender,
            loanOrderHash,
            collateralTokenAddress,
            fillAmount,
            tradeTokenToFillAddress,
            withdrawOnOpen) == fillAmount,
            "takeLoanOrderOnChainAsTraderByDelegate failed");

        loanTokenUsed = loanTokenUsed.add(fillAmount);

        return fillAmount;
    }

    // Claims owned loan token for the caller
    // Also claims for user with the longest reserves
    // returns amount claimed for the caller
    function claimLoanToken()
        public
        returns (uint claimedAmount)
    {
        claimedAmount = _claimLoanToken(msg.sender);

        if (burntTokenReserveList.length > 0)
            _claimLoanToken(burntTokenReserveList[0].lender);
    }

    function _claimLoanToken(
        address lender)
        internal
        returns (uint)
    {
        _settleInterest();

        if (!burntTokenReserveListIndex[lender].isSet)
            return 0;
        
        uint index = burntTokenReserveListIndex[lender].index;

        uint currentPrice = _tokenPrice(0);

        uint claimAmount = burntTokenReserveList[index].amount.mul(currentPrice).div(10**18);
        if (claimAmount == 0)
            return 0;

        uint availableAmount = ERC20(loanTokenAddress).balanceOf.gas(4999)(address(this));
        if (claimAmount > availableAmount) {
            claimAmount = availableAmount;
        }

        if (claimAmount > 0) {
            require(ERC20(loanTokenAddress).transfer(
                lender, 
                claimAmount
            ), "transfer of loanToken failed");

            uint claimTokenAmount = claimAmount.mul(10**18).div(currentPrice);
            if (burntTokenReserveList[index].amount <= claimTokenAmount) {
                // remove lender from burntToken list
                if (burntTokenReserveList.length > 1) {
                    // replace order in list with last order in array
                    burntTokenReserveList[index] = burntTokenReserveList[burntTokenReserveList.length - 1];

                    // update the position of this replacement
                    burntTokenReserveListIndex[lender].index = index;
                }

                // trim array and clear storage
                burntTokenReserveList.length--;
                burntTokenReserveListIndex[lender].index = 0;
                burntTokenReserveListIndex[lender].isSet = false;
            } else {
                burntTokenReserveList[index].amount = burntTokenReserveList[index].amount.sub(claimTokenAmount);
            }

            burntTokenReserved = burntTokenReserved > claimTokenAmount ?
                burntTokenReserved.sub(claimTokenAmount) :
                0;

            if (totalSupply_.add(burntTokenReserved) == 0)
                lastPrice = currentPrice; // only store lastPrice if lender supply is 0
        }

        return claimAmount;
    }

    function takeOrderNotifier(
        BZxObjects.LoanOrder memory /* loanOrder */,
        BZxObjects.LoanOrderAux memory /* loanOrderAux */,
        BZxObjects.LoanPosition memory /* loanPosition */,
        address /* taker */)
        public
        onlyOracle
        returns (bool)
    {
        return true;
    }

    function tradePositionNotifier(
        BZxObjects.LoanOrder memory /* loanOrder */,
        BZxObjects.LoanPosition memory /* loanPosition */)
        public
        onlyOracle
        returns (bool)
    {
        return true;
    }

    function payInterestNotifier(
        BZxObjects.LoanOrder memory /* loanOrder */,
        address /* lender */,
        uint256 /* amountPaid */)
        public
        onlyOracle
        returns (bool)
    {
        return true;
    }

    // called only by BZxOracle when a loan is partially or fully closed
    function closeLoanNotifier(
        BZxObjects.LoanOrder memory loanOrder,
        BZxObjects.LoanPosition memory /* loanPosition */,
        address /* loanCloser */,
        uint256 closeAmount,
        bool /* isLiquidation */)
        public
        onlyOracle
        returns (bool)
    {
        if (loanOrderData[loanOrder.loanOrderHash].loanOrderHash == loanOrder.loanOrderHash && 
            closeAmount > 0 && loanTokenUsed >= closeAmount) {

            loanTokenUsed = loanTokenUsed.sub(closeAmount);

            return true;
        } else {
            return false;
        }
    }

    function _settleInterest()
        internal
    {
        if (lastSettleTime != block.timestamp) {
            bZxContract.call.gas(gasleft())(
                abi.encodeWithSignature(
                    "payInterestForOracle(address,address)",
                    bZxOracle,
                    loanTokenAddress // same as interestTokenAddress
                )
            );
            lastSettleTime = block.timestamp;
        }
    }

    // returns token amount that is available for loaning or withdrawal
    function getLoanAmountAvailable()
        public
        view
        returns (uint)
    {
        (,uint256 interestUnPaid) = _getAllInterest();
        return ERC20(loanTokenAddress).balanceOf(address(this))
            .add(interestUnPaid);
    }

    function getLoanData(
        uint levergeAmount)
        public
        view
        returns (LoanData memory)
    {
        return loanOrderData[loanOrderHashes[levergeAmount]];
    }
}
