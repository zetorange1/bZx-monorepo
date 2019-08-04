/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
 
pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./AdvancedToken.sol";
import "../shared/OracleNotifierInterface.sol";


interface IBZx {
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

    function takeOrderFromiToken(
        bytes32 loanOrderHash,              // existing loan order hash
        address trader,                     // borrower/trader
        address collateralTokenAddress,     // collateral token
        address tradeTokenAddress,          // trade token
        uint256 newInterestRate,            // new loan interest rate
        uint256 newLoanAmount,              // new loan size
        uint256[4] calldata sentAmounts)
            // interestInitialAmount: interestAmount sent to determine initial loan length (this is included in one of the below)
            // loanTokenSent: loanTokenAmount + interestAmount + any extra
            // collateralTokenSent: collateralAmountRequired + any extra
            // tradeTokenSent: tradeTokenAmount (optional)
        external
        returns (uint256);

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

    function oracleAddresses(
        address oracleAddress)
        external
        view
        returns (address);
}

interface IBZxOracle {
    function getTradeData(
        address sourceTokenAddress,
        address destTokenAddress,
        uint256 sourceTokenAmount)
        external
        view
        returns (uint256 sourceToDestRate, uint256 sourceToDestPrecision, uint256 destTokenAmount);

    function interestFeePercent()
        external
        view
        returns (uint256);
}

interface iTokenizedRegistry {
    function isTokenType(
        address _token,
        uint256 _tokenType)
        external
        view
        returns (bool valid);
}

