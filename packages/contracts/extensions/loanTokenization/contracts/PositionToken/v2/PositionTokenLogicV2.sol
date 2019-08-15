/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
 
pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./SplittableTokenV2.sol";


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

    function getTradeData(
        address sourceTokenAddress,
        address destTokenAddress,
        uint256 sourceTokenAmount)
        external
        view
        returns (uint256 sourceToDestRate, uint256 sourceToDestPrecision, uint256 destTokenAmount);
}

contract ILoanToken {
    function getMaxEscrowAmount(
        uint256 leverageAmount)
        public
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

contract PositionTokenLogicV2 is SplittableTokenV2 {
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
        require(!mintingPaused, "paused");
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
        require(!mintingPaused, "paused");
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
        require(!burningPaused, "paused");
        (uint256 tradeTokenAmountOwed, uint256 currentPrice) = _burnToken(
            burnAmount,
            minPriceAllowed
        );
        if (tradeTokenAmountOwed != 0) {
            if (wethContract != tradeTokenAddress) {
                (uint256 destTokenAmountReceived,) = _tradeUserAsset(
                    tradeTokenAddress,      // sourceTokenAddress
                    address(0),             // destTokenAddress (address(0) == Ether)
                    receiver,               // receiver
                    tradeTokenAmountOwed    // sourceTokenAmount
                );

                tradeTokenAmountOwed = destTokenAmountReceived;
            } else {
                WETHInterface(wethContract).withdraw(tradeTokenAmountOwed);
                require(receiver.send(tradeTokenAmountOwed), "transfer of ETH failed");
            }
        }

        emit Burn(
            receiver,
            address(0),
            tradeTokenAmountOwed,
            burnAmount,
            currentPrice
        );

        return tradeTokenAmountOwed;
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
        require(!burningPaused, "paused");
        (uint256 tradeTokenAmountOwed, uint256 currentPrice) = _burnToken(
            burnAmount,
            minPriceAllowed
        );
        if (tradeTokenAmountOwed != 0) {
            if (burnTokenAddress != tradeTokenAddress) {
                (uint256 destTokenAmountReceived,) = _tradeUserAsset(
                    tradeTokenAddress,      // sourceTokenAddress
                    burnTokenAddress,       // destTokenAddress
                    receiver,               // receiver
                    tradeTokenAmountOwed    // sourceTokenAmount
                );

                tradeTokenAmountOwed = destTokenAmountReceived;
            } else {
                require(ERC20(tradeTokenAddress).transfer(
                    receiver,
                    tradeTokenAmountOwed
                ), "transfer of loanToken failed");
            }
        }

        emit Burn(
            receiver,
            burnTokenAddress,
            tradeTokenAmountOwed,
            burnAmount,
            currentPrice
        );

        return tradeTokenAmountOwed;
    }

    // Sends non-tradeToken and non-loanToken assets to the Oracle fund
    // These are assets that would otherwise be "stuck" due to a user accidently sending them to the contract
    function donateAsset(
        address tokenAddress)
        external
        nonReentrant
        returns (bool)
    {
        if (tokenAddress == tradeTokenAddress || tokenAddress == loanTokenAddress)
            return false;

        uint256 balance;
        address token;
        if (tokenAddress == address(0)) {
            balance = address(this).balance;
            if (balance == 0)
                return false;
            WETHInterface(wethContract).deposit.value(balance)();
            token = wethContract;
        } else {
            balance = ERC20(tokenAddress).balanceOf(address(this));
            if (balance == 0)
                return false;
            token = tokenAddress;
        }

        require(ERC20(token).transfer(
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
        (uint256 initialMarginAmount, uint256 maintenanceMarginAmount,uint256 currentMarginAmount) = IBZx(bZxContract).getMarginLevels(
            loanOrderHash,
            address(this));

        if (maintenanceMarginAmount == 0)
            return 0;
        else if (currentMarginAmount <= maintenanceMarginAmount)
            return tokenPrice();

        uint256 initialPrice;
        uint256 currentPrice = tokenPrice();
        uint256 offset = currentPrice
            .mul(initialMarginAmount);
        if (currentMarginAmount >= initialMarginAmount) {
            offset = offset
            .mul(currentMarginAmount - initialMarginAmount)
            .div(10**40);

            initialPrice = currentPrice
                .sub(offset);
        } else {
            offset = offset
            .mul(initialMarginAmount - currentMarginAmount)
            .div(10**40);

            initialPrice = currentPrice
                .add(offset);
        }

        uint256 initialLeverage = SafeMath.div(10**38, initialMarginAmount);
        uint256 currentLeverage = SafeMath.div(10**38, currentMarginAmount);

        price = initialPrice
            .mul(
                maintenanceMarginAmount
                .mul(currentLeverage)
                .div(10**20)
                .add(initialLeverage)
            )
            .div(initialLeverage.add(10**18));
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
        returns (uint256 value)
    {
        value = ILoanToken(loanTokenLender).getMaxEscrowAmount(leverageAmount);
    }

    function getMaxDepositAmount()
        public
        view
        returns (uint256 value)
    {
        value = ILoanToken(loanTokenLender).getMaxEscrowAmount(leverageAmount);

        if (!shortPosition) {
            (uint256 sourceToDestRate, uint256 sourceToDestPrecision,) = IBZxOracle(bZxOracle).getTradeData(
                loanTokenAddress,
                tradeTokenAddress,
                MAX_UINT // get best rate
            );
            value = value
                .mul(sourceToDestRate)
                .div(sourceToDestPrecision);
        }
    }

    function positionValue(
        address _owner)
        public
        view
        returns (uint256 value)
    {
        value = balanceOf(_owner)
            .mul(tokenPrice())
            .div(tradeTokenAdjustment);

        if (shortPosition) {
            (uint256 sourceToDestRate, uint256 sourceToDestPrecision,) = IBZxOracle(bZxOracle).getTradeData(
                tradeTokenAddress,
                loanTokenAddress,
                MAX_UINT // get best rate
            );
            value = value
                .mul(sourceToDestRate)
                .div(sourceToDestPrecision);
        }
    }

    function positionTokenPrice()
        public
        view
        returns (uint256 price)
    {
        uint256 sourceToDestRate;
        uint256 sourceToDestPrecision;
        if (shortPosition) {
            (sourceToDestRate, sourceToDestPrecision,) = IBZxOracle(bZxOracle).getTradeData(
                loanTokenAddress,
                tradeTokenAddress,
                MAX_UINT // get best rate
            );
            price = sourceToDestRate
                .mul(10**loanTokenDecimals)
                .div(sourceToDestPrecision);
        } else {
            (sourceToDestRate, sourceToDestPrecision,) = IBZxOracle(bZxOracle).getTradeData(
                tradeTokenAddress,
                loanTokenAddress,
                MAX_UINT // get best rate
            );
            price = sourceToDestRate
                .mul(10**tradeTokenDecimals)
                .div(sourceToDestPrecision);
        }
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
        if (depositTokenAddress != tradeTokenAddress && depositTokenAddress != loanTokenAddress) {
            (uint256 destTokenAmountReceived, uint256 depositAmountUsed) = _tradeUserAsset(
                depositTokenAddress,    // sourceTokenAddress
                tradeTokenAddress,      // destTokenAddress
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
            depositTokenAddress = tradeTokenAddress;
        }

        // depositAmount must be >= 0.001 deposit token units
        require(depositAmount >= (10**15 *
            10**uint256(decimals) /
            (depositTokenAddress == tradeTokenAddress ?
                tradeTokenAdjustment :
                loanTokenAdjustment)
        ), "depositAmount too low");

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
        uint256 postEntrySupply = ERC20(tradeTokenAddress).balanceOf(address(this))
            .add(netCollateralAmount)
            .add(interestDepositRemaining)
            .mul(tradeTokenAdjustment)
            .div(currentPrice);
        require(postEntrySupply > totalSupply(), "supply not added");

        uint256 mintAmount = postEntrySupply - totalSupply();

        _mint(
            receiver,
            mintAmount
        );
        emit Mint(
            receiver,
            depositTokenAddress,
            depositAmount,
            mintAmount,
            currentPrice
        );

        checkpointPrices_[receiver] = denormalize(currentPrice);

        return mintAmount;
    }

    function _burnToken(
        uint256 burnAmount,
        uint256 minPriceAllowed)
        internal
        returns (uint256 tradeTokenAmountOwed, uint256 currentPrice)
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
        currentPrice = _tokenPrice(netCollateralAmount, interestDepositRemaining);

        if (minPriceAllowed != 0) {
            require(
                currentPrice >= minPriceAllowed,
                "price too low"
            );
        }

        tradeTokenAmountOwed = burnAmount
            .mul(currentPrice);
        tradeTokenAmountOwed = tradeTokenAmountOwed
            .div(tradeTokenAdjustment);

        uint256 tradeTokenAmountAvailableInContract = ERC20(tradeTokenAddress).balanceOf(address(this));

        uint256 preCloseEscrow = tradeTokenAmountAvailableInContract
            .add(netCollateralAmount);
        preCloseEscrow = preCloseEscrow
            .add(interestDepositRemaining);

        bool didCallWithdraw;
        if (tradeTokenAmountAvailableInContract < tradeTokenAmountOwed) {
            // will revert if the position needs to be liquidated
            IBZx(bZxContract).closeLoanPartiallyFromCollateral(
                loanOrderHash,
                burnAmount < totalSupply() ?
                    tradeTokenAmountOwed.sub(tradeTokenAmountAvailableInContract) :
                    MAX_UINT
            );

            tradeTokenAmountAvailableInContract = ERC20(tradeTokenAddress).balanceOf(address(this));
            didCallWithdraw = true;
        }

        if (tradeTokenAmountAvailableInContract < tradeTokenAmountOwed && burnAmount < totalSupply()) {
            uint256 collateralWithdrawn = IBZx(bZxContract).withdrawCollateral(
                loanOrderHash,
                tradeTokenAmountOwed.sub(tradeTokenAmountAvailableInContract)
            );
            if (collateralWithdrawn != 0) {
                tradeTokenAmountAvailableInContract = tradeTokenAmountAvailableInContract.add(collateralWithdrawn);
                didCallWithdraw = true;
            }
        }

        if (didCallWithdraw) {
            uint256 slippageLoss;
            if (burnAmount < totalSupply()) {
                (netCollateralAmount, interestDepositRemaining,,,) = IBZx(bZxContract).getTotalEscrowWithRate(
                    loanOrderHash,
                    address(this),
                    toCollateralRate,
                    toCollateralPrecision
                );
                uint256 postCloseEscrow = tradeTokenAmountAvailableInContract
                    .add(netCollateralAmount);
                postCloseEscrow = postCloseEscrow
                    .add(interestDepositRemaining);

                if (postCloseEscrow < preCloseEscrow) {
                    /*uint256 slippageLoss = tradeTokenAmountOwed
                        .mul(preCloseEscrow - postCloseEscrow)
                        .div(netCollateralAmount);*/
                    slippageLoss = preCloseEscrow - postCloseEscrow;

                    require(tradeTokenAmountOwed > slippageLoss, "slippage too great");
                    tradeTokenAmountOwed = tradeTokenAmountOwed - slippageLoss;
                }
            }

            if (tradeTokenAmountOwed > tradeTokenAmountAvailableInContract) {
                /*
                // allow at most 5% loss here
                slippageLoss = tradeTokenAmountOwed
                    .sub(tradeTokenAmountAvailableInContract);
                slippageLoss = slippageLoss
                    .mul(10**20);
                slippageLoss = slippageLoss
                    .div(tradeTokenAmountOwed);

                require(
                    slippageLoss <= (5 * 10**18),
                    "contract value too low"
                );
                */
                tradeTokenAmountOwed = tradeTokenAmountAvailableInContract;
            }
        }

        // unless burning the full balance, tradeTokenAmountOwed must be >= 0.001 tradeToken units
        require(burnAmount == balanceOf(msg.sender) || tradeTokenAmountOwed >= (
            10**15 *
            10**uint256(decimals)
            / tradeTokenAdjustment
        ), "burnAmount too low");

        _burn(
            msg.sender,
            burnAmount
        );

        if (totalSupply() == 0 || tokenPrice() == 0) {
            splitFactor = 10**18;
            currentPrice = initialPrice;
        }

        if (balanceOf(msg.sender) != 0) {
            checkpointPrices_[msg.sender] = denormalize(currentPrice);
        } else {
            checkpointPrices_[msg.sender] = 0;
        }
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
                        tradeTokenAddress,  // destTokenAddress
                        address(this),      // receiver
                        ethBalance          // sourceTokenAmount
                    );
                }
            }
        }

        uint256 tradeTokenBalance = ERC20(tradeTokenAddress).balanceOf(address(this));
        uint256 loanTokenBalance = ERC20(loanTokenAddress).balanceOf(address(this));

        if (depositAmount == 0) {
            if (loanTokenBalance != 0) {
                (uint256 destTokenAmountReceived,) = _tradeUserAsset(
                    loanTokenAddress,   // sourceTokenAddress
                    tradeTokenAddress,  // destTokenAddress
                    address(this),      // receiver
                    loanTokenBalance    // sourceTokenAmount
                );
                tradeTokenBalance = tradeTokenBalance
                    .add(destTokenAmountReceived);
            }

            if (tradeTokenBalance != 0) {
                uint256 tempAllowance = ERC20(tradeTokenAddress).allowance(address(this), bZxVault);
                if (tempAllowance < tradeTokenBalance) {
                    if (tempAllowance != 0) {
                        // reset approval to 0
                        require(ERC20(tradeTokenAddress).approve(bZxVault, 0), "token approval reset failed");
                    }

                    require(ERC20(tradeTokenAddress).approve(bZxVault, MAX_UINT), "token approval failed");
                }

                return IBZx(bZxContract).depositCollateral(
                    loanOrderHash,
                    tradeTokenAddress,
                    tradeTokenBalance
                );
            }
        } else {
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

            if (loanTokenBalance != 0 || tradeTokenBalance != 0) {
                ILoanToken(loanTokenLender).marginTradeFromDeposit(
                    depositAmount,          // depositAmount
                    leverageAmount,         // leverageAmount
                    loanTokenBalance,       // loanTokenSent
                    tradeTokenBalance,      // collateralTokenSent
                    0,                      // tradeTokenSent
                    address(this),          // trader
                    depositTokenAddress,    // depositTokenAddress
                    tradeTokenAddress,      // collateralTokenAddress
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
                ERC20(tradeTokenAddress).balanceOf(address(this))
                .add(netCollateralAmount)
                .add(interestDepositRemaining)
                .mul(tradeTokenAdjustment)
                .div(totalSupply_)
            ) : initialPrice;
    }


    /* Owner-Only functions */

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

    // depositTokenAddress is swapped to tradeTokenAddress (collateral token) if needed in the protocol
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
        address[7] memory addresses,
        bool _shortPosition,
        uint256 _leverageAmount,
        bytes32 _loanOrderHash,
        string memory _name,
        string memory _symbol)
        public
        onlyOwner
    {
        require (!isInitialized_, "already initialized");

        bZxContract = addresses[0];
        bZxVault = addresses[1];
        bZxOracle = addresses[2];
        wethContract = addresses[3];
        loanTokenAddress = addresses[4];
        tradeTokenAddress = addresses[5];
        loanTokenLender = addresses[6];

        shortPosition = _shortPosition;

        loanOrderHash = _loanOrderHash;
        leverageAmount = _leverageAmount;

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

        isInitialized_ = true;
    }
}
