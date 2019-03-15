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

    uint256 public baseRate = 2500000000000000000; // 2.5%
    uint256 public rateMultiplier = 20000000000000000000; // 20%

    // "fee percentage retained by the oracle" = SafeMath.sub(10**20, spreadMultiplier);
    uint256 public spreadMultiplier;

    mapping (uint256 => bytes32) public loanOrderHashes;  // mapping of levergeAmount to loanOrderHash
    mapping (bytes32 => LoanData) public loanOrderData; // mapping of loanOrderHash to LoanOrder
    bytes32[] public loanOrderHashList;

    TokenReserves[] public burntTokenReserveList; // array of TokenReserves
    mapping (address => BZxObjects.ListIndex) public burntTokenReserveListIndex; // mapping of lender address to ListIndex objects
    uint256 public burntTokenReserved; // total outstanding burnt token amount

    uint256 public totalAssetBorrow = 0; // current amount of loan token amount tied up in loans

    uint256 internal lastUtilizationRate_;

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
        require(msg.sender == wethContract, "calls to fallback not allowed");
    }


    /* Public functions */

    function mintWithEther()
        external
        payable
        nonReentrant
        returns (uint256 mintAmount)
    {
        require (msg.value > 0, "msg.value == 0");
        require (loanTokenAddress == wethContract, "ether is not supported");

        if (burntTokenReserveList.length > 0) {
            _claimLoanToken(burntTokenReserveList[0].lender);
            _claimLoanToken(msg.sender);
        } else {
            _settleInterest();
        }

        uint256 currentPrice = _tokenPrice(0);
        mintAmount = msg.value.mul(10**18).div(currentPrice);

        WETHInterface(wethContract).deposit.value(msg.value)();

        _mint(msg.sender, mintAmount, msg.value, currentPrice);

        checkpointPrices_[msg.sender] = denormalize(currentPrice);
    }

    function mint(
        uint256 depositAmount)
        external
        nonReentrant
        returns (uint256 mintAmount)
    {
        require (depositAmount > 0, "depositAmount == 0");
        
        if (burntTokenReserveList.length > 0) {
            _claimLoanToken(burntTokenReserveList[0].lender);
            _claimLoanToken(msg.sender);
        } else {
            _settleInterest();
        }

        uint256 currentPrice = _tokenPrice(0);
        mintAmount = depositAmount.mul(10**18).div(currentPrice);

        require(ERC20(loanTokenAddress).transferFrom(
            msg.sender,
            address(this),
            depositAmount
        ), "transfer of loanToken failed");

        _mint(msg.sender, mintAmount, depositAmount, currentPrice);

        checkpointPrices_[msg.sender] = denormalize(currentPrice);
    }

    function burnToEther(
        uint256 burnAmount)
        external
        nonReentrant
        returns (uint256 loanAmountPaid)
    {
        require (loanTokenAddress == wethContract, "ether is not supported");

        loanAmountPaid = _burnToken(burnAmount);

        if (loanAmountPaid > 0) {
            WETHInterface(wethContract).withdraw(loanAmountPaid);
            require(msg.sender.send(loanAmountPaid), "transfer of ETH failed");
        }
    }

    function burn(
        uint256 burnAmount)
        external
        nonReentrant
        returns (uint256 loanAmountPaid)
    {
        loanAmountPaid = _burnToken(burnAmount);

        if (loanAmountPaid > 0) {
            require(ERC20(loanTokenAddress).transfer(
                msg.sender, 
                loanAmountPaid
            ), "transfer of loanToken failed");
        }
    }

    // called by a borrower to open a loan
    // escrowAmount == total collateral + interest available to back the loan
    // returns fillAmount
    function borrowToken(
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
            loanData.initialMarginAmount,
            escrowAmount);

        uint256 fillAmount = _getFillAmount(
            loanData,
            escrowAmount,
            interestRate);
        
        //require(ERC20(loanTokenAddress).balanceOf(address(this)) >= fillAmount, "insufficient loan supply");
        if (fillAmount > ERC20(loanTokenAddress).balanceOf(address(this))) {
            fillAmount = ERC20(loanTokenAddress).balanceOf(address(this));
        }

        // re-up the BZxVault spend approval if needed
        uint256 tempAllowance = ERC20(loanTokenAddress).allowance(address(this), bZxVault);
        if (tempAllowance < fillAmount) {
            if (tempAllowance > 0) {
                // reset approval to 0
                require(ERC20(loanTokenAddress).approve(bZxVault, 0), "approval reset of loanToken failed");
            }

            require(ERC20(loanTokenAddress).approve(bZxVault, MAX_UINT), "approval of loanToken failed");
        }

        require(bZxInterface(bZxContract).updateLoanAsLender(
            loanOrderHash,
            fillAmount,
            interestRate.div(365),
            block.timestamp+1),
            "updateLoanAsLender failed");

        require (bZxInterface(bZxContract).takeLoanOrderOnChainAsTraderByDelegate(
            msg.sender,
            loanOrderHash,
            collateralTokenAddress,
            fillAmount,
            tradeTokenToFillAddress,
            withdrawOnOpen) == fillAmount,
            "takeLoanOrderOnChainAsTraderByDelegate failed");

        // update total borrowed amount outstanding in loans
        totalAssetBorrow = totalAssetBorrow.add(fillAmount);

        // update utilization rate at this point in time
        lastUtilizationRate_ = _getUtilizationRate(_totalAssetSupply(0));

        if (burntTokenReserveList.length > 0) {
            _claimLoanToken(burntTokenReserveList[0].lender);
            _claimLoanToken(msg.sender);
        }

        return fillAmount;
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

        if (burntTokenReserveListIndex[msg.sender].isSet || balances[msg.sender] > 0) {
            checkpointPrices_[msg.sender] = denormalize(tokenPrice());
        } else {
            checkpointPrices_[msg.sender] = 0;
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

        if (burntTokenReserveListIndex[msg.sender].isSet || balances[msg.sender] > 0) {
            checkpointPrices_[msg.sender] = denormalize(tokenPrice());
        } else {
            checkpointPrices_[msg.sender] = 0;
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

        return _tokenPrice(interestUnPaid);
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
                .div(lastUtilizationRate_)
            );
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
                _nextLoanInterestRate(0, 0)
                .mul(10**20)
                .div(31536000) // 86400 * 365
                .mul(maxDurationUnixTimestampSec)
                .div(loanData.initialMarginAmount)
                .add(10**20))
            .div(10**40);
    }

    function getFillAmount(
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

        return _getFillAmount(
            loanData,
            escrowAmount,
            _nextLoanInterestRate(loanData.initialMarginAmount, escrowAmount)
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

    function _burnToken(
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
            _claimLoanToken(msg.sender);
        } else {
            _settleInterest();
        }

        uint256 currentPrice = _tokenPrice(0);

        uint256 loanAmountOwed = burnAmount.mul(currentPrice).div(10**18);
        uint256 loanAmountAvailableInContract = ERC20(loanTokenAddress).balanceOf(address(this));

        loanAmountPaid = loanAmountOwed;
        if (loanAmountPaid > loanAmountAvailableInContract) {
            uint256 reserveAmount = loanAmountPaid.sub(loanAmountAvailableInContract);
            uint256 reserveTokenAmount = normalize(reserveAmount.mul(10**18).div(currentPrice));

            burntTokenReserved = burntTokenReserved.add(reserveTokenAmount);
            if (burntTokenReserveListIndex[msg.sender].isSet) {
                uint256 index = burntTokenReserveListIndex[msg.sender].index;
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

        uint256 currentPrice = _tokenPrice(0);

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
        uint256 interestUnPaid)
        internal
        view
        returns (uint256)
    {
        uint256 totalTokenSupply = totalSupply_.add(burntTokenReserved);

        return totalTokenSupply > 0 ?
            normalize(
                _totalAssetSupply(interestUnPaid)
                .mul(10**18)
                .div(totalTokenSupply)
            ) : lastPrice_;
    }

    // next loan interest adjustment
    function _nextLoanInterestRate(
        uint256 initialMarginAmount,
        uint256 futureEscrowAmount)
        internal
        view
        returns (uint256)
    {
        uint256 assetSupply = totalAssetSupply();
        uint escrowUtilization = 0;
        if (futureEscrowAmount > 0 && initialMarginAmount > 0) {
            escrowUtilization = futureEscrowAmount
                .mul(10**40)
                .div(initialMarginAmount)
                .div(assetSupply);
        }

        return normalize(
            _getUtilizationRate(assetSupply)
            .add(escrowUtilization)
            .mul(rateMultiplier)
            .div(10**20)
            .add(baseRate)
        );
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

    function _getFillAmount(
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

            if (closeAmount > 0 && totalAssetBorrow >= closeAmount) {
                totalAssetBorrow = totalAssetBorrow.sub(closeAmount);
            }

            if (burntTokenReserveList.length > 0) {
                _claimLoanToken(burntTokenReserveList[0].lender);
            } else {
                _settleInterest();
            }

            uint256 currentPrice = _tokenPrice(0);
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
