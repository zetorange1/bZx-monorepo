/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
 
pragma solidity 0.5.5;

import "./shared/LoanTokenization.sol";
import "./shared/SplittableToken.sol";


interface bZxInterface {
    function toggleDelegateApproved(
        address delegate,
        bool isApproved)
        external;

    function closeLoanPartially(
        bytes32 loanOrderHash,
        uint256 closeAmount)
        external
        returns (bool);

    function getTotalEscrow(
        bytes32 loanOrderHash,
        address trader)
        external
        view
        returns (uint256 netCollateralAmount, uint256 interestDepositRemaining, uint256 loanTokenAmountBorrowed);
}

interface ILoanToken {
    function borrowTokenFromDeposit(
        uint256 depositAmount,
        uint256 leverageAmount,
        address collateralTokenAddress,
        address tradeTokenToFillAddress,
        bool withdrawOnOpen)
        external
        returns (uint256);

    function getMaxDepositAmount(
        uint256 leverageAmount)
        external
        view
        returns (uint256);
}

interface KyberNetworkInterface {
    /// @notice use token address ETH_TOKEN_ADDRESS for ether
    /// @dev makes a trade between src and dest token and send dest token to destAddress
    /// @param src Src token
    /// @param srcAmount amount of src tokens
    /// @param dest   Destination token
    /// @param destAddress Address to send tokens to
    /// @param maxDestAmount A limit on the amount of dest tokens
    /// @param minConversionRate The minimal conversion rate. If actual rate is lower, trade is canceled.
    /// @param walletId is the wallet ID to send part of the fees
    /// @return amount of actual dest tokens
    function trade(
        address src,
        uint256 srcAmount,
        address dest,
        address destAddress,
        uint256 maxDestAmount,
        uint256 minConversionRate,
        address walletId
    )
        external
        payable
        returns(uint256);
}

