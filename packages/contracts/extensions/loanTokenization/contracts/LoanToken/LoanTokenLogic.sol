/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
 
pragma solidity 0.5.7;
pragma experimental ABIEncoderV2;

import "./AdvancedToken.sol";
import "../shared/OracleNotifierInterface.sol";
import "../shared/IBZx.sol";
import "../shared/IBZxOracle.sol";

interface iTokenizedRegistry {
    function getTokenAsset(
        address _token,
        uint256 _tokenType)
        external
        view
        returns (address);
}

contract LoanTokenLogic is AdvancedToken, OracleNotifierInterface {
    using SafeMath for uint256;

    modifier onlyOracle() {
        require(msg.sender == bZxOracle, "only Oracle allowed");
        _;
    }


    function()  
        external
        payable
    {
        revert();
    }


    /* Public functions */

    function mint(
        address receiver,
        uint256 depositAmount)
        external
        nonReentrant
        returns (uint256 mintAmount)
    {
        require (depositAmount > 0, "depositAmount == 0");
        
        if (burntTokenReserveList.length > 0) {
            _claimLoanToken(_getNextOwed());
            _claimLoanToken(receiver);
            if (msg.sender != receiver)
                _claimLoanToken(msg.sender);
        } else {
            _settleInterest();
        }

        uint256 currentPrice = _tokenPrice(_totalAssetSupply(0));
        mintAmount = depositAmount.mul(10**18).div(currentPrice);

        require(ERC20(loanTokenAddress).transferFrom(
            msg.sender,
            address(this),
            depositAmount
        ), "transfer of loanToken failed");

        _mint(receiver, mintAmount, depositAmount, currentPrice);

        checkpointPrices_[receiver] = currentPrice;
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

        uint256 amount = _borrowToken(
            msg.sender,
            loanOrderHash,
            borrowAmount,
            interestRate,
            collateralTokenAddress,
            tradeTokenToFillAddress,
            withdrawOnOpen
        );
        require(amount > 0, "unable to borrow");
        return amount;
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
            loanData.initialMarginAmount,
            escrowAmount,
            interestRate,
            withdrawOnOpen
        );

        borrowAmount = _borrowToken(
            msg.sender,
            loanOrderHash,
            borrowAmount,
            interestRate,
            collateralTokenAddress,
            tradeTokenToFillAddress,
            withdrawOnOpen
        );
        require(borrowAmount > 0, "unable to borrow");
        return borrowAmount;
    }

    function rolloverPosition(
        address borrower,
        bytes32 loanOrderHash,
        uint256 initialMarginAmount,
        uint256 escrowAmount,
        address tradeTokenToFillAddress)
        external
        returns (uint256)
    {
        require(msg.sender == address(this), "sender not self");

        uint256 interestRate = _nextLoanInterestRate(
            escrowAmount
                .mul(10**20)
                .div(initialMarginAmount)
        );

        uint256 borrowAmount = _getBorrowAmount(
            initialMarginAmount,
            escrowAmount,
            interestRate,
            false // withdrawOnOpen
        );

        return _borrowToken(
            borrower,
            loanOrderHash,
            borrowAmount,
            interestRate,
            loanTokenAddress,
            tradeTokenToFillAddress,
            false
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

        if (burntTokenReserveList.length > 0) {
            _claimLoanToken(_getNextOwed());

            if (burntTokenReserveListIndex[msg.sender].isSet && nextOwedLender_ != msg.sender) {
                // ensure lender is paid next
                nextOwedLender_ = msg.sender;
            }
        }
    }

    function settleInterest()
        external
        nonReentrant
    {
        _settleInterest();
    }

    // Sends non-LoanToken assets to the Oracle fund
    // These are assets that would otherwise be "stuck" due to a user accidently sending them to the contract
    function donateAsset(
        address tokenAddress)
        public
        returns (bool)
    {
        if (tokenAddress == loanTokenAddress)
            return false;

        uint256 balance = ERC20(tokenAddress).balanceOf(address(this));
        if (balance == 0)
            return false;

        require(ERC20(tokenAddress).transfer(
            bZxOracle, 
            balance
        ), "transfer of token balance failed");

        return true; 
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
            _value
        );

        // handle checkpoint update
        uint256 currentPrice = tokenPrice();
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
            _value
        );

        // handle checkpoint update
        uint256 currentPrice = tokenPrice();
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
        return checkpointPrices_[_user];
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
            return _protocolInterestRate(totalAssetSupply());
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
        if (totalAssetBorrow > 0) {
            return _protocolInterestRate(assetSupply)
                .mul(_getUtilizationRate(assetSupply))
                .mul(spreadMultiplier)
                .div(10**40);
        } else {
            return 0;
        }
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
        uint256 leverageAmount,
        bool withdrawOnOpen)
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
            loanData.initialMarginAmount,
            escrowAmount,
            nextLoanInterestRate(
                escrowAmount
                    .mul(10**20)
                    .div(loanData.initialMarginAmount)
            ),
            withdrawOnOpen
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
            _claimLoanToken(_getNextOwed());
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
            uint256 reserveTokenAmount = reserveAmount.mul(10**18).div(currentPrice);

            burntTokenReserved = burntTokenReserved.add(reserveTokenAmount);
            if (burntTokenReserveListIndex[receiver].isSet) {
                uint256 index = burntTokenReserveListIndex[receiver].index;
                burntTokenReserveList[index].amount = burntTokenReserveList[index].amount.add(reserveTokenAmount);
            } else {
                burntTokenReserveList.push(TokenReserves({
                    lender: receiver,
                    amount: reserveTokenAmount
                }));
                burntTokenReserveListIndex[receiver] = ListIndex({
                    index: burntTokenReserveList.length-1,
                    isSet: true
                });
            }

            loanAmountPaid = loanAmountAvailableInContract;
        }

        _burn(msg.sender, burnAmount, loanAmountPaid, currentPrice);

        if (burntTokenReserveListIndex[msg.sender].isSet || balances[msg.sender] > 0) {
            checkpointPrices_[msg.sender] = currentPrice;
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

    function _getNextOwed()
        internal
        view
        returns (address)
    {
        if (nextOwedLender_ != address(0))
            return nextOwedLender_;
        else if (burntTokenReserveList.length > 0)
            return burntTokenReserveList[0].lender;
        else
            return address(0);
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

        uint256 assetSupply = _totalAssetSupply(0);
        uint256 currentPrice = _tokenPrice(assetSupply);

        uint256 claimAmount = burntTokenReserveList[index].amount.mul(currentPrice).div(10**18);
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
            claimTokenAmount = claimAmount.mul(10**18).div(currentPrice);
            
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
            checkpointPrices_[lender] = currentPrice;
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
                burntTokenReserveList[burntTokenReserveListIndex[lender].index].amount :
                0,
            currentPrice
        );

        return claimAmount;
    }

    // returns borrowAmount
    function _borrowToken(
        address msgsender,
        bytes32 loanOrderHash,
        uint256 borrowAmount,
        uint256 interestRate,
        address collateralTokenAddress,
        address tradeTokenToFillAddress,
        bool withdrawOnOpen)
        internal
        returns (uint256)
    {
        if (borrowAmount == 0) {
            return 0;
        }
        
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

        require(IBZx(bZxContract).updateLoanAsLender(
            loanOrderHash,
            borrowAmount,
            interestRate.div(365),
            block.timestamp+1),
            "updateLoanAsLender failed"
        );

        require (IBZx(bZxContract).takeLoanOrderOnChainAsTraderByDelegate(
            msgsender,
            loanOrderHash,
            collateralTokenAddress,
            borrowAmount,
            tradeTokenToFillAddress,
            withdrawOnOpen) == borrowAmount,
            "takeLoanOrderOnChainAsTraderByDelegate failed"
        );

        // update total borrowed amount outstanding in loans
        totalAssetBorrow = totalAssetBorrow.add(borrowAmount);

        // checkpoint supply since the base protocol borrow stats have changed
        checkpointSupply_ = _totalAssetSupply(0);

        if (burntTokenReserveList.length > 0) {
            _claimLoanToken(_getNextOwed());
            _claimLoanToken(msgsender);
        }

        emit Borrow(
            msgsender,
            borrowAmount,
            interestRate,
            collateralTokenAddress,
            tradeTokenToFillAddress,
            withdrawOnOpen
        );

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

        if (lender == nextOwedLender_) {
            nextOwedLender_ = address(0);
        }
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
            assetSupply
                .mul(10**18)
                .div(totalTokenSupply) : lastPrice_;
    }

    function _protocolInterestRate(
        uint256 assetSupply)
        internal
        view
        returns (uint256)
    {
        uint256 interestRate;
        if (totalAssetBorrow > 0) {
            (,uint256 interestOwedPerDay,) = _getAllInterest();
            interestRate = interestOwedPerDay
                .mul(10**20)
                .div(totalAssetBorrow)
                .mul(365)
                .mul(checkpointSupply_)
                .div(assetSupply);
        } else {
            interestRate = baseRate;
        }

        return interestRate;
    }

    // next loan interest adjustment
    function _nextLoanInterestRate(
        uint256 newBorrowAmount)
        internal
        view
        returns (uint256)
    {
        uint256 assetSupply = totalAssetSupply();

        uint256 newUtilization = newBorrowAmount > 0 ? 
            newBorrowAmount
                .mul(10**20)
                .div(assetSupply) : 0;

        uint256 nextRate =  _getUtilizationRate(assetSupply)
            .add(newUtilization)
            .mul(rateMultiplier)
            .div(10**20)
            .add(baseRate);

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
        (interestPaidSoFar,,interestOwedPerDay,interestUnPaid) = IBZx(bZxContract).getLenderInterestForOracle(
            address(this),
            bZxOracle,
            loanTokenAddress // same as interestTokenAddress
        );
    }

    function _getBorrowAmount(
        uint256 marginAmount,
        uint256 escrowAmount,
        uint256 interestRate,
        bool withdrawOnOpen)
        internal
        view
        returns (uint256)
    {
        if (withdrawOnOpen) {
            // adjust for over-collateralized loan
            marginAmount = marginAmount.add(10**20);
        }
        
        // assumes that loan, collateral, and interest token are the same
        return escrowAmount
            .mul(10**40)
            .div(
                interestRate
                .mul(10**20)
                .div(31536000) // 86400 * 365
                .mul(maxDurationUnixTimestampSec)
                .div(marginAmount)
                .add(10**20))
            .div(marginAmount);
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

    // called only by BZxOracle when a loan is partially or fully closed
    function closeLoanNotifier(
        BZxObjects.LoanOrder memory loanOrder,
        BZxObjects.LoanPosition memory loanPosition,
        address loanCloser,
        uint256 closeAmount,
        bool /* isLiquidation */)
        public
        onlyOracle
        returns (bool)
    {
        LoanData memory loanData = loanOrderData[loanOrder.loanOrderHash];
        if (loanData.loanOrderHash == loanOrder.loanOrderHash) {

            totalAssetBorrow = totalAssetBorrow > closeAmount ? 
                totalAssetBorrow.sub(closeAmount) : 0;

            if (burntTokenReserveList.length > 0) {
                _claimLoanToken(_getNextOwed());
            } else {
                _settleInterest();
            }

            // checkpoint supply since the base protocol borrow stats have changed
            checkpointSupply_ = _totalAssetSupply(0);

            if (loanCloser != loanPosition.trader) {

                address tradeTokenAddress = iTokenizedRegistry(tokenizedRegistry).getTokenAsset(
                    loanPosition.trader,
                    2 // tokenType=pToken
                );

                if (tradeTokenAddress != address(0)) {

                    uint256 escrowAmount = ERC20(loanTokenAddress).balanceOf(loanPosition.trader);

                    if (escrowAmount > 0) {
                        (bool success,) = address(this).call.gas(gasleft())(
                            abi.encodeWithSignature(
                                "rolloverPosition(address,bytes32,uint256,uint256,address)",
                                loanPosition.trader,
                                loanOrder.loanOrderHash,
                                loanData.initialMarginAmount,
                                escrowAmount,
                                tradeTokenAddress
                            )
                        );
                        success;
                    }
                }
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

        bytes32 loanOrderHash = IBZx(bZxContract).pushLoanOrderOnChain(
            orderAddresses,
            orderValues,
            abi.encodePacked(address(this)), // oracleData -> closeLoanNotifier
            ""
        );
        IBZx(bZxContract).setLoanOrderDesc(
            loanOrderHash,
            name
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

    function setBZxContract(
        address _addr)
        public
        onlyOwner
    {
        bZxContract = _addr;
    }

    function setBZxVault(
        address _addr)
        public
        onlyOwner
    {
        bZxVault = _addr;
    }

    function setBZxOracle(
        address _addr)
        public
        onlyOwner
    {
        bZxOracle = _addr;
    }

    function setTokenizedRegistry(
        address _addr)
        public
        onlyOwner
    {
        tokenizedRegistry = _addr;
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
        require (!isInitialized_, "already initialized");

        name = _name;
        symbol = _symbol;
        decimals = 18;

        bZxContract = _bZxContract;
        bZxVault = _bZxVault;
        bZxOracle = _bZxOracle;
        loanTokenAddress = _loanTokenAddress;
        tokenizedRegistry = _tokenizedRegistry;

        spreadMultiplier = SafeMath.sub(10**20, IBZxOracle(_bZxOracle).interestFeePercent());

        lastPrice_ = initialPrice_;

        isInitialized_ = true;
    }
}
