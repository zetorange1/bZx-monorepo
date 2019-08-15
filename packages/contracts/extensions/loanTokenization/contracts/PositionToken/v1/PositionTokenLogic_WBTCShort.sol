/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
 
pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./SplittableToken.sol";


interface IBZx {
    function closeLoanPartiallyFromCollateral(
        bytes32 loanOrderHash,
        uint256 closeAmount)
        external
        returns (uint256 actualCloseAmount);

    function withdrawCollateral(
        bytes32 loanOrderHash,
        uint256 withdrawAmount)
        external
        returns (uint256 amountWithdrawn);

    function depositCollateral(
        bytes32 loanOrderHash,
        address depositTokenAddress,
        uint256 depositAmount)
        external
        returns (bool);

    function depositPosition(
        bytes32 loanOrderHash,
        address depositTokenAddress,
        uint256 depositAmount)
        external
        returns (bool);

    function getMarginLevels(
        bytes32 loanOrderHash,
        address trader)
        external
        view
        returns (
            uint256 initialMarginAmount,
            uint256 maintenanceMarginAmount,
            uint256 currentMarginAmount);

    function getTotalEscrowWithRate(
        bytes32 loanOrderHash,
        address trader,
        uint256 toCollateralRate,
        uint256 toCollateralPrecision)
        external
        view
        returns (
            uint256 netCollateralAmount,
            uint256 interestDepositRemaining,
            uint256 loanToCollateralAmount,
            uint256, // toCollateralRate
            uint256); // toCollateralPrecision

    function oracleAddresses(
        address oracleAddress)
        external
        view
        returns (address);
}

interface IBZxOracle {
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
}

interface ILoanToken {
    function getMaxEscrowAmount(
        uint256 leverageAmount)
        external
        view
        returns (uint256);

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
        external
        returns (bytes32 loanOrderHash);
}

