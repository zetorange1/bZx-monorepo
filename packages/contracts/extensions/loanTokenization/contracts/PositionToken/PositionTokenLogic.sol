/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
 
pragma solidity 0.5.7;
pragma experimental ABIEncoderV2;

import "./SplittableToken.sol";
import "../shared/IBZx.sol";
import "../shared/IBZxOracle.sol";


interface ILoanToken {
    function getMaxDepositAmount(
        uint256 leverageAmount)
        external
        view
        returns (uint256);
}

contract PositionTokenLogic is SplittableToken {
    using SafeMath for uint256;


    function()
        external
        payable 
    {
        if (msg.sender != wethContract)
            _mintWithEther(msg.sender);
    }


    /* Public functions */

    // returns the amount of token minted
    function mintWithEther(
        address receiver)
        external
        payable
        returns (uint256)
    {
        return _mintWithEther(receiver);
    }

    // returns the amount of token minted
    function mintWithToken(
        address receiver,
        address depositTokenAddress,
        uint256 depositAmount)
        external
        nonReentrant
        returns (uint256)
    {
        require (depositAmount > 0, "depositAmount == 0");

        uint256 currentPrice = tokenPrice();

        require(ERC20(depositTokenAddress).transferFrom(
            msg.sender, 
            address(this), 
            depositAmount
        ), "transfer of token failed");

        return _mintWithToken(
            receiver,
            depositTokenAddress,
            depositAmount,
            currentPrice
        );
    }
    
    function burnToEther(
        address payable receiver,
        uint256 burnAmount)
        external
        nonReentrant
        returns (uint256)
    {
        uint256 loanAmountOwed = _burnToken(burnAmount);
        if (loanAmountOwed > 0) {
            if (wethContract != loanTokenAddress) {
                uint256 tempAllowance = ERC20(loanTokenAddress).allowance(address(this), bZxOracle);
                if (tempAllowance < loanAmountOwed) {
                    if (tempAllowance > 0) {
                        // reset approval to 0
                        require(ERC20(loanTokenAddress).approve(bZxOracle, 0), "token approval reset failed");
                    }

                    require(ERC20(loanTokenAddress).approve(bZxOracle, MAX_UINT), "token approval failed");
                }

                (uint256 destTokenAmountReceived,) = IBZxOracle(bZxOracle).tradeUserAsset(
                    loanTokenAddress,
                    address(0), // Ether
                    receiver, // receiverAddress
                    receiver, // returnToSenderAddress
                    loanAmountOwed,
                    MAX_UINT
                );

                loanAmountOwed = destTokenAmountReceived;
            } else {
                WETHInterface(wethContract).withdraw(loanAmountOwed);
                require(receiver.send(loanAmountOwed), "transfer of ETH failed");
            }
        }

        return loanAmountOwed;
    }

    function burnToToken(
        address receiver,
        address burnTokenAddress,
        uint256 burnAmount)
        external
        nonReentrant
        returns (uint256)
    {
        uint256 loanAmountOwed = _burnToken(burnAmount);
        if (loanAmountOwed > 0) {
            if (burnTokenAddress != loanTokenAddress) {
                uint256 tempAllowance = ERC20(loanTokenAddress).allowance(address(this), bZxOracle);
                if (tempAllowance < loanAmountOwed) {
                    if (tempAllowance > 0) {
                        // reset approval to 0
                        require(ERC20(loanTokenAddress).approve(bZxOracle, 0), "token approval reset failed");
                    }

                    require(ERC20(loanTokenAddress).approve(bZxOracle, MAX_UINT), "token approval failed");
                }

                (uint256 destTokenAmountReceived,) = IBZxOracle(bZxOracle).tradeUserAsset(
                    loanTokenAddress,
                    burnTokenAddress,
                    receiver, // receiverAddress
                    receiver, // returnToSenderAddress
                    loanAmountOwed,
                    MAX_UINT
                );

                loanAmountOwed = destTokenAmountReceived;
            } else {
                require(ERC20(loanTokenAddress).transfer(
                    receiver, 
                    loanAmountOwed
                ), "transfer of loanToken failed");
            }
        }

        return loanAmountOwed;
    }

    function triggerPosition()
        external
        nonReentrant
    {
        require(_triggerPosition(), "triggerPosition failed");
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
        uint256 currentPrice = denormalize(tokenPrice());
        if (balanceOf(_from) > 0) {
            checkpointPrices_[_from] = currentPrice;
        } else {
            checkpointPrices_[_from] = 0;
        }
        if (balanceOf(_to) > 0) {
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
        uint256 currentPrice = denormalize(tokenPrice());
        if (balanceOf(msg.sender) > 0) {
            checkpointPrices_[msg.sender] = currentPrice;
        } else {
            checkpointPrices_[msg.sender] = 0;
        }
        if (balanceOf(_to) > 0) {
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
        returns (uint256 price)
    {
        uint256 netCollateralAmount = 0;
        uint256 interestDepositRemaining = 0;
        if (totalSupply() > 0) {
            (netCollateralAmount, interestDepositRemaining,) = IBZx(bZxContract).getTotalEscrow(
                loanOrderHash,
                address(this));
        }
        
        return _tokenPrice(netCollateralAmount, interestDepositRemaining);
    }

    function liquidationPrice()
        public
        view
        returns (uint256 price)
    {
        (,uint256 maintenanceMarginAmount,uint256 currentMarginAmount) = IBZx(bZxContract).getMarginLevels(
            loanOrderHash,
            address(this));

        if (currentMarginAmount <= maintenanceMarginAmount)
            return tokenPrice();

        return tokenPrice()
            .mul(maintenanceMarginAmount)
            .div(currentMarginAmount);
    }

    function checkpointPrice(
        address _user)
        public
        view
        returns (uint256)
    {
        return normalize(checkpointPrices_[_user]);
    }

    function currentLeverage()
        public
        view
        returns (uint256 leverage)
    {
        (,,uint256 currentMarginAmount) = IBZx(bZxContract).getMarginLevels(
            loanOrderHash,
            address(this));

        if (currentMarginAmount == 0)
            return 0;

        return SafeMath.div(10**38, currentMarginAmount);
    }

    function marketLiquidityForAsset()
        public
        view
        returns (uint256)
    {
        return ILoanToken(loanTokenLender).getMaxDepositAmount(leverageAmount);
    }

    function marketLiquidityForToken()
        public
        view
        returns (uint256)
    {
        return ILoanToken(loanTokenLender).getMaxDepositAmount(leverageAmount)
            .mul(10**18)
            .div(tokenPrice());
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

    // returns the amount of token minted
    function _mintWithEther(
        address receiver)
        internal
        nonReentrant
        returns (uint256)
    {
        require (msg.value > 0, "msg.value == 0");

        uint256 currentPrice = tokenPrice();

        WETHInterface(wethContract).deposit.value(msg.value)();

        return _mintWithToken(
            receiver,
            wethContract,
            msg.value,
            currentPrice
        );
    }

    // returns the amount of token minted
    function _mintWithToken(
        address receiver,
        address depositTokenAddress,
        uint256 depositAmount,
        uint256 currentPrice)
        internal
        returns (uint256)
    {
        uint256 liquidityAmount = marketLiquidityForAsset();
        require(liquidityAmount > 0, "marketLiquidity == 0");

        uint256 refundAmount;
        if (depositTokenAddress != loanTokenAddress) {
            uint256 tempAllowance = ERC20(depositTokenAddress).allowance(address(this), bZxOracle);
            if (tempAllowance < depositAmount) {
                if (tempAllowance > 0) {
                    // reset approval to 0
                    require(ERC20(depositTokenAddress).approve(bZxOracle, 0), "token approval reset failed");
                }

                require(ERC20(depositTokenAddress).approve(bZxOracle, MAX_UINT), "token approval failed");
            }

            (uint256 destTokenAmountReceived, uint256 depositAmountUsed) = IBZxOracle(bZxOracle).tradeUserAsset(
                depositTokenAddress,
                loanTokenAddress,
                msg.sender, // receiverAddress
                msg.sender, // returnToSenderAddress
                depositAmount,
                liquidityAmount // maxDestAmount shouldn't exceed the market liquidity for the pToken
            );

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
        } else if (depositAmount > liquidityAmount) {
            refundAmount = depositAmount-liquidityAmount;
            if (msg.value == 0) {
                require(ERC20(loanTokenAddress).transfer(
                    msg.sender, 
                    refundAmount
                ), "transfer of token failed");
            } else {
                WETHInterface(wethContract).withdraw(refundAmount);
                require(msg.sender.send(refundAmount), "transfer of ETH failed");
            }
            depositAmount = liquidityAmount;
        }

        require(_triggerPosition(), "triggerPosition failed");

        uint256 mintAmount = depositAmount
            .mul(10**18)
           .div(currentPrice);

        _mint(receiver, mintAmount, depositAmount, currentPrice);

        checkpointPrices_[receiver] = denormalize(currentPrice);

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

        (uint256 netCollateralAmount, uint256 interestDepositRemaining, uint256 loanTokenAmountBorrowed) = IBZx(bZxContract).getTotalEscrow(
            loanOrderHash,
            address(this));
        uint256 currentPrice = _tokenPrice(netCollateralAmount, interestDepositRemaining);

        uint256 loanAmountOwed = burnAmount
            .mul(currentPrice)
            .div(10**18);

        uint256 loanAmountAvailableInContract = ERC20(loanTokenAddress).balanceOf(address(this));
        if (loanAmountAvailableInContract < loanAmountOwed) {
            // loan is open

            require(! IBZx(bZxContract).shouldLiquidate(
                loanOrderHash,
                address(this)
            ), "position should be liquidated first");

            uint256 closeAmount;
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

            IBZx(bZxContract).closeLoanPartially(
                loanOrderHash,
                closeAmount
            );

            loanAmountAvailableInContract = ERC20(loanTokenAddress).balanceOf(address(this));
            if (loanAmountAvailableInContract < loanAmountOwed) {
                loanAmountOwed = loanAmountAvailableInContract;
            }
        }

        _burn(msg.sender, burnAmount, loanAmountOwed, currentPrice);

        if (totalSupply() == 0) {
            splitFactor = 10**18;
            currentPrice = initialPrice;
        }

        if (balanceOf(msg.sender) > 0) {
            checkpointPrices_[msg.sender] = denormalize(currentPrice);
        } else {
            checkpointPrices_[msg.sender] = 0;
        }

        return loanAmountOwed;
    }

    function _triggerPosition()
        internal
        returns (bool)
    {
        uint256 assetBalance = ERC20(loanTokenAddress).balanceOf(address(this));
        if (assetBalance > 0) {
            uint256 tempAllowance = ERC20(loanTokenAddress).allowance.gas(4999)(address(this), bZxVault);
            if (tempAllowance < assetBalance) {
                if (tempAllowance > 0) {
                    // reset approval to 0
                    require(ERC20(loanTokenAddress).approve(bZxVault, 0), "token approval reset failed");
                }

                require(ERC20(loanTokenAddress).approve(bZxVault, MAX_UINT), "token approval failed");
            }

            (bool result,) = loanTokenLender.call(
                abi.encodeWithSignature(
                    "borrowTokenFromEscrow(uint256,uint256,address,bool)",
                    assetBalance,
                    leverageAmount,
                    tradeTokenAddress,
                    false
                )
            );
            return result;
        }
        return false;
    }


    /* Internal View functions */

    function _tokenPrice(
        uint256 netCollateralAmount,
        uint256 interestDepositRemaining)
        internal
        view
        returns (uint256)
    {
        return totalSupply_ > 0 ?
            normalize(
                ERC20(loanTokenAddress).balanceOf(address(this))
                .add(netCollateralAmount)
                .add(interestDepositRemaining)
                .mul(10**18)
                .div(totalSupply_)
            ) : initialPrice;
    }


    /* Owner-Only functions */

    function setLoanTokenLender(
        address _lender) 
        public 
        onlyOwner
    {
        if (_lender != loanTokenLender) {
            if (loanTokenLender != address(0)) {
                // disable old delegate
                IBZx(bZxContract).toggleDelegateApproved(
                    loanTokenLender,
                    false
                );
            }

            if (_lender != address(0)) {
                // enable new delegate
                IBZx(bZxContract).toggleDelegateApproved(
                    _lender,
                    true
                );
            }

            loanTokenLender = _lender;
        }
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

    function setWETHContract(
        address _addr)
        public
        onlyOwner
    {
        wethContract = _addr;
    }

    function setLoanTokenAddress(
        address _addr)
        public
        onlyOwner
    {
        loanTokenAddress = _addr;
    }

    function setTradeTokenAddress(
        address _addr)
        public
        onlyOwner
    {
        tradeTokenAddress = _addr;
    }

    function setInitialPrice(
        uint256 _value)
        public
        onlyOwner
    {
        require(_value > 0, "value can't be 0");
        initialPrice = _value;
    }

    function handleSplit()
        public
        onlyOwner
    {
        if (totalSupply() > 0) {
            splitFactor = splitFactor
                .mul(initialPrice)
                .div(
                    tokenPrice()
                );
        } else {
            splitFactor = 10**18;
        }
    }

    function initialize(
        address _bZxContract,
        address _bZxVault,
        address _bZxOracle,
        address _wethContract,
        address _loanTokenAddress,
        address _tradeTokenAddress,
        uint256 _leverageAmount,
        bytes32 _loanOrderHash,
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
        wethContract = _wethContract;
        loanTokenAddress = _loanTokenAddress;
        tradeTokenAddress = _tradeTokenAddress;

        loanOrderHash = _loanOrderHash;
        leverageAmount = _leverageAmount;

        initialPrice = 10**21; // starting price of 1,000

        // set the BZxVault spend approval
        require(ERC20(_loanTokenAddress).approve(_bZxVault, MAX_UINT), "approval of loan token failed");

        isInitialized_ = true;
    }
}
