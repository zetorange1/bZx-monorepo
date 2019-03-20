/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
 
pragma solidity 0.5.6;
pragma experimental ABIEncoderV2;

import "./shared/LoanTokenization.sol";
import "./shared/OracleNotifierInterface.sol";


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
}

interface bZxOracleInterface {
    function interestFeePercent()
        external
        view
        returns (uint256);
}

contract LoanToken is LoanTokenization, OracleNotifierInterface {
    using SafeMath for uint256;

    uint256 public maxDurationUnixTimestampSec = 2419200; // 28 days

    struct LoanData {
        bytes32 loanOrderHash;
        uint256 leverageAmount;
        uint256 initialMarginAmount;
        uint256 maintenanceMarginAmount;
    }

    struct TokenReserves {
        address lender;
        uint256 amount;
    }

    event Claim(
        address indexed claimant,
        uint256 tokenAmount,
        uint256 assetAmount,
        uint256 remainingTokenAmount,
        uint256 price
    );

    uint256 public baseRate = 1000000000000000000; // 1.0%
    uint256 public rateMultiplier = 39000000000000000000; // 39%

    // "fee percentage retained by the oracle" = SafeMath.sub(10**20, spreadMultiplier);
    uint256 public spreadMultiplier;

    mapping (uint256 => bytes32) public loanOrderHashes;  // mapping of levergeAmount to loanOrderHash
    mapping (bytes32 => LoanData) public loanOrderData; // mapping of loanOrderHash to LoanOrder
    bytes32[] public loanOrderHashList;

    TokenReserves[] public burntTokenReserveList; // array of TokenReserves
    mapping (address => BZxObjects.ListIndex) public burntTokenReserveListIndex; // mapping of lender address to ListIndex objects
    uint256 public burntTokenReserved; // total outstanding burnt token amount

    uint256 public totalAssetBorrow = 0; // current amount of loan token amount tied up in loans

    uint256 internal checkpointUtilizationRate_;

    uint256 internal lastSettleTime_;

    uint256 internal constant initialPrice_ = 10**18; // starting price of 1
    uint256 internal lastPrice_;

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

        spreadMultiplier = SafeMath.sub(10**20, bZxOracleInterface(_bZxOracle).interestFeePercent());

        lastPrice_ = initialPrice_;
    }

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

    function mint(
        address receiver,
        uint256 depositAmount)
        external
        nonReentrant
        returns (uint256 mintAmount)
    {
        require (depositAmount > 0, "depositAmount == 0");
        
        if (burntTokenReserveList.length > 0) {
            _claimLoanToken(burntTokenReserveList[0].lender);
            _claimLoanToken(receiver);
            if (msg.sender != receiver)
                _claimLoanToken(msg.sender);
        } else {
            _settleInterest();
        }

        uint256 assetSupply = _totalAssetSupply(0);
        uint256 currentPrice = _tokenPrice(assetSupply);
        mintAmount = depositAmount.mul(10**18).div(currentPrice);

        require(ERC20(loanTokenAddress).transferFrom(
            msg.sender,
            address(this),
            depositAmount
        ), "transfer of loanToken failed");

        _mint(receiver, mintAmount, depositAmount, currentPrice);

        checkpointPrices_[receiver] = denormalize(currentPrice);

        checkpointUtilizationRate_ = _getUtilizationRate(assetSupply);
    }

    function burnToEther(
        address payable receiver,
        uint256 burnAmount)
        external
        nonReentrant
        returns (uint256 loanAmountPaid)
    {
        require (loanTokenAddress == wethContract, "ether is not supported");

        loanAmountPaid = _burnToken(
            receiver,
            burnAmount
        );

        if (loanAmountPaid > 0) {
            WETHInterface(wethContract).withdraw(loanAmountPaid);
            require(receiver.send(loanAmountPaid), "transfer of ETH failed");
        }

        checkpointUtilizationRate_ = _getUtilizationRate(_totalAssetSupply(0));
    }

    function burn(
        address receiver,
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
            require(ERC20(loanTokenAddress).transfer(
                receiver, 
                loanAmountPaid
            ), "transfer of loanToken failed");
        }

        checkpointUtilizationRate_ = _getUtilizationRate(_totalAssetSupply(0));
    }

    // called by a borrower to open a loan
    // returns borrowAmount
    function borrowToken(
        uint256 borrowAmount,
        uint256 leverageAmount,
        address collateralTokenAddress,
        address tradeTokenToFillAddress,
        bool withdrawOnOpen)
        external
        nonReentrant
        returns (uint256)
    {
        require(borrowAmount > 0, "borrowAmount == 0");

        bytes32 loanOrderHash = loanOrderHashes[leverageAmount];
        LoanData memory loanData = loanOrderData[loanOrderHash];
        require(loanData.initialMarginAmount != 0, "invalid leverage amount");

        _settleInterest();

        uint256 interestRate = _nextLoanInterestRate(borrowAmount);

        return _borrowToken(
            loanOrderHash,
            borrowAmount,
            interestRate,
            collateralTokenAddress,
            tradeTokenToFillAddress,
            withdrawOnOpen
        );
    }

    // called by a borrower to open a loan
    // escrowAmount == total collateral + interest available to back the loan
    // returns borrowAmount
    function borrowTokenFromEscrow(
        uint256 escrowAmount,
        uint256 leverageAmount,
        address collateralTokenAddress,
        address tradeTokenToFillAddress,
        bool withdrawOnOpen)
        external
        nonReentrant
        returns (uint256)
    {
        require(escrowAmount > 0, "escrowAmount == 0");

        bytes32 loanOrderHash = loanOrderHashes[leverageAmount];
        LoanData memory loanData = loanOrderData[loanOrderHash];
        require(loanData.initialMarginAmount != 0, "invalid leverage amount");

        _settleInterest();

        uint256 interestRate = _nextLoanInterestRate(
            escrowAmount
                .mul(10**20)
                .div(loanData.initialMarginAmount)
        );

        uint256 borrowAmount = _getBorrowAmount(
            loanData,
            escrowAmount,
            interestRate);

        return _borrowToken(
            loanOrderHash,
            borrowAmount,
            interestRate,
            collateralTokenAddress,
            tradeTokenToFillAddress,
            withdrawOnOpen
        );
    }

    // Claims owned loan token for the caller
    // Also claims for user with the longest reserves
    // returns amount claimed for the caller
    function claimLoanToken()
        external
        nonReentrant
        returns (uint256 claimedAmount)
    {
        claimedAmount = _claimLoanToken(msg.sender);

        if (burntTokenReserveList.length > 0)
            _claimLoanToken(burntTokenReserveList[0].lender);

        checkpointUtilizationRate_ = _getUtilizationRate(totalAssetSupply());
    }

    function settleInterest()
        external
        nonReentrant
    {
        _settleInterest();
    }

    function transferFrom(
        address _from,
        address _to,
        uint256 _value)
        public
        returns (bool)
    {
        super.transferFrom(
            _from,
            _to,
            _value);

        uint256 currentPrice = denormalize(tokenPrice());
        if (burntTokenReserveListIndex[_from].isSet || balances[_from] > 0) {
            checkpointPrices_[_from] = currentPrice;
        } else {
            checkpointPrices_[_from] = 0;
        }
        if (burntTokenReserveListIndex[_to].isSet || balances[_to] > 0) {
            checkpointPrices_[_to] = currentPrice;
        } else {
            checkpointPrices_[_to] = 0;
        }

        return true;
    }

    function transfer(
        address _to,
        uint256 _value)
        public 
        returns (bool)
    {
        super.transfer(
            _to,
            _value);

        uint256 currentPrice = denormalize(tokenPrice());
        if (burntTokenReserveListIndex[msg.sender].isSet || balances[msg.sender] > 0) {
            checkpointPrices_[msg.sender] = currentPrice;
        } else {
            checkpointPrices_[msg.sender] = 0;
        }
        if (burntTokenReserveListIndex[_to].isSet || balances[_to] > 0) {
            checkpointPrices_[_to] = currentPrice;
        } else {
            checkpointPrices_[_to] = 0;
        }

        return true;
    }


    /* Public View functions */

    function tokenPrice()
        public
        view
        returns (uint256)
    {
        uint256 interestUnPaid = 0;
        if (lastSettleTime_ != block.timestamp) {
            (,,interestUnPaid) = _getAllInterest();

            interestUnPaid = interestUnPaid
                .mul(spreadMultiplier)
                .div(10**20);
        }

        return _tokenPrice(_totalAssetSupply(interestUnPaid));
    }

    function checkpointPrice(
        address _user)
        public
        view
        returns (uint256)
    {
        return normalize(checkpointPrices_[_user]);
    }

    function marketLiquidity()
        public
        view
        returns (uint256)
    {
        uint256 totalSupply = totalAssetSupply();
        if (totalSupply > totalAssetBorrow) {
            return totalSupply.sub(totalAssetBorrow);
        } else {
            return 0;
        }
    }

    // interest that borrowers are currently paying for open loans
    function borrowInterestRate()
        public
        view
        returns (uint256)
    {
        if (totalAssetBorrow > 0) {
            return _borrowInterestRate(totalAssetSupply());
        } else {
            return baseRate;
        }
    }

    // interest that lenders are currently receiving for open loans
    function supplyInterestRate()
        public
        view
        returns (uint256)
    {
        uint256 assetSupply = totalAssetSupply();
        return _borrowInterestRate(assetSupply)
            .mul(_getUtilizationRate(assetSupply))
            .mul(spreadMultiplier)
            .div(10**40);
    }

    // the rate the next base protocol borrower will receive based on the amount being borrowed
    function nextLoanInterestRate(
        uint256 borrowAmount)
        public
        view
        returns (uint256)
    {
        if (borrowAmount > 0) {
            uint256 interestUnPaid = 0;
            if (lastSettleTime_ != block.timestamp) {
                (,,interestUnPaid) = _getAllInterest();

                interestUnPaid = interestUnPaid
                    .mul(spreadMultiplier)
                    .div(10**20);
            }

            uint256 balance = ERC20(loanTokenAddress).balanceOf(address(this)).add(interestUnPaid);
            if (borrowAmount > balance) {
                borrowAmount = balance;
            }
        }

        return _nextLoanInterestRate(borrowAmount);
    }

    // this gets the combined total of paid and unpaid interest
    function interestReceived()
        public
        view
        returns (uint256 interestTotalAccrued)
    {
        (uint256 interestPaidSoFar,,uint256 interestUnPaid) = _getAllInterest();

        return interestPaidSoFar
            .add(interestUnPaid)
            .mul(spreadMultiplier)
            .div(10**20);
    }

    function totalAssetSupply()
        public
        view
        returns (uint256)
    {
        uint256 interestUnPaid = 0;
        if (lastSettleTime_ != block.timestamp) {
            (,,interestUnPaid) = _getAllInterest();

            interestUnPaid = interestUnPaid
                .mul(spreadMultiplier)
                .div(10**20);
        }

        return _totalAssetSupply(interestUnPaid);
    }

    function getMaxDepositAmount(
        uint256 leverageAmount)
        public
        view
        returns (uint256)
    {
        LoanData memory loanData = loanOrderData[loanOrderHashes[leverageAmount]];
        if (loanData.initialMarginAmount == 0)
            return 0;

        return marketLiquidity()
            .mul(loanData.initialMarginAmount)
            .mul(
                nextLoanInterestRate(0)
                .mul(10**20)
                .div(31536000) // 86400 * 365
                .mul(maxDurationUnixTimestampSec)
                .div(loanData.initialMarginAmount)
                .add(10**20))
            .div(10**40);
    }

    function getBorrowAmount(
        uint256 escrowAmount,
        uint256 leverageAmount)
        public
        view
        returns (uint256)
    {
        if (escrowAmount == 0)
            return 0;

        LoanData memory loanData = loanOrderData[loanOrderHashes[leverageAmount]];
        if (loanData.initialMarginAmount == 0)
            return 0;

        return _getBorrowAmount(
            loanData,
            escrowAmount,
            nextLoanInterestRate(
                escrowAmount
                    .mul(10**20)
                    .div(loanData.initialMarginAmount)
            )
        );
    }

    function getLoanData(
        uint256 levergeAmount)
        public
        view
        returns (LoanData memory)
    {
        return loanOrderData[loanOrderHashes[levergeAmount]];
    }

    function getLoanOrderHashses()
        public
        view
        returns (bytes32[] memory)
    {
        return loanOrderHashList;
    }

    // returns the user's balance of underlying token
    function assetBalanceOf(
        address _owner)
        public
        view
        returns (uint256)
    {
        return balanceOf(_owner)
            .mul(tokenPrice())
            .div(10**18);
    }


    /* Internal functions */

    function _mintWithEther(
        address receiver)
        internal
        nonReentrant
        returns (uint256 mintAmount)
    {
        require (msg.value > 0, "msg.value == 0");
        require (loanTokenAddress == wethContract, "ether is not supported");

        if (burntTokenReserveList.length > 0) {
            _claimLoanToken(burntTokenReserveList[0].lender);
            _claimLoanToken(receiver);
            if (msg.sender != receiver)
                _claimLoanToken(msg.sender);
        } else {
            _settleInterest();
        }

        uint256 assetSupply = _totalAssetSupply(0);
        uint256 currentPrice = _tokenPrice(assetSupply);
        mintAmount = msg.value.mul(10**18).div(currentPrice);

        WETHInterface(wethContract).deposit.value(msg.value)();

        _mint(receiver, mintAmount, msg.value, currentPrice);

        checkpointPrices_[receiver] = denormalize(currentPrice);

        checkpointUtilizationRate_ = _getUtilizationRate(assetSupply);
    }

    function _burnToken(
        address receiver,
        uint256 burnAmount)
        internal
        returns (uint256 loanAmountPaid)
    {
        require(burnAmount > 0, "burnAmount == 0");

        if (burnAmount > balanceOf(msg.sender)) {
            burnAmount = balanceOf(msg.sender);
        }

        if (burntTokenReserveList.length > 0) {
            _claimLoanToken(burntTokenReserveList[0].lender);
            _claimLoanToken(receiver);
            if (msg.sender != receiver)
                _claimLoanToken(msg.sender);
        } else {
            _settleInterest();
        }

        uint256 currentPrice = _tokenPrice(_totalAssetSupply(0));

        uint256 loanAmountOwed = burnAmount.mul(currentPrice).div(10**18);
        uint256 loanAmountAvailableInContract = ERC20(loanTokenAddress).balanceOf(address(this));

        loanAmountPaid = loanAmountOwed;
        if (loanAmountPaid > loanAmountAvailableInContract) {
            uint256 reserveAmount = loanAmountPaid.sub(loanAmountAvailableInContract);
            uint256 reserveTokenAmount = normalize(reserveAmount.mul(10**18).div(currentPrice));

            burntTokenReserved = burntTokenReserved.add(reserveTokenAmount);
            if (burntTokenReserveListIndex[receiver].isSet) {
                uint256 index = burntTokenReserveListIndex[receiver].index;
                burntTokenReserveList[index].amount = burntTokenReserveList[index].amount.add(reserveTokenAmount);
            } else {
                burntTokenReserveList.push(TokenReserves({
                    lender: receiver,
                    amount: reserveTokenAmount
                }));
                burntTokenReserveListIndex[receiver] = BZxObjects.ListIndex({
                    index: burntTokenReserveList.length-1,
                    isSet: true
                });
            }

            loanAmountPaid = loanAmountAvailableInContract;
        }

        _burn(msg.sender, burnAmount, loanAmountPaid, currentPrice);

        if (burntTokenReserveListIndex[msg.sender].isSet || balances[msg.sender] > 0) {
            checkpointPrices_[msg.sender] = denormalize(currentPrice);
        } else {
            checkpointPrices_[msg.sender] = 0;
        }

        if (totalSupply_.add(burntTokenReserved) == 0)
            lastPrice_ = currentPrice; // only store lastPrice_ if lender supply is 0
    }

    function _settleInterest()
        internal
    {
        if (lastSettleTime_ != block.timestamp) {
            (bool success,) = bZxContract.call.gas(gasleft())(
                abi.encodeWithSignature(
                    "payInterestForOracle(address,address)",
                    bZxOracle,
                    loanTokenAddress // same as interestTokenAddress
                )
            );
            success;
            lastSettleTime_ = block.timestamp;
        }
    }

    function _claimLoanToken(
        address lender)
        internal
        returns (uint256)
    {
        _settleInterest();

        if (!burntTokenReserveListIndex[lender].isSet)
            return 0;
        
        uint256 index = burntTokenReserveListIndex[lender].index;

        uint256 currentPrice = _tokenPrice(_totalAssetSupply(0));

        uint256 claimAmount = denormalize(burntTokenReserveList[index].amount.mul(currentPrice).div(10**18));
        if (claimAmount == 0)
            return 0;

        uint256 availableAmount = ERC20(loanTokenAddress).balanceOf(address(this));
        if (availableAmount == 0) {
            return 0;
        }

        uint256 claimTokenAmount;
        if (claimAmount <= availableAmount) {
            claimTokenAmount = burntTokenReserveList[index].amount;
            _removeFromList(lender, index);
        } else {
            claimAmount = availableAmount;
            claimTokenAmount = normalize(claimAmount.mul(10**18).div(currentPrice));
            
            // prevents less than 10 being left in burntTokenReserveList[index].amount
            if (claimTokenAmount.add(10) < burntTokenReserveList[index].amount) {
                burntTokenReserveList[index].amount = burntTokenReserveList[index].amount.sub(claimTokenAmount);
            } else {
                _removeFromList(lender, index);
            }
        }

        require(ERC20(loanTokenAddress).transfer(
            lender, 
            claimAmount
        ), "transfer of loanToken failed");

        if (burntTokenReserveListIndex[lender].isSet || balances[lender] > 0) {
            checkpointPrices_[lender] = denormalize(currentPrice);
        } else {
            checkpointPrices_[lender] = 0;
        }

        burntTokenReserved = burntTokenReserved > claimTokenAmount ?
            burntTokenReserved.sub(claimTokenAmount) :
            0;

        if (totalSupply_.add(burntTokenReserved) == 0)
            lastPrice_ = currentPrice; // only store lastPrice_ if lender supply is 0

        emit Claim(
            lender,
            claimTokenAmount,
            claimAmount,
            burntTokenReserveListIndex[lender].isSet ?
                denormalize(burntTokenReserveList[burntTokenReserveListIndex[lender].index].amount) :
                0,
            currentPrice
        );

        return claimAmount;
    }

    // returns borrowAmount
    function _borrowToken(
        bytes32 loanOrderHash,
        uint256 borrowAmount,
        uint256 interestRate,
        address collateralTokenAddress,
        address tradeTokenToFillAddress,
        bool withdrawOnOpen)
        internal
        returns (uint256)
    {
        //require(ERC20(loanTokenAddress).balanceOf(address(this)) >= borrowAmount, "insufficient loan supply");
        if (borrowAmount > ERC20(loanTokenAddress).balanceOf(address(this))) {
            borrowAmount = ERC20(loanTokenAddress).balanceOf(address(this));
        }

        // re-up the BZxVault spend approval if needed
        uint256 tempAllowance = ERC20(loanTokenAddress).allowance(address(this), bZxVault);
        if (tempAllowance < borrowAmount) {
            if (tempAllowance > 0) {
                // reset approval to 0
                require(ERC20(loanTokenAddress).approve(bZxVault, 0), "approval reset of loanToken failed");
            }

            require(ERC20(loanTokenAddress).approve(bZxVault, MAX_UINT), "approval of loanToken failed");
        }

        require(bZxInterface(bZxContract).updateLoanAsLender(
            loanOrderHash,
            borrowAmount,
            interestRate.div(365),
            block.timestamp+1),
            "updateLoanAsLender failed");

        require (bZxInterface(bZxContract).takeLoanOrderOnChainAsTraderByDelegate(
            msg.sender,
            loanOrderHash,
            collateralTokenAddress,
            borrowAmount,
            tradeTokenToFillAddress,
            withdrawOnOpen) == borrowAmount,
            "takeLoanOrderOnChainAsTraderByDelegate failed");

        // update total borrowed amount outstanding in loans
        totalAssetBorrow = totalAssetBorrow.add(borrowAmount);

        if (burntTokenReserveList.length > 0) {
            _claimLoanToken(burntTokenReserveList[0].lender);
            _claimLoanToken(msg.sender);
        }

        checkpointUtilizationRate_ = _getUtilizationRate(_totalAssetSupply(0));

        return borrowAmount;
    }

    function _removeFromList(
        address lender,
        uint256 index)
        internal
    {
        // remove lender from burntToken list
        if (burntTokenReserveList.length > 1) {
            // replace item in list with last item in array
            burntTokenReserveList[index] = burntTokenReserveList[burntTokenReserveList.length - 1];

            // update the position of this replacement
            burntTokenReserveListIndex[burntTokenReserveList[index].lender].index = index;
        }

        // trim array and clear storage
        burntTokenReserveList.length--;
        burntTokenReserveListIndex[lender].index = 0;
        burntTokenReserveListIndex[lender].isSet = false;
    }


    /* Internal View functions */

    function _tokenPrice(
        uint256 assetSupply)
        internal
        view
        returns (uint256)
    {
        uint256 totalTokenSupply = totalSupply_.add(burntTokenReserved);

        return totalTokenSupply > 0 ?
            normalize(
                assetSupply
                .mul(10**18)
                .div(totalTokenSupply)
            ) : lastPrice_;
    }

    function _borrowInterestRate(
        uint256 assetSupply)
        internal
        view
        returns (uint256)
    {
        if (totalAssetBorrow > 0) {
            (,uint256 interestOwedPerDay,) = _getAllInterest();
            return normalize(
                interestOwedPerDay
                .mul(10**20)
                .div(totalAssetBorrow)
                .mul(365)
                .mul(_getUtilizationRate(assetSupply))
                .div(checkpointUtilizationRate_)
            );
        } else {
            return baseRate;
        }
    }

    // next loan interest adjustment
    function _nextLoanInterestRate(
        uint256 borrowAmount)
        internal
        view
        returns (uint256)
    {
        uint256 assetSupply = totalAssetSupply();
        
        uint256 newUtilization = borrowAmount > 0 ? 
            borrowAmount
                .mul(10**20)
                .div(assetSupply) : 0;

        uint256 nextRate = normalize(
            _getUtilizationRate(assetSupply)
            .add(newUtilization)
            .mul(rateMultiplier)
            .div(10**20)
            .add(baseRate)
        );

        uint256 minRate = baseRate;
        uint256 maxRate = rateMultiplier.add(baseRate);

        if (nextRate < minRate)
            nextRate = minRate;
        else if (nextRate > maxRate)
            nextRate = maxRate;

        return nextRate;
    }

    function _getAllInterest()
        internal
        view
        returns (
            uint256 interestPaidSoFar,
            uint256 interestOwedPerDay,
            uint256 interestUnPaid)
    {
        // these values don't account for any fees retained by the oracle, so we account for it elsewhere with spreadMultiplier
        (interestPaidSoFar,,interestOwedPerDay,interestUnPaid) = bZxInterface(bZxContract).getLenderInterestForOracle(
            address(this),
            bZxOracle,
            loanTokenAddress // same as interestTokenAddress
        );
    }

    function _getBorrowAmount(
        LoanData memory loanData,
        uint256 escrowAmount,
        uint256 interestRate)
        internal
        view
        returns (uint256)
    {
        // assumes that collateral and interest token are the same
        return escrowAmount
            .mul(10**40)
            .div(
                interestRate
                .mul(10**20)
                .div(31536000) // 86400 * 365
                .mul(maxDurationUnixTimestampSec)
                .div(loanData.initialMarginAmount)
                .add(10**20))
            .div(loanData.initialMarginAmount);
    }

    function _getUtilizationRate(
        uint256 assetSupply)
        internal
        view
        returns (uint256)
    {
        if (totalAssetBorrow > 0 && assetSupply > 0) {
            // U = total_borrow / total_supply
            return totalAssetBorrow
                .mul(10**20)
                .div(assetSupply);
        } else {
            return 0;
        }
    }

    function _totalAssetSupply(
        uint256 interestUnPaid)
        internal
        view
        returns (uint256)
    {
        return ERC20(loanTokenAddress).balanceOf(address(this))
            .add(totalAssetBorrow)
            .add(interestUnPaid);
    }


    /* Oracle-Only functions */

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
        if (loanOrderData[loanOrder.loanOrderHash].loanOrderHash == loanOrder.loanOrderHash) {

            totalAssetBorrow = totalAssetBorrow > closeAmount ? 
                totalAssetBorrow.sub(closeAmount) : 0;

            if (burntTokenReserveList.length > 0) {
                _claimLoanToken(burntTokenReserveList[0].lender);
            } else {
                _settleInterest();
            }

            uint256 assetSupply = _totalAssetSupply(0);

            checkpointUtilizationRate_ = _getUtilizationRate(assetSupply);

            uint256 currentPrice = _tokenPrice(assetSupply);
            if (currentPrice < initialPrice_) {
                splitFactor_ = initialPrice_
                    .mul(10**18)
                    .div(currentPrice);
            }

            return true;
        } else {
            return false;
        }
    }


    /* Owner-Only functions */

    function initLeverage(
        uint256[3] memory orderParams) // leverageAmount, initialMarginAmount, maintenanceMarginAmount
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

        uint256[11] memory orderValues = [
            0, // loanTokenAmount
            0, // interestAmountPerDay
            orderParams[1], // initialMarginAmount,
            orderParams[2], // maintenanceMarginAmount,
            0, // lenderRelayFee
            0, // traderRelayFee
            maxDurationUnixTimestampSec,
            0, // expirationUnixTimestampSec
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
            leverageAmount: orderParams[0],
            initialMarginAmount: orderParams[1],
            maintenanceMarginAmount: orderParams[2]
        });
        loanOrderHashList.push(loanOrderHash);
        loanOrderHashes[orderParams[0]] = loanOrderHash;
    }

    // these params should be percentages represented like so: 5% = 5000000000000000000
    function setDemandCurve(
        uint256 _baseRate,
        uint256 _rateMultiplier)
        public
        onlyOwner
    {
        baseRate = _baseRate;
        rateMultiplier = _rateMultiplier;
    }

    function setInterestFeePercent(
        uint256 _newRate)
        public
        onlyOwner
    {
        require(_newRate <= 10**20);
        spreadMultiplier = SafeMath.sub(10**20, _newRate);
    }

    function setMaxDuration(
        uint256 _duration)
        public
        onlyOwner
    {
        maxDurationUnixTimestampSec = _duration;
    }
}