contract PositionTokenLogic_WBTCShort is SplittableToken {
    using SafeMath for uint256;


    function()
        external
        payable
    {}


    /* Public functions */

    // returns the amount of token minted
    // maxPriceAllowed of 0 will be ignored
    function mintWithEther(
        address receiver,
        uint256 maxPriceAllowed)
        external
        payable
        nonReentrant
        returns (uint256)
    {
        require (msg.value != 0, "msg.value == 0");

        uint256 netCollateralAmount;
        uint256 interestDepositRemaining;
        uint256 toCollateralRate;
        uint256 toCollateralPrecision;
        if (totalSupply() != 0) {
            (netCollateralAmount,
             interestDepositRemaining,
             ,
             toCollateralRate,
             toCollateralPrecision) = IBZx(bZxContract).getTotalEscrowWithRate(
                loanOrderHash,
                address(this),
                0,
                0
            );
        }
        uint256 currentPrice = _tokenPrice(netCollateralAmount, interestDepositRemaining);

        if (maxPriceAllowed != 0) {
            require(
                currentPrice <= maxPriceAllowed,
                "price too high"
            );
        }

        WETHInterface(wethContract).deposit.value(msg.value)();

        return _mintWithToken(
            receiver,
            wethContract,
            msg.value,
            currentPrice,
            toCollateralRate,
            toCollateralPrecision
        );
    }

    // returns the amount of token minted
    // maxPriceAllowed of 0 is ignored
    function mintWithToken(
        address receiver,
        address depositTokenAddress,
        uint256 depositAmount,
        uint256 maxPriceAllowed)
        external
        nonReentrant
        returns (uint256)
    {
        require (depositAmount != 0, "depositAmount == 0");

        uint256 netCollateralAmount;
        uint256 interestDepositRemaining;
        uint256 toCollateralRate;
        uint256 toCollateralPrecision;
        if (totalSupply() != 0) {
            (netCollateralAmount,
             interestDepositRemaining,
             ,
             toCollateralRate,
             toCollateralPrecision) = IBZx(bZxContract).getTotalEscrowWithRate(
                loanOrderHash,
                address(this),
                0,
                0
            );
        }
        uint256 currentPrice = _tokenPrice(netCollateralAmount, interestDepositRemaining);

        if (maxPriceAllowed != 0) {
            require(
                currentPrice <= maxPriceAllowed,
                "price too high"
            );
        }

        require(ERC20(depositTokenAddress).transferFrom(
            msg.sender,
            address(this),
            depositAmount
        ), "transfer of token failed");

        return _mintWithToken(
            receiver,
            depositTokenAddress,
            depositAmount,
            currentPrice,
            toCollateralRate,
            toCollateralPrecision
        );
    }

    function burnToEther(
        address payable receiver,
        uint256 burnAmount,
        uint256 minPriceAllowed)
        external
        nonReentrant
        returns (uint256)
    {
        uint256 loanAmountOwed = _burnToken(burnAmount, minPriceAllowed);
        if (loanAmountOwed != 0) {
            if (wethContract != loanTokenAddress) {
                (uint256 destTokenAmountReceived,) = _tradeUserAsset(
                    loanTokenAddress,   // sourceTokenAddress
                    address(0),         // destTokenAddress
                    receiver,           // receiver
                    loanAmountOwed      // sourceTokenAmount
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
        uint256 burnAmount,
        uint256 minPriceAllowed)
        external
        nonReentrant
        returns (uint256)
    {
        uint256 loanAmountOwed = _burnToken(burnAmount, minPriceAllowed);
        if (loanAmountOwed != 0) {
            if (burnTokenAddress != loanTokenAddress) {
                (uint256 destTokenAmountReceived,) = _tradeUserAsset(
                    loanTokenAddress,   // sourceTokenAddress
                    burnTokenAddress,   // destTokenAddress
                    receiver,           // receiver
                    loanAmountOwed      // sourceTokenAmount
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

    function wrapEther()
        external
        nonReentrant
    {
        if (address(this).balance != 0) {
            WETHInterface(wethContract).deposit.value(address(this).balance)();
        }
    }

    // Sends non-LoanToken assets to the Oracle fund
    // These are assets that would otherwise be "stuck" due to a user accidently sending them to the contract
    function donateAsset(
        address tokenAddress)
        external
        nonReentrant
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
        if (balanceOf(_from) != 0) {
            checkpointPrices_[_from] = currentPrice;
        } else {
            checkpointPrices_[_from] = 0;
        }
        if (balanceOf(_to) != 0) {
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
        if (balanceOf(msg.sender) != 0) {
            checkpointPrices_[msg.sender] = currentPrice;
        } else {
            checkpointPrices_[msg.sender] = 0;
        }
        if (balanceOf(_to) != 0) {
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
        uint256 netCollateralAmount;
        uint256 interestDepositRemaining;
        if (totalSupply() != 0) {
            (netCollateralAmount, interestDepositRemaining,,,) = IBZx(bZxContract).getTotalEscrowWithRate(
                loanOrderHash,
                address(this),
                0,
                0
            );
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

        if (maintenanceMarginAmount == 0)
            return 0;
        else if (currentMarginAmount <= maintenanceMarginAmount)
            return tokenPrice();

        return tokenPrice()
            .mul(maintenanceMarginAmount)
            .div(currentMarginAmount);
    }

    function checkpointPrice(
        address _user)
        public
        view
        returns (uint256 price)
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

    function marketLiquidityForLoan()
        public
        view
        returns (uint256)
    {
        return ILoanToken(loanTokenLender).getMaxEscrowAmount(leverageAmount);
    }

    function marketLiquidityForAsset()
        public
        view
        returns (uint256)
    {
        return ILoanToken(loanTokenLender).getMaxEscrowAmount(leverageAmount);
    }

    function marketLiquidityForToken()
        public
        view
        returns (uint256)
    {
        return ILoanToken(loanTokenLender).getMaxEscrowAmount(leverageAmount)
            .mul(10**28) // 10**18 * 10**(18-8) - WBTC adjust
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
            .div(10**28); // 10**18 * 10**(18-8) - WBTC adjust
    }


    /* Internal functions */

    // returns the amount of token minted
    function _mintWithToken(
        address receiver,
        address depositTokenAddress,
        uint256 depositAmount,
        uint256 currentPrice,
        uint256 toCollateralRate,
        uint256 toCollateralPrecision)
        internal
        returns (uint256)
    {
        uint256 refundAmount;
        if (depositTokenAddress != loanTokenAddress && depositTokenAddress != tradeTokenAddress) {
            (uint256 destTokenAmountReceived, uint256 depositAmountUsed) = _tradeUserAsset(
                depositTokenAddress,    // sourceTokenAddress
                loanTokenAddress,       // destTokenAddress
                address(this),          // receiver
                depositAmount           // sourceTokenAmount
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
            depositTokenAddress = loanTokenAddress;
        }

        // depositAmount must be >= 0.001 loanToken units
        /*require(depositAmount >= (10**15 *
            10**uint256(decimals) /
            10**28 // 10**18 * 10**(18-8) - WBTC adjust
        ), "depositAmount too low");*/

        // open position
        _triggerPosition(
            depositTokenAddress,
            depositAmount
        );

        // get post-entry supply
        (uint256 netCollateralAmount, uint256 interestDepositRemaining,,,) = IBZx(bZxContract).getTotalEscrowWithRate(
            loanOrderHash,
            address(this),
            toCollateralRate,
            toCollateralPrecision
        );
        uint256 postEntrySupply = ERC20(loanTokenAddress).balanceOf(address(this))
            .add(netCollateralAmount)
            .add(interestDepositRemaining)
            .mul(10**28) // 10**18 * 10**(18-8) - WBTC adjust
            .div(currentPrice);
        require(postEntrySupply > totalSupply(), "supply not added");

        uint256 mintAmount = postEntrySupply - totalSupply();
        _mint(
            receiver,
            mintAmount,
            depositAmount,
            currentPrice
        );

        checkpointPrices_[receiver] = denormalize(currentPrice);

        return mintAmount;
    }

    function _burnToken(
        uint256 burnAmount,
        uint256 minPriceAllowed)
        internal
        returns (uint256)
    {
        require(burnAmount != 0, "burnAmount == 0");

        if (burnAmount > balanceOf(msg.sender)) {
            burnAmount = balanceOf(msg.sender);
        }

        (uint256 netCollateralAmount,
         uint256 interestDepositRemaining,
         ,
         uint256 toCollateralRate,
         uint256 toCollateralPrecision) = IBZx(bZxContract).getTotalEscrowWithRate(
            loanOrderHash,
            address(this),
            0,
            0
        );
        uint256 currentPrice = _tokenPrice(netCollateralAmount, interestDepositRemaining);

        if (minPriceAllowed != 0) {
            require(
                currentPrice >= minPriceAllowed,
                "price too low"
            );
        }

        uint256 loanAmountOwed = burnAmount
            .mul(currentPrice)
            .div(10**28); // 10**18 * 10**(18-8) - WBTC adjust

        uint256 loanAmountAvailableInContract = ERC20(loanTokenAddress).balanceOf(address(this));

        uint256 preCloseEscrow = loanAmountAvailableInContract
            .add(netCollateralAmount)
            .add(interestDepositRemaining);

        bool didCallWithdraw;
        if (loanAmountAvailableInContract < loanAmountOwed) {
            // will revert if the position needs to be liquidated
            IBZx(bZxContract).closeLoanPartiallyFromCollateral(
                loanOrderHash,
                burnAmount < totalSupply() ?
                    loanAmountOwed.sub(loanAmountAvailableInContract) :
                    MAX_UINT
            );

            loanAmountAvailableInContract = ERC20(loanTokenAddress).balanceOf(address(this));
            didCallWithdraw = true;
        }

        if (loanAmountAvailableInContract < loanAmountOwed && burnAmount < totalSupply()) {
            uint256 collateralWithdrawn = IBZx(bZxContract).withdrawCollateral(
                loanOrderHash,
                loanAmountOwed.sub(loanAmountAvailableInContract)
            );
            if (collateralWithdrawn != 0) {
                loanAmountAvailableInContract = loanAmountAvailableInContract.add(collateralWithdrawn);
                didCallWithdraw = true;
            }
        }

        if (didCallWithdraw) {
            if (burnAmount < totalSupply()) {
                (netCollateralAmount, interestDepositRemaining,,,) = IBZx(bZxContract).getTotalEscrowWithRate(
                    loanOrderHash,
                    address(this),
                    toCollateralRate,
                    toCollateralPrecision
                );
                uint256 postCloseEscrow = loanAmountAvailableInContract
                    .add(netCollateralAmount)
                    .add(interestDepositRemaining);

                if (postCloseEscrow < preCloseEscrow) {
                    /*uint256 slippageLoss = loanAmountOwed
                        .mul(preCloseEscrow - postCloseEscrow)
                        .div(netCollateralAmount);*/
                    uint256 slippageLoss = preCloseEscrow - postCloseEscrow;

                    require(loanAmountOwed > slippageLoss, "slippage too great");
                    loanAmountOwed = loanAmountOwed - slippageLoss;
                }
            }

            if (loanAmountOwed > loanAmountAvailableInContract) {
                /*
                // allow at most 5% loss here
                require(
                    loanAmountOwed
                    .sub(loanAmountAvailableInContract)
                    .mul(10**20)
                    .div(loanAmountOwed) <= (5 * 10**18),
                    "contract value too low"
                );
                */
                loanAmountOwed = loanAmountAvailableInContract;
            }
        }

        // unless burning the full balance, loanAmountOwed must be >= 0.001 loanToken units
        /*require(burnAmount == balanceOf(msg.sender) || loanAmountOwed >= (
            10**15 *
            10**uint256(decimals)
            / 10**28 // 10**18 * 10**(18-8) - WBTC adjust
        ), "burnAmount too low");*/

        _burn(msg.sender, burnAmount, loanAmountOwed, currentPrice);

        if (totalSupply() == 0 || tokenPrice() == 0) {
            splitFactor = 10**18;
            currentPrice = initialPrice;
        }

        if (balanceOf(msg.sender) != 0) {
            checkpointPrices_[msg.sender] = denormalize(currentPrice);
        } else {
            checkpointPrices_[msg.sender] = 0;
        }

        return loanAmountOwed;
    }

    function _tradeUserAsset(
        address sourceTokenAddress,
        address destTokenAddress,
        address receiver,
        uint256 sourceTokenAmount)
        internal
        returns (uint256 destTokenAmountReceived, uint256 sourceTokenAmountUsed)
    {
        address oracleAddress = IBZx(bZxContract).oracleAddresses(bZxOracle);

        uint256 tempAllowance = ERC20(sourceTokenAddress).allowance(address(this), oracleAddress);
        if (tempAllowance < sourceTokenAmount) {
            if (tempAllowance != 0) {
                // reset approval to 0
                require(ERC20(sourceTokenAddress).approve(oracleAddress, 0), "token approval reset failed");
            }

            require(ERC20(sourceTokenAddress).approve(oracleAddress, MAX_UINT), "token approval failed");
        }

        (destTokenAmountReceived, sourceTokenAmountUsed) = IBZxOracle(oracleAddress).tradeUserAsset(
            sourceTokenAddress,
            destTokenAddress,
            receiver, // receiverAddress
            receiver, // returnToSenderAddress
            sourceTokenAmount,
            MAX_UINT, // maxDestTokenAmount
            0 // minConversionRate
        );
    }

    function _triggerPosition(
        address depositTokenAddress,
        uint256 depositAmount)
        internal
        returns (bool)
    {
        if (tradeTokenAddress == wethContract || loanTokenAddress == wethContract || depositAmount == 0 || depositAmount == MAX_UINT) {
            uint256 ethBalance = address(this).balance;
            if (ethBalance != 0) {
                WETHInterface(wethContract).deposit.value(ethBalance)();
                if (tradeTokenAddress != wethContract && loanTokenAddress != wethContract) {
                    _tradeUserAsset(
                        wethContract,       // sourceTokenAddress
                        loanTokenAddress,   // destTokenAddress
                        address(this),      // receiver
                        ethBalance          // sourceTokenAmount
                    );
                }
            }
        }

        uint256 tradeTokenBalance = ERC20(tradeTokenAddress).balanceOf(address(this));
        uint256 loanTokenBalance = ERC20(loanTokenAddress).balanceOf(address(this));

        if (depositAmount == 0) {
            if (tradeTokenBalance != 0) {
                (uint256 destTokenAmountReceived,) = _tradeUserAsset(
                    tradeTokenAddress,  // sourceTokenAddress
                    loanTokenAddress,   // destTokenAddress
                    address(this),      // receiver
                    tradeTokenBalance   // sourceTokenAmount
                );
                loanTokenBalance = loanTokenBalance
                    .add(destTokenAmountReceived);
            }

            if (loanTokenBalance != 0) {
                uint256 tempAllowance = ERC20(loanTokenAddress).allowance(address(this), bZxVault);
                if (tempAllowance < loanTokenBalance) {
                    if (tempAllowance != 0) {
                        // reset approval to 0
                        require(ERC20(loanTokenAddress).approve(bZxVault, 0), "token approval reset failed");
                    }

                    require(ERC20(loanTokenAddress).approve(bZxVault, MAX_UINT), "token approval failed");
                }

                return IBZx(bZxContract).depositCollateral(
                    loanOrderHash,
                    loanTokenAddress,
                    loanTokenBalance
                );
            }
        } else {
            if (loanTokenBalance != 0) {
                uint256 tempAllowance = ERC20(loanTokenAddress).allowance(address(this), loanTokenLender);
                if (tempAllowance < loanTokenBalance) {
                    if (tempAllowance != 0) {
                        // reset approval to 0
                        require(ERC20(loanTokenAddress).approve(loanTokenLender, 0), "token approval reset failed");
                    }

                    require(ERC20(loanTokenAddress).approve(loanTokenLender, MAX_UINT), "token approval failed");
                }

                if (depositAmount == MAX_UINT) {
                    depositAmount = loanTokenBalance;
                    depositTokenAddress = loanTokenAddress;
                }
            }

            if (tradeTokenBalance != 0) {
                uint256 tempAllowance = ERC20(tradeTokenAddress).allowance(address(this), loanTokenLender);
                if (tempAllowance < tradeTokenBalance) {
                    if (tempAllowance != 0) {
                        // reset approval to 0
                        require(ERC20(tradeTokenAddress).approve(loanTokenLender, 0), "token approval reset failed");
                    }

                    require(ERC20(tradeTokenAddress).approve(loanTokenLender, MAX_UINT), "token approval failed");
                }

                if (depositAmount == MAX_UINT) {
                    depositAmount = tradeTokenBalance;
                    depositTokenAddress = tradeTokenAddress;
                }
            }

            if (loanTokenBalance != 0 || tradeTokenBalance != 0) {
                ILoanToken(loanTokenLender).marginTradeFromDeposit(
                    depositAmount,          // depositAmount
                    leverageAmount,         // leverageAmount
                    0,                      // loanTokenSent
                    loanTokenBalance,       // collateralTokenSent
                    tradeTokenBalance,      // tradeTokenSent
                    address(this),          // trader
                    depositTokenAddress,    // depositTokenAddress
                    loanTokenAddress,       // collateralTokenAddress
                    tradeTokenAddress       // tradeTokenAddress
                );
                return true;
            }
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
        return totalSupply_ != 0 ?
            normalize(
                ERC20(loanTokenAddress).balanceOf(address(this))
                .add(netCollateralAmount)
                .add(interestDepositRemaining)
                .mul(10**28) // 10**18 * 10**(18-8) - WBTC adjust
                .div(totalSupply_)
            ) : initialPrice;
    }


    /* Owner-Only functions */

    function setLeverageAmount(
        uint256 _amount)
        public
        onlyOwner
    {
        leverageAmount = _amount;
    }

    function setLoanTokenLender(
        address _lender)
        public
        onlyOwner
    {
        loanTokenLender = _lender;
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

    function setInitialPrice(
        uint256 _value)
        public
        onlyOwner
    {
        require(_value != 0, "value can't be 0");
        initialPrice = _value;
    }

    function setSplitValue(
        uint256 _value)
        public
        onlyOwner
    {
        require(_value != 0, "value can't be 0");
        splitFactor = _value;
    }

    function handleSplit()
        public
        onlyOwner
    {
        if (totalSupply() != 0) {
            splitFactor = splitFactor
                .mul(initialPrice)
                .div(
                    tokenPrice()
                );
        } else {
            splitFactor = 10**18;
        }
    }

    function depositCollateralToLoanFromBalance(
        uint256 amount)
        external
        nonReentrant
    {
        uint256 assetBalance = ERC20(loanTokenAddress).balanceOf(address(this));
        uint256 depositAmount = amount == 0 || amount > assetBalance ?
            assetBalance :
            amount;

        uint256 tempAllowance = ERC20(loanTokenAddress).allowance(address(this), bZxVault);
        if (tempAllowance < depositAmount) {
            if (tempAllowance != 0) {
                // reset approval to 0
                require(ERC20(loanTokenAddress).approve(bZxVault, 0), "token approval reset failed");
            }

            require(ERC20(loanTokenAddress).approve(bZxVault, MAX_UINT), "token approval failed");
        }

        require(IBZx(bZxContract).depositCollateral(
            loanOrderHash,
            loanTokenAddress,
            depositAmount
        ), "deposit failed");
    }

    // depositTokenAddress is swapped to loanTokenAddress if needed in the protocol
    // this is callable by anyone that wants to top up the collateral
    function depositCollateralToLoan(
        address depositTokenAddress,
        uint256 depositAmount)
        external
        nonReentrant
    {
        require(ERC20(depositTokenAddress).transferFrom(
            msg.sender,
            address(this),
            depositAmount
        ), "transfer of token failed");

        uint256 tempAllowance = ERC20(depositTokenAddress).allowance(address(this), bZxVault);
        if (tempAllowance < depositAmount) {
            if (tempAllowance != 0) {
                // reset approval to 0
                require(ERC20(depositTokenAddress).approve(bZxVault, 0), "token approval reset failed");
            }

            require(ERC20(depositTokenAddress).approve(bZxVault, MAX_UINT), "token approval failed");
        }

        require(IBZx(bZxContract).depositCollateral(
            loanOrderHash,
            depositTokenAddress,
            depositAmount
        ), "deposit failed");
    }

    function triggerPosition(
        bool openPosition)
        public
    {
        require(totalSupply_ != 0, "no supply");
        if (openPosition) {
            _triggerPosition(address(0), MAX_UINT);
        } else {
            _triggerPosition(address(0), 0);
        }
    }

    function initialize(
        address _bZxContract,
        address _bZxVault,
        address _bZxOracle,
        address _wethContract,
        address _loanTokenAddress,
        address _tradeTokenAddress,
        address _lender,
        uint256 _leverageAmount,
        bytes32 _loanOrderHash,
        string memory _name,
        string memory _symbol)
        public
        onlyOwner
    {
        bZxContract = _bZxContract;
        bZxVault = _bZxVault;
        bZxOracle = _bZxOracle;
        wethContract = _wethContract;
        loanTokenAddress = _loanTokenAddress;
        tradeTokenAddress = _tradeTokenAddress;
        loanTokenLender = _lender;

        loanOrderHash = _loanOrderHash;
        leverageAmount = _leverageAmount;

        name = _name;
        symbol = _symbol;
        decimals = 18;

        initialPrice = 10**21; // starting price of 1,000
    }
}