contract PositionToken is LoanTokenization, SplittableToken {
    using SafeMath for uint256;

    address public LoanTokenLender;
    address public tradeTokenAddress;
    address public kyberContract;

    uint256 public leverageAmount;
    bytes32 public loanOrderHash;

    uint256 internal constant initialPrice_ = 10**20; // starting price of 100
    uint256 public constant splitPrice = 10**22;
    uint256 public constant splitPriceReverse = 10**14;

    uint256 internal lastPrice_;

    constructor(
        address _bZxContract,
        address _bZxVault,
        address _bZxOracle,
        address _wethContract,
        address _loanTokenAddress,
        address _tradeTokenAddress,
        address _kyberContract,
        uint256 _leverageAmount,
        bytes32 _loanOrderHash,
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
        tradeTokenAddress = _tradeTokenAddress;
        kyberContract = _kyberContract;

        loanOrderHash = _loanOrderHash;
        leverageAmount = _leverageAmount;

        lastPrice_ = initialPrice_;

        // set the BZxVault spend approval
        require(ERC20(_loanTokenAddress).approve(_bZxVault, MAX_UINT), "approval of loan token failed");
    }

    function()
        external
        payable 
    {
        require(msg.sender == wethContract, "calls to fallback not allowed");
    }


    /* Public functions */

    // returns the amount of token minted
    function mintWithEther()
        public
        payable
        returns (uint256)
    {
        require (msg.value > 0, "msg.value == 0");

        uint256 netCollateralAmount = 0;
        uint256 interestDepositRemaining = 0;
        if (totalSupply_ > 0) {
            (netCollateralAmount, interestDepositRemaining,) = bZxInterface(bZxContract).getTotalEscrow(
                loanOrderHash,
                address(this));
        }
        (uint256 currentPrice,) = _priceWithSplit(netCollateralAmount, interestDepositRemaining);

        WETHInterface(wethContract).deposit.value(msg.value)();

        return _mintWithToken(
            wethContract,
            msg.value,
            currentPrice
        );
    }

    // returns the amount of token minted
    function mintWithToken(
        address depositTokenAddress,
        uint256 depositAmount)
        public
        returns (uint256)
    {
        require (depositAmount > 0, "depositAmount == 0");
        
        uint256 netCollateralAmount = 0;
        uint256 interestDepositRemaining = 0;
        if (totalSupply_ > 0) {
            (netCollateralAmount, interestDepositRemaining,) = bZxInterface(bZxContract).getTotalEscrow(
                loanOrderHash,
                address(this));
        }
        (uint256 currentPrice,) = _priceWithSplit(netCollateralAmount, interestDepositRemaining);

        require(ERC20(depositTokenAddress).transferFrom(
            msg.sender, 
            address(this), 
            depositAmount
        ), "transfer of token failed");

        return _mintWithToken(
            depositTokenAddress,
            depositAmount,
            currentPrice
        );
    }
    
    function burnToEther(
        uint256 burnAmount)
        public
        returns (uint256)
    {
        require (loanTokenAddress == wethContract, "ether is not supported");

        uint256 loanAmountOwed = _burnToken(burnAmount);
        if (loanAmountOwed > 0) {
            WETHInterface(wethContract).withdraw(loanAmountOwed);
            require(msg.sender.send(loanAmountOwed), "transfer of ETH failed");
        }

        return loanAmountOwed;
    }

    function burnToToken(
        address burnTokenAddress,
        uint256 burnAmount)
        public
        returns (uint256)
    {
        uint256 loanAmountOwed = _burnToken(burnAmount);
        if (loanAmountOwed > 0) {
            if (burnTokenAddress != loanTokenAddress) {
                // re-up the Kyber spend approval if needed
                uint256 tempAllowance = ERC20(loanTokenAddress).allowance(address(this), kyberContract);
                if (tempAllowance < loanAmountOwed) {
                    if (tempAllowance > 0) {
                        // reset approval to 0
                        require(ERC20(loanTokenAddress).approve(kyberContract, 0), "token approval reset failed");
                    }

                    require(ERC20(loanTokenAddress).approve(kyberContract, MAX_UINT), "token approval failed");
                }

                uint256 loanAmountOwedBefore = ERC20(loanTokenAddress).balanceOf(address(this));

                uint256 destTokenAmountReceived = KyberNetworkInterface(kyberContract).trade(
                    loanTokenAddress,
                    loanAmountOwed,
                    burnTokenAddress,
                    msg.sender, // receiver
                    MAX_UINT,
                    0, // no min coversation rate
                    bZxOracle
                );

                uint256 loanAmountOwedUsed = loanAmountOwedBefore.sub(ERC20(loanTokenAddress).balanceOf(address(this)));
                if (loanAmountOwed > loanAmountOwedUsed) {
                    require(ERC20(loanTokenAddress).transfer(
                        msg.sender, 
                        loanAmountOwed-loanAmountOwedUsed
                    ), "transfer of token failed");
                }

                loanAmountOwed = destTokenAmountReceived;
            } else {
                require(ERC20(loanTokenAddress).transfer(
                    msg.sender, 
                    loanAmountOwed
                ), "transfer of loanToken failed");
            }
        }

        return loanAmountOwed;
    }

    function handleSplit()
        public
    {
        uint256 currentPrice = tokenPrice();
        if (currentPrice <= splitPriceReverse || currentPrice >= splitPrice) {
            splitFactor_ = initialPrice_
                .div(currentPrice);
        }
    }

    function triggerPosition() 
        public
    {
        _triggerPosition();
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

        if (balances[msg.sender] > 0) {
            checkpointPrices_[msg.sender] = tokenPrice().div(splitFactor_);
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

        if (balances[msg.sender] > 0) {
            checkpointPrices_[msg.sender] = tokenPrice().div(splitFactor_);
        } else {
            checkpointPrices_[msg.sender] = 0;
        }

        return true;
    }

    /* Public View functions */

    function tokenPrice()
        public
        view
        returns (uint256 price)
    {
        uint256 netCollateralAmount = 0;
        uint256 interestDepositRemaining = 0;
        if (totalSupply_ > 0) {
            (netCollateralAmount, interestDepositRemaining,) = bZxInterface(bZxContract).getTotalEscrow(
                loanOrderHash,
                address(this));
        }
        
        return _tokenPrice(netCollateralAmount, interestDepositRemaining);
    }

    function checkpointPrice(
        address _user)
        public
        view
        returns (uint256)
    {
        return checkpointPrices_[_user]
            .mul(splitFactor_);
    }

    function marketLiquidity()
        public
        view
        returns (uint256)
    {
        return ILoanToken(LoanTokenLender).getMaxDepositAmount(leverageAmount);
    }


    /* Internal functions */

    // returns the amount of token minted
    function _mintWithToken(
        address depositTokenAddress,
        uint256 depositAmount,
        uint256 currentPrice)
        internal
        returns (uint256)
    {
        uint256 liquidity = marketLiquidity();
        require(liquidity > 0, "marketLiquidity == 0");

        uint256 refundAmount;
        if (depositTokenAddress != loanTokenAddress) {
            // re-up the Kyber spend approval if needed
            uint256 tempAllowance = ERC20(depositTokenAddress).allowance(address(this), kyberContract);
            if (tempAllowance < depositAmount) {
                if (tempAllowance > 0) {
                    // reset approval to 0
                    require(ERC20(depositTokenAddress).approve(kyberContract, 0), "token approval reset failed");
                }

                require(ERC20(depositTokenAddress).approve(kyberContract, MAX_UINT), "token approval failed");
            }
            
            uint256 depositAmountBefore = ERC20(depositTokenAddress).balanceOf(address(this));

            uint256 destTokenAmountReceived = KyberNetworkInterface(kyberContract).trade(
                depositTokenAddress,
                depositAmount,
                loanTokenAddress,
                address(this), // receiver
                liquidity, // maxDestAmount shouldn't exceed the market liquidity for the pToken
                0, // no min coversation rate
                bZxOracle
            );

            uint256 depositAmountUsed = depositAmountBefore.sub(ERC20(depositTokenAddress).balanceOf(address(this)));
            if (depositAmount > depositAmountUsed) {
                refundAmount = depositAmount-depositAmountUsed;
                if (msg.value == 0) {
                    require(ERC20(depositTokenAddress).transfer(
                        msg.sender, 
                        refundAmount
                    ), "transfer of token failed");
                } else {
                    WETHInterface(wethContract).withdraw(refundAmount);
                    require(msg.sender.send(refundAmount), "transfer of ETH failed");
                }
            }

            depositAmount = destTokenAmountReceived;
        } else if (depositAmount > liquidity) {
            refundAmount = depositAmount-liquidity;
            if (msg.value == 0) {
                require(ERC20(loanTokenAddress).transfer(
                    msg.sender, 
                    refundAmount
                ), "transfer of token failed");
            } else {
                WETHInterface(wethContract).withdraw(refundAmount);
                require(msg.sender.send(refundAmount), "transfer of ETH failed");
            }
            depositAmount = liquidity;
        }

        _triggerPosition();

        uint256 mintAmount = depositAmount
            .mul(10**18)
           .div(currentPrice);

        _mint(msg.sender, mintAmount, depositAmount, currentPrice);

        checkpointPrices_[msg.sender] = currentPrice.div(splitFactor_);

        return mintAmount;
    }

    function _burnToken(
        uint256 burnAmount)
        internal
        returns (uint256)
    {
        require(burnAmount > 0, "burnAmount == 0");

        if (burnAmount > balanceOf(msg.sender)) {
            burnAmount = balanceOf(msg.sender);
        }

        (uint256 netCollateralAmount, uint256 interestDepositRemaining, uint256 loanTokenAmountBorrowed) = bZxInterface(bZxContract).getTotalEscrow(
            loanOrderHash,
            address(this));
        (uint256 currentPrice, bool withSplit) = _priceWithSplit(netCollateralAmount, interestDepositRemaining);

        if (withSplit) {
            burnAmount = burnAmount
                .div(splitFactor_);
        }

        uint256 loanAmountOwed = burnAmount
            .mul(currentPrice)
            .div(10**18);

        uint256 loanAmountAvailableInContract = ERC20(loanTokenAddress).balanceOf(address(this));
        if (loanAmountAvailableInContract < loanAmountOwed) {
            // loan is open
            uint closeAmount;
            if (burnAmount < totalSupply()) {
                closeAmount = loanAmountOwed
                    .sub(loanAmountAvailableInContract)
                    .mul(loanTokenAmountBorrowed)
                    .div(netCollateralAmount
                        .add(interestDepositRemaining));
            } else {
                // close entire loan
                closeAmount = MAX_UINT;
            }

            require(bZxInterface(bZxContract).closeLoanPartially(
                loanOrderHash,
                closeAmount),
                "failed to close part of the loan"
            );

            loanAmountOwed = ERC20(loanTokenAddress).balanceOf(address(this));
        }

        _burn(msg.sender, burnAmount, loanAmountOwed, currentPrice);

        if (balances[msg.sender] > 0) {
            checkpointPrices_[msg.sender] = currentPrice.div(splitFactor_);
        } else {
            checkpointPrices_[msg.sender] = 0;
        }

        if (totalSupply_ == 0)
            lastPrice_ = currentPrice;

        return loanAmountOwed;
    }

    function _priceWithSplit(
        uint256 netCollateralAmount,
        uint256 interestDepositRemaining)
        internal
        returns (uint256, bool)
    {
        uint256 currentPrice = _tokenPrice(netCollateralAmount, interestDepositRemaining);

        if (currentPrice <= splitPriceReverse || currentPrice >= splitPrice) {
            splitFactor_ = initialPrice_
                .div(currentPrice);

            return (initialPrice_, true);
        }

        return (currentPrice, false);
    }

    function _triggerPosition()
        internal
    {
        uint256 fullBalance = ERC20(loanTokenAddress).balanceOf(address(this));
        if (fullBalance > 0) {
            uint256 tempAllowance = ERC20(loanTokenAddress).allowance.gas(4999)(address(this), bZxVault);
            if (tempAllowance < fullBalance) {
                if (tempAllowance > 0) {
                    // reset approval to 0
                    require(ERC20(loanTokenAddress).approve(bZxVault, 0), "token approval reset failed");
                }

                require(ERC20(loanTokenAddress).approve(bZxVault, MAX_UINT), "token approval failed");
            }
            ILoanToken(LoanTokenLender).borrowTokenFromDeposit(
                fullBalance,
                leverageAmount,
                loanTokenAddress,
                tradeTokenAddress,
                false);
        }
    }


    /* Internal View functions */

    function _tokenPrice(
        uint256 netCollateralAmount,
        uint256 interestDepositRemaining)
        internal
        view
        returns (uint256)
    {
        if (totalSupply_ > 0) {
            return ERC20(loanTokenAddress).balanceOf(address(this))
                .add(netCollateralAmount)
                .add(interestDepositRemaining)
                .mul(10**18)
                .div(totalSupply_)
                .mul(splitFactor_);
        } else {
            return lastPrice_;
        }
    }


    /* Owner-Only functions */

    function setLoanTokenLender(
        address _lender) 
        public 
        onlyOwner
    {
        if (LoanTokenLender != _lender) {
            if (LoanTokenLender != address(0)) {
                // disable old delegate
                bZxInterface(bZxContract).toggleDelegateApproved(
                    LoanTokenLender,
                    false
                );
            }

            // enable new delegate
            bZxInterface(bZxContract).toggleDelegateApproved(
                _lender,
                true
            );

            LoanTokenLender = _lender;
        }
    }
}