contract LoanTokenLogicV2 is AdvancedToken, OracleNotifierInterface {
    using SafeMath for uint256;

    modifier onlyOracle() {
        require(msg.sender == IBZx(bZxContract).oracleAddresses(bZxOracle), "unauthorized");
        _;
    }


    function()
        external
        payable
    {}


    /* Public functions */

    function mintWithEther(
        address receiver)
        external
        payable
        nonReentrant
        returns (uint256 mintAmount)
    {
        require(loanTokenAddress == wethContract, "no ether");
        return _mintToken(
            receiver,
            msg.value
        );
    }

    function mint(
        address receiver,
        uint256 depositAmount)
        external
        nonReentrant
        returns (uint256 mintAmount)
    {
        return _mintToken(
            receiver,
            depositAmount
        );
    }

    function burnToEther(
        address payable receiver,
        uint256 burnAmount)
        external
        nonReentrant
        returns (uint256 loanAmountPaid)
    {
        require(loanTokenAddress == wethContract, "no ether");
        loanAmountPaid = _burnToken(
            receiver,
            burnAmount
        );

        if (loanAmountPaid != 0) {
            WETHInterface(wethContract).withdraw(loanAmountPaid);
            require(receiver.send(loanAmountPaid), "transfer failed");
        }
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

        if (loanAmountPaid != 0) {
            require(ERC20(loanTokenAddress).transfer(
                receiver,
                loanAmountPaid
            ), "transfer failed");
        }
    }

    // Called to borrow token for withdrawal or trade
    // borrowAmount: loan amount to borrow
    // leverageAmount: signals the amount of initial margin we will collect
    //   Please reference the docs for supported values.
    //   Example: 2000000000000000000 -> 150% initial margin
    //            2000000000000000028 -> 150% initial margin, 28-day fixed-term
    // interestInitialAmount: This value will indicate the initial duration of the loan
    //   This is ignored if the loan order has a fixed-term
    // loanTokenSent: loan token sent (interestAmount + extra)
    // collateralTokenSent: collateral token sent
    // tradeTokenSent: trade token sent
    // borrower: the address the loan will be assigned to (this address can be different than msg.sender)
    //    Collateral and interest for loan will be withdrawn from msg.sender
    // collateralTokenAddress: The token to collateralize the loan in
    // tradeTokenAddress: The borrowed token will be swap for this token to start a leveraged trade
    //    If the borrower wished to instead withdraw the borrowed token to their wallet, set this to address(0)
    //    If set to address(0), initial collateral required will equal initial margin percent + 100%
    // returns amount borrowed
    function borrowTokenAndUse(
        uint256 borrowAmount,
        uint256 leverageAmount,
        uint256 interestInitialAmount,
        uint256 loanTokenSent,
        uint256 collateralTokenSent,
        uint256 tradeTokenSent,
        address borrower,
        address collateralTokenAddress,
        address tradeTokenAddress)
        public
        nonReentrant
        returns (uint256)
    {
        require(collateralTokenAddress != address(0) &&
            (tradeTokenAddress == address(0) ||
                tradeTokenAddress != loanTokenAddress),
            "invalid addresses"
        );

        uint256 actualAmount = _borrowTokenAndUse(
            borrowAmount,
            leverageAmount,
            [
                interestInitialAmount,
                loanTokenSent,
                collateralTokenSent,
                tradeTokenSent
            ],
            borrower,
            collateralTokenAddress,
            tradeTokenAddress,
            false // amountIsADeposit
        );
        require(actualAmount != 0, "can't borrow");
        return actualAmount;
    }

    // Called by pTokens to borrow and immediately get into a positions
    // Other traders can call this, but it's recommended to instead use borrowTokenAndUse(...) instead
    // assumption: depositAmount is collateral + interest deposit and will be denominated in deposit token
    // assumption: loan token and interest token are the same
    // returns borrowAmount
    function marginTradeFromDeposit(
        uint256 depositAmount,
        uint256 leverageAmount,
        uint256 loanTokenSent,
        uint256 collateralTokenSent,
        uint256 tradeTokenSent,
        address trader,
        address depositTokenAddress,
        address collateralTokenAddress,
        address tradeTokenAddress)
        public
        nonReentrant
        returns (uint256)
    {
        require(tradeTokenAddress != address(0) &&
            tradeTokenAddress != loanTokenAddress,
            "invalid tradeTokenAddress"
        );

        uint256 amount = depositAmount;
        // To calculate borrow amount and interest owed to lender we need deposit amount to be represented as loan token
        if (depositTokenAddress == tradeTokenAddress) {
            (,,amount) = IBZxOracle(bZxOracle).getTradeData(
                tradeTokenAddress,
                loanTokenAddress,
                amount
            );
        } else if (depositTokenAddress != loanTokenAddress) {
            // depositTokenAddress can only be tradeTokenAddress or loanTokenAddress
            revert("invalid deposit token");
        }

        uint256 borrowAmount = _borrowTokenAndUse(
            amount,                     // amount of deposit
            leverageAmount,
            [
                0,                      // interestInitialAmount (interest is calculated based on fixed-term loan)
                loanTokenSent,
                collateralTokenSent,
                tradeTokenSent
            ],
            trader,
            collateralTokenAddress,     // collateralTokenAddress
            tradeTokenAddress,          // tradeTokenAddress
            true                        // amountIsADeposit
        );
        require(borrowAmount != 0, "can't borrow");
        return borrowAmount;
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

        if (burntTokenReserveList.length != 0) {
            _claimLoanToken(address(0));

            if (burntTokenReserveListIndex[msg.sender].isSet && nextOwedLender_ != msg.sender) {
                // ensure lender is paid next
                nextOwedLender_ = msg.sender;
            }
        }
    }

    function wrapEther()
        public
    {
        if (address(this).balance != 0) {
            WETHInterface(wethContract).deposit.value(address(this).balance)();
        }
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
            IBZx(bZxContract).oracleAddresses(bZxOracle),
            balance
        ), "transfer failed");

        return true;
    }

    function transfer(
        address _to,
        uint256 _value)
        public
        returns (bool)
    {
        require(_value <= balances[msg.sender], "insufficient balance");
        require(_to != address(0), "no burn");

        balances[msg.sender] = balances[msg.sender].sub(_value);
        balances[_to] = balances[_to].add(_value);

        // handle checkpoint update
        uint256 currentPrice = tokenPrice();
        if (burntTokenReserveListIndex[msg.sender].isSet || balances[msg.sender] != 0) {
            checkpointPrices_[msg.sender] = currentPrice;
        } else {
            checkpointPrices_[msg.sender] = 0;
        }
        if (burntTokenReserveListIndex[_to].isSet || balances[_to] != 0) {
            checkpointPrices_[_to] = currentPrice;
        } else {
            checkpointPrices_[_to] = 0;
        }

        emit Transfer(msg.sender, _to, _value);
        return true;
    }

    function transferFrom(
        address _from,
        address _to,
        uint256 _value)
        public
        returns (bool)
    {
        uint256 allowanceAmount = allowed[_from][msg.sender];
        require(_value <= balances[_from], "insufficient balance");
        require(_value <= allowanceAmount, "insufficient allowance");
        require(_to != address(0), "no burn");

        balances[_from] = balances[_from].sub(_value);
        balances[_to] = balances[_to].add(_value);
        if (allowanceAmount < MAX_UINT) {
            allowed[_from][msg.sender] = allowanceAmount.sub(_value);
        }

        // handle checkpoint update
        uint256 currentPrice = tokenPrice();
        if (burntTokenReserveListIndex[_from].isSet || balances[_from] != 0) {
            checkpointPrices_[_from] = currentPrice;
        } else {
            checkpointPrices_[_from] = 0;
        }
        if (burntTokenReserveListIndex[_to].isSet || balances[_to] != 0) {
            checkpointPrices_[_to] = currentPrice;
        } else {
            checkpointPrices_[_to] = 0;
        }

        emit Transfer(_from, _to, _value);
        return true;
    }


    /* Public View functions */

    function tokenPrice()
        public
        view
        returns (uint256 price)
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
        returns (uint256 price)
    {
        return checkpointPrices_[_user];
    }

    function totalReservedSupply()
        public
        view
        returns (uint256)
    {
        return burntTokenReserved.mul(tokenPrice()).div(10**18);
    }

    function marketLiquidity()
        public
        view
        returns (uint256)
    {
        uint256 totalSupply = totalAssetSupply();
        uint256 reservedSupply = totalReservedSupply();
        if (totalSupply > reservedSupply) {
            totalSupply = totalSupply.sub(reservedSupply);
        } else {
            return 0;
        }

        if (totalSupply > totalAssetBorrow) {
            return totalSupply.sub(totalAssetBorrow);
        } else {
            return 0;
        }
    }

    // interest that borrowers are currently paying for open loans, prior to any fees
    function borrowInterestRate()
        public
        view
        returns (uint256)
    {
        if (totalAssetBorrow != 0) {
            return _protocolInterestRate(totalAssetSupply());
        } else {
            return baseRate;
        }
    }

    // interest that lenders are currently receiving for open loans, prior to any fees
    function supplyInterestRate()
        public
        view
        returns (uint256)
    {
        if (totalAssetBorrow != 0) {
            return _supplyInterestRate(totalAssetSupply());
        }
    }

    // the rate the next base protocol borrower will receive based on the amount being borrowed
    function nextBorrowInterestRate(
        uint256 borrowAmount)
        public
        view
        returns (uint256)
    {
        if (borrowAmount != 0) {
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

        return _nextBorrowInterestRate(borrowAmount);
    }

    // kept for backwards compatability
    function nextLoanInterestRate(
        uint256 borrowAmount)
        public
        view
        returns (uint256)
    {
        return nextBorrowInterestRate(borrowAmount);
    }

    function nextSupplyInterestRate(
        uint256 supplyAmount)
        public
        view
        returns (uint256)
    {
        if (totalAssetBorrow != 0) {
            return _supplyInterestRate(totalAssetSupply().add(supplyAmount));
        }
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

    function getMaxEscrowAmount(
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
            .div(_adjustValue(
                10**20, // maximum possible interest (100%)
                loanData.maxDurationUnixTimestampSec,
                loanData.initialMarginAmount));
    }

    function getLeverageList()
        public
        view
        returns (uint256[] memory)
    {
        return leverageList;
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

    function _mintToken(
        address receiver,
        uint256 depositAmount)
        internal
        returns (uint256 mintAmount)
    {
        require (depositAmount != 0, "amount == 0");

        if (burntTokenReserveList.length != 0) {
            _claimLoanToken(address(0));
            _claimLoanToken(receiver);
            if (msg.sender != receiver)
                _claimLoanToken(msg.sender);
        } else {
            _settleInterest();
        }

        uint256 currentPrice = _tokenPrice(_totalAssetSupply(0));
        mintAmount = depositAmount.mul(10**18).div(currentPrice);

        if (msg.value == 0) {
            require(ERC20(loanTokenAddress).transferFrom(
                msg.sender,
                address(this),
                depositAmount
            ), "transfer failed");
        } else {
            WETHInterface(wethContract).deposit.value(depositAmount)();
        }

        _mint(receiver, mintAmount, depositAmount, currentPrice);

        checkpointPrices_[receiver] = currentPrice;
    }

    function _burnToken(
        address receiver,
        uint256 burnAmount)
        internal
        returns (uint256 loanAmountPaid)
    {
        require(burnAmount != 0, "amount == 0");

        if (burnAmount > balanceOf(msg.sender)) {
            burnAmount = balanceOf(msg.sender);
        }

        if (burntTokenReserveList.length != 0) {
            _claimLoanToken(address(0));
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

        if (burntTokenReserveListIndex[msg.sender].isSet || balances[msg.sender] != 0) {
            checkpointPrices_[msg.sender] = currentPrice;
        } else {
            checkpointPrices_[msg.sender] = 0;
        }
    }

    function _settleInterest()
        internal
    {
        if (lastSettleTime_ != block.timestamp) {
            (bool success,) = bZxContract.call.gas(gasleft())(
                abi.encodeWithSignature(
                    "payInterestForOracle(address,address)",
                    bZxOracle, // (leave as original value)
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
        else if (burntTokenReserveList.length != 0)
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

        if (lender == address(0))
            lender = _getNextOwed();

        if (!burntTokenReserveListIndex[lender].isSet)
            return 0;

        uint256 index = burntTokenReserveListIndex[lender].index;
        uint256 currentPrice = _tokenPrice(_totalAssetSupply(0));

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
        ), "transfer failed");

        if (burntTokenReserveListIndex[lender].isSet || balances[lender] != 0) {
            checkpointPrices_[lender] = currentPrice;
        } else {
            checkpointPrices_[lender] = 0;
        }

        burntTokenReserved = burntTokenReserved > claimTokenAmount ?
            burntTokenReserved.sub(claimTokenAmount) :
            0;

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

    function _borrowTokenAndUse(
        uint256 amount,
        uint256 leverageAmount,
        uint256[4] memory sentAmounts,
        address borrower,
        address collateralTokenAddress,
        address tradeTokenAddress,
        bool amountIsADeposit)
        internal
        returns (uint256)
    {
        if (amount == 0) {
            return 0;
        }

        bytes32 loanOrderHash = loanOrderHashes[leverageAmount];
        require(loanOrderHash != 0, "invalid leverage");

        _settleInterest();

        uint256 interestRate;
        if (amountIsADeposit) {
            (amount, interestRate) = _getBorrowAmountAndRate(
                loanOrderHash,
                amount
            );
        } else {
            // amount is borrow amount
            interestRate = _nextBorrowInterestRate(amount);
        }

        if (tradeTokenAddress == address(0)) {
            // tradeTokenSent is ignored if trade token isn't specified
            sentAmounts[3] = 0;
        }

        return _borrowTokenAndUseFinal(
            loanOrderHash,
            amount, // borrowAmount
            interestRate,
            sentAmounts,
            borrower,
            collateralTokenAddress,
            tradeTokenAddress
        );
    }

    // returns borrowAmount
    function _borrowTokenAndUseFinal(
        bytes32 loanOrderHash,
        uint256 borrowAmount,
        uint256 interestRate,
        uint256[4] memory sentAmounts,
        address borrower,
        address collateralTokenAddress,
        address tradeTokenAddress)
        internal
        returns (uint256)
    {
        borrowAmount = _verifyBorrowAmount(borrowAmount);
        require (borrowAmount != 0, "borrow failed");

        // handle transfers prior to adding borrowAmount to loanTokenSent
        _verifyTransfers(
            borrower,
            collateralTokenAddress,
            tradeTokenAddress,
            borrowAmount,
            sentAmounts[1], // loanTokenSent
            sentAmounts[2], // collateralTokenSent
            sentAmounts[3]  // tradeTokenSent
        );

        // adding the loan token amount from the lender to loanTokenSent
        sentAmounts[1] = sentAmounts[1].add(borrowAmount);

        // borrowAmount returned might be less if it was adjusted down
        borrowAmount = IBZx(bZxContract).takeOrderFromiToken(
            loanOrderHash,
            borrower,
            collateralTokenAddress,
            tradeTokenAddress,
            interestRate,
            borrowAmount,
            sentAmounts
        );
        require (borrowAmount != 0, "borrow failed");

        // update total borrowed amount outstanding in loans
        totalAssetBorrow = totalAssetBorrow.add(borrowAmount);

        // checkpoint supply since the base protocol borrow stats have changed
        checkpointSupply = _totalAssetSupply(0);

        if (burntTokenReserveList.length != 0) {
            _claimLoanToken(address(0));
            _claimLoanToken(borrower);
        }

        emit Borrow(
            borrower,
            borrowAmount,
            interestRate,
            collateralTokenAddress,
            tradeTokenAddress,
            tradeTokenAddress == address(0) // withdrawOnOpen
        );

        return borrowAmount;
    }

    function _verifyBorrowAmount(
        uint256 borrowAmount)
        internal
        view
        returns (uint256)
    {
        uint256 availableToBorrow = ERC20(loanTokenAddress).balanceOf(address(this));
        if (availableToBorrow == 0)
            return 0;

        uint256 reservedSupply = totalReservedSupply();
        if (availableToBorrow > reservedSupply) {
            availableToBorrow = availableToBorrow.sub(reservedSupply);
        } else {
            return 0;
        }

        if (borrowAmount > availableToBorrow) {
            //return availableToBorrow;
            return 0;
        }

        return borrowAmount;
    }

    function _verifyTransfers(
        address borrower,
        address collateralTokenAddress,
        address tradeTokenAddress,
        uint256 borrowAmount,
        uint256 loanTokenSent,
        uint256 collateralTokenSent,
        uint256 tradeTokenSent)
        internal
    {
        if (tradeTokenAddress == address(0)) { // withdrawOnOpen == true
            require(ERC20(loanTokenAddress).transfer(
                borrower,
                borrowAmount
            ), "withdraw failed");
        } else {
            require(ERC20(loanTokenAddress).transfer(
                bZxVault,
                borrowAmount
            ), "transfer failed");
        }

        if (collateralTokenSent != 0) {
            if (collateralTokenAddress == loanTokenAddress) {
                loanTokenSent = loanTokenSent.add(collateralTokenSent);
            } else if (collateralTokenAddress == tradeTokenAddress) {
                tradeTokenSent = tradeTokenSent.add(collateralTokenSent);
            } else {
                require(ERC20(collateralTokenAddress).transferFrom(
                    msg.sender,
                    bZxVault,
                    collateralTokenSent
                ), "transfer failed");
            }
        }

        if (loanTokenSent != 0) {
            if (loanTokenAddress == tradeTokenAddress) {
                tradeTokenSent = tradeTokenSent.add(loanTokenSent);
            } else {
                require(ERC20(loanTokenAddress).transferFrom(
                    msg.sender,
                    bZxVault,
                    loanTokenSent
                ), "transfer failed");
            }
        }

        if (tradeTokenSent != 0) {
            require(ERC20(tradeTokenAddress).transferFrom(
                msg.sender,
                bZxVault,
                tradeTokenSent
            ), "transfer failed");
        }
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

        return totalTokenSupply != 0 ?
            assetSupply
                .mul(10**18)
                .div(totalTokenSupply) : initialPrice;
    }

    function _protocolInterestRate(
        uint256 assetSupply)
        internal
        view
        returns (uint256)
    {
        uint256 interestRate;
        if (totalAssetBorrow != 0) {
            (,uint256 interestOwedPerDay,) = _getAllInterest();
            interestRate = interestOwedPerDay
                .mul(10**20)
                .div(totalAssetBorrow)
                .mul(365)
                .mul(checkpointSupply)
                .div(assetSupply);
        } else {
            interestRate = baseRate;
        }

        return interestRate;
    }

    // next supply interest adjustment
    function _supplyInterestRate(
        uint256 assetSupply)
        public
        view
        returns (uint256)
    {
        if (totalAssetBorrow != 0) {
            return _protocolInterestRate(assetSupply)
                .mul(_getUtilizationRate(assetSupply))
                .div(10**20);
        } else {
            return 0;
        }
    }

    // next borrow interest adjustment
    function _nextBorrowInterestRate(
        uint256 newBorrowAmount)
        internal
        view
        returns (uint256 nextRate)
    {
        uint256 assetSupply = totalAssetSupply();

        uint256 utilizationRate = _getUtilizationRate(assetSupply)
            .add(newBorrowAmount != 0 ?
                newBorrowAmount
                .mul(10**20)
                .div(assetSupply) : 0);

        uint256 minRate = baseRate;
        uint256 maxRate = rateMultiplier.add(baseRate);

        if (utilizationRate > 90 ether) {
            // scale rate proportionally up to 100%

            utilizationRate = utilizationRate.sub(90 ether);
            if (utilizationRate > 10 ether)
                utilizationRate = 10 ether;

            maxRate = maxRate
                .mul(90)
                .div(100);

            nextRate = utilizationRate
                .mul(SafeMath.sub(100 ether, maxRate))
                .div(10 ether)
                .add(maxRate);
        } else {
            nextRate = utilizationRate
                .mul(rateMultiplier)
                .div(10**20)
                .add(baseRate);

            if (nextRate < minRate)
                nextRate = minRate;
            else if (nextRate > maxRate)
                nextRate = maxRate;
        }

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
            bZxOracle, // (leave as original value)
            loanTokenAddress // same as interestTokenAddress
        );
    }

    function _getBorrowAmountAndRate(
        bytes32 loanOrderHash,
        uint256 depositAmount)
        internal
        view
        returns (uint256 borrowAmount, uint256 interestRate)
    {
        LoanData memory loanData = loanOrderData[loanOrderHash];
        require(loanData.initialMarginAmount != 0, "invalid leverage");

        interestRate = _nextBorrowInterestRate(
            depositAmount
                .mul(10**20)
                .div(loanData.initialMarginAmount)
        );

        // assumes that loan, collateral, and interest token are the same
        borrowAmount = depositAmount
            .mul(10**40)
            .div(_adjustValue(
                interestRate,
                loanData.maxDurationUnixTimestampSec,
                loanData.initialMarginAmount))
            .div(loanData.initialMarginAmount);
    }

    function _adjustValue(
        uint256 interestRate,
        uint256 maxDuration,
        uint256 marginAmount)
        internal
        pure
        returns (uint256)
    {
        return maxDuration != 0 ?
            interestRate
                .mul(10**20)
                .div(31536000) // 86400 * 365
                .mul(maxDuration)
                .div(marginAmount)
                .add(10**20) :
            10**20;
    }

    function _getUtilizationRate(
        uint256 assetSupply)
        internal
        view
        returns (uint256)
    {
        if (totalAssetBorrow != 0 && assetSupply != 0) {
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
        return totalSupply_.add(burntTokenReserved) != 0 ?
            ERC20(loanTokenAddress).balanceOf(address(this))
                .add(totalAssetBorrow)
                .add(interestUnPaid) : 0;
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

            if (burntTokenReserveList.length != 0) {
                _claimLoanToken(address(0));
            } else {
                _settleInterest();
            }

            if (closeAmount == 0)
                return true;

            // checkpoint supply since the base protocol borrow stats have changed
            checkpointSupply = _totalAssetSupply(0);

            if (loanCloser != loanPosition.trader) {
                if (iTokenizedRegistry(tokenizedRegistry).isTokenType(
                    loanPosition.trader,
                    2 // tokenType=pToken
                )) {
                    (bool success,) = loanPosition.trader.call(
                        abi.encodeWithSignature(
                            "triggerPosition(bool)",
                            !loanPosition.active // openPosition
                        )
                    );
                    success;
                }
            }

            return true;
        } else {
            return false;
        }
    }


    /* Owner-Only functions */

    function initLeverage(
        uint256[4] memory orderParams) // leverageAmount, initialMarginAmount, maintenanceMarginAmount, maxDurationUnixTimestampSec
        public
        onlyOwner
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
        onlyOwner
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
        onlyOwner
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
        uint256 _rateMultiplier)
        public
        onlyOwner
    {
        require(rateMultiplier.add(baseRate) <= 10**20);
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
        address _wethContract,
        address _loanTokenAddress,
        address _tokenizedRegistry,
        string memory _name,
        string memory _symbol)
        public
        onlyOwner
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

        spreadMultiplier = SafeMath.sub(10**20, IBZxOracle(_bZxOracle).interestFeePercent());

        initialPrice = 10**18; // starting price of 1

        isInitialized_ = true;
    }
}
