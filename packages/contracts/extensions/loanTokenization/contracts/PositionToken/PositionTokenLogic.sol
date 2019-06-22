/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
 
pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./SplittableToken.sol";


interface IBZx {
    function closeLoanPartiallyIfHealthy(
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

    function getTotalEscrow(
        bytes32 loanOrderHash,
        address trader,
        bool actualized)
        external
        view
        returns (
            uint256 netCollateralAmount,
            uint256 interestDepositRemaining,
            uint256 loanTokenAmountBorrowed);

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
}

contract PositionTokenLogic is SplittableToken {
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
        require (msg.value > 0, "msg.value == 0");

        uint256 netCollateralAmount;
        uint256 interestDepositRemaining;
        if (totalSupply() > 0) {
            (netCollateralAmount, interestDepositRemaining,) = IBZx(bZxContract).getTotalEscrow(
                loanOrderHash,
                address(this),
                false // actualized
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
            currentPrice
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
        require (depositAmount > 0, "depositAmount == 0");

        uint256 netCollateralAmount;
        uint256 interestDepositRemaining;
        if (totalSupply() > 0) {
            (netCollateralAmount, interestDepositRemaining,) = IBZx(bZxContract).getTotalEscrow(
                loanOrderHash,
                address(this),
                false // actualized
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
            currentPrice
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
        if (loanAmountOwed > 0) {
            if (wethContract != loanTokenAddress) {
                address oracle = IBZx(bZxContract).oracleAddresses(bZxOracle);
                uint256 tempAllowance = ERC20(loanTokenAddress).allowance(address(this), oracle);
                if (tempAllowance < loanAmountOwed) {
                    if (tempAllowance > 0) {
                        // reset approval to 0
                        require(ERC20(loanTokenAddress).approve(oracle, 0), "token approval reset failed");
                    }

                    require(ERC20(loanTokenAddress).approve(oracle, MAX_UINT), "token approval failed");
                }

                (uint256 destTokenAmountReceived,) = IBZxOracle(oracle).tradeUserAsset(
                    loanTokenAddress,
                    address(0), // Ether
                    receiver, // receiverAddress
                    receiver, // returnToSenderAddress
                    loanAmountOwed,
                    MAX_UINT,
                    0 // minConversionRate
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
        if (loanAmountOwed > 0) {
            if (burnTokenAddress != loanTokenAddress) {
                address oracle = IBZx(bZxContract).oracleAddresses(bZxOracle);
                uint256 tempAllowance = ERC20(loanTokenAddress).allowance(address(this), oracle);
                if (tempAllowance < loanAmountOwed) {
                    if (tempAllowance > 0) {
                        // reset approval to 0
                        require(ERC20(loanTokenAddress).approve(oracle, 0), "token approval reset failed");
                    }

                    require(ERC20(loanTokenAddress).approve(oracle, MAX_UINT), "token approval failed");
                }

                (uint256 destTokenAmountReceived,) = IBZxOracle(oracle).tradeUserAsset(
                    loanTokenAddress,
                    burnTokenAddress,
                    receiver, // receiverAddress
                    receiver, // returnToSenderAddress
                    loanAmountOwed,
                    MAX_UINT,
                    0 // minConversionRate
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
        if (address(this).balance > 0) {
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
        uint256 netCollateralAmount;
        uint256 interestDepositRemaining;
        if (totalSupply() > 0) {
            (netCollateralAmount, interestDepositRemaining,) = IBZx(bZxContract).getTotalEscrow(
                loanOrderHash,
                address(this),
                false // actualized
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
            address oracle = IBZx(bZxContract).oracleAddresses(bZxOracle);
            uint256 tempAllowance = ERC20(depositTokenAddress).allowance(address(this), oracle);
            if (tempAllowance < depositAmount) {
                if (tempAllowance > 0) {
                    // reset approval to 0
                    require(ERC20(depositTokenAddress).approve(oracle, 0), "token approval reset failed");
                }

                require(ERC20(depositTokenAddress).approve(oracle, MAX_UINT), "token approval failed");
            }

            (uint256 destTokenAmountReceived, uint256 depositAmountUsed) = IBZxOracle(oracle).tradeUserAsset(
                depositTokenAddress,
                loanTokenAddress,
                address(this), // receiverAddress
                address(this), // returnToSenderAddress
                depositAmount,
                MAX_UINT,
                0 // minConversionRate
            );

            require(destTokenAmountReceived <= liquidityAmount, "market liquidity insufficient");

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

        // depositAmount must be >= 0.001 loanToken units
        require(depositAmount >= (10**15 * 10**uint256(decimals) / 10**18), "depositAmount too low");

        require(_triggerPosition(depositAmount), "triggerPosition failed");

        // get post-entry supply
        (uint256 netCollateralAmount, uint256 interestDepositRemaining,) = IBZx(bZxContract).getTotalEscrow(
            loanOrderHash,
            address(this),
            false // actualized
        );
        uint256 postEntrySupply = ERC20(loanTokenAddress).balanceOf(address(this))
            .add(netCollateralAmount)
            .add(interestDepositRemaining)
            .mul(10**18)
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
        require(burnAmount > 0, "burnAmount == 0");

        if (burnAmount > balanceOf(msg.sender)) {
            burnAmount = balanceOf(msg.sender);
        }

        (uint256 netCollateralAmount, uint256 interestDepositRemaining,) = IBZx(bZxContract).getTotalEscrow(
            loanOrderHash,
            address(this),
            false // actualized
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
            .div(10**18);

        uint256 loanAmountAvailableInContract = ERC20(loanTokenAddress).balanceOf(address(this));

        uint256 preCloseEscrow = loanAmountAvailableInContract
            .add(netCollateralAmount)
            .add(interestDepositRemaining);

        if (loanAmountAvailableInContract < loanAmountOwed) {
            loanAmountAvailableInContract = loanAmountAvailableInContract.add(
                IBZx(bZxContract).withdrawCollateral(
                    loanOrderHash,
                    loanAmountOwed.sub(loanAmountAvailableInContract)
                )
            );
        }

        if (loanAmountAvailableInContract < loanAmountOwed) {
            uint256 closeAmount;
            if (burnAmount < totalSupply()) {
                uint256 loanTokenAmountBorrowed;
                (netCollateralAmount, interestDepositRemaining, loanTokenAmountBorrowed) = IBZx(bZxContract).getTotalEscrow(
                    loanOrderHash,
                    address(this),
                    true // actualized
                );

                closeAmount = loanAmountOwed
                    .sub(loanAmountAvailableInContract)
                    .mul(loanTokenAmountBorrowed)
                    .div(netCollateralAmount
                        .add(interestDepositRemaining));
            } else {
                // close entire loan
                closeAmount = MAX_UINT;
            }

            // will revert if the position needs to be liquidated
            IBZx(bZxContract).closeLoanPartiallyIfHealthy(
                loanOrderHash,
                closeAmount
            );

            loanAmountAvailableInContract = ERC20(loanTokenAddress).balanceOf(address(this));

            if (loanAmountOwed > loanAmountAvailableInContract) {
                // allow at most 1% loss during this step
                require(
                    loanAmountOwed
                    .sub(loanAmountAvailableInContract)
                    .mul(10**20)
                    .div(loanAmountOwed) <= 10**18,
                    "slippage too great"
                );
                loanAmountOwed = loanAmountAvailableInContract;
            }
        }

        (netCollateralAmount, interestDepositRemaining,) = IBZx(bZxContract).getTotalEscrow(
            loanOrderHash,
            address(this),
            false // actualized
        );
        uint256 postCloseEscrow = loanAmountAvailableInContract
            .add(netCollateralAmount)
            .add(interestDepositRemaining);
        require(postCloseEscrow <= preCloseEscrow, "escrow added");

        uint256 slippageLoss = preCloseEscrow - postCloseEscrow;

        require(loanAmountOwed > slippageLoss, "slippage too great");
        loanAmountOwed = loanAmountOwed - slippageLoss;

        // unless burning the full balance, loanAmountOwed must be >= 0.001 loanToken units
        require(burnAmount == balanceOf(msg.sender) || loanAmountOwed >= (10**15 * 10**uint256(decimals) / 10**18), "burnAmount too low");

        _burn(msg.sender, burnAmount, loanAmountOwed, currentPrice);

        if (totalSupply() == 0 || tokenPrice() == 0) {
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

    function _triggerPosition(
        uint256 amount)
        internal
        returns (bool)
    {
        uint256 assetBalance = ERC20(loanTokenAddress).balanceOf(address(this));
        if (assetBalance > 0) {
            uint256 tempAllowance = ERC20(loanTokenAddress).allowance(address(this), bZxVault);
            if (tempAllowance < assetBalance) {
                if (tempAllowance > 0) {
                    // reset approval to 0
                    require(ERC20(loanTokenAddress).approve(bZxVault, 0), "token approval reset failed");
                }

                require(ERC20(loanTokenAddress).approve(bZxVault, MAX_UINT), "token approval failed");
            }

            (bool result,) = loanTokenLender.call.gas(gasleft())(
                abi.encodeWithSignature(
                    "borrowTokenFromEscrow(uint256,uint256,address,bool)",
                    amount == 0 || amount > assetBalance ? assetBalance : amount,
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

    function setSplitValue(
        uint256 _value)
        public
        onlyOwner
    {
        require(_value > 0, "value can't be 0");
        splitFactor = _value;
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
            if (tempAllowance > 0) {
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
            if (tempAllowance > 0) {
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

    // depositTokenAddress is swapped to tradeTokenAddress if needed in the protocol
    // this is callable by anyone that wants to top up the position
    function depositPositionToLoan(
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
            if (tempAllowance > 0) {
                // reset approval to 0
                require(ERC20(depositTokenAddress).approve(bZxVault, 0), "token approval reset failed");
            }

            require(ERC20(depositTokenAddress).approve(bZxVault, MAX_UINT), "token approval failed");
        }

        require(IBZx(bZxContract).depositPosition(
            loanOrderHash,
            depositTokenAddress,
            depositAmount
        ), "deposit failed");
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
        require (!isInitialized_, "already initialized");

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
        decimals = EIP20(loanTokenAddress).decimals();

        initialPrice = 10**21; // starting price of 1,000

        // set the BZxVault spend approval
        require(ERC20(_loanTokenAddress).approve(_bZxVault, MAX_UINT), "approval of loan token failed");

        isInitialized_ = true;
    }
}
