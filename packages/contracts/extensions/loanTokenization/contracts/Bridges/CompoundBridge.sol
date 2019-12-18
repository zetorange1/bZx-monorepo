/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.8;

import "./BZxBridge.sol";


interface CToken {
    function borrowBalanceCurrent(address account) external returns (uint);
    function symbol() external view returns (string memory);
    function exchangeRateStored() external view returns (uint);

    function redeem(uint redeemAmount) external returns (uint);
    function transferFrom(address src, address dst, uint amount) external returns (bool);
}

interface CErc20 {
    function underlying() external view returns (address);

    function repayBorrowBehalf(address borrower, uint repayAmount) external returns (uint);
}

interface CEther {
    function repayBorrowBehalf(address borrower) external payable;
}

contract CarefulMath {

    /**
     * @dev Possible error codes that we can return
     */
    enum MathError {
        NO_ERROR,
        DIVISION_BY_ZERO,
        INTEGER_OVERFLOW,
        INTEGER_UNDERFLOW
    }

    /**
    * @dev Multiplies two numbers, returns an error on overflow.
    */
    function mulUInt(uint a, uint b) internal pure returns (MathError, uint) {
        if (a == 0) {
            return (MathError.NO_ERROR, 0);
        }

        uint c = a * b;

        if (c / a != b) {
            return (MathError.INTEGER_OVERFLOW, 0);
        } else {
            return (MathError.NO_ERROR, c);
        }
    }

    /**
    * @dev Integer division of two numbers, truncating the quotient.
    */
    function divUInt(uint a, uint b) internal pure returns (MathError, uint) {
        if (b == 0) {
            return (MathError.DIVISION_BY_ZERO, 0);
        }

        return (MathError.NO_ERROR, a / b);
    }
}

contract Exponential is CarefulMath {
    uint constant expScale = 1e18;

    struct Exp {
        uint mantissa;
    }

    /**
     * @dev Creates an exponential from numerator and denominator values.
     *      Note: Returns an error if (`num` * 10e18) > MAX_INT,
     *            or if `denom` is zero.
     */
    function getExp(uint num, uint denom) pure internal returns (MathError, Exp memory) {
        (MathError err0, uint scaledNumerator) = mulUInt(num, expScale);
        if (err0 != MathError.NO_ERROR) {
            return (err0, Exp({mantissa: 0}));
        }

        (MathError err1, uint rational) = divUInt(scaledNumerator, denom);
        if (err1 != MathError.NO_ERROR) {
            return (err1, Exp({mantissa: 0}));
        }

        return (MathError.NO_ERROR, Exp({mantissa: rational}));
    }

    /**
     * @dev Divide a scalar by an Exp, returning a new Exp.
     */
    function divScalarByExp(uint scalar, Exp memory divisor) pure internal returns (MathError, Exp memory) {
        /*
          We are doing this as:
          getExp(mulUInt(expScale, scalar), divisor.mantissa)

          How it works:
          Exp = a / b;
          Scalar = s;
          `s / (a / b)` = `b * s / a` and since for an Exp `a = mantissa, b = expScale`
        */
        (MathError err0, uint numerator) = mulUInt(expScale, scalar);
        if (err0 != MathError.NO_ERROR) {
            return (err0, Exp({mantissa: 0}));
        }
        return getExp(numerator, divisor.mantissa);
    }

    /**
     * @dev Divide a scalar by an Exp, then truncate to return an unsigned integer.
     */
    function divScalarByExpTruncate(uint scalar, Exp memory divisor) pure internal returns (MathError, uint) {
        (MathError err, Exp memory fraction) = divScalarByExp(scalar, divisor);
        if (err != MathError.NO_ERROR) {
            return (err, 0);
        }

        return (MathError.NO_ERROR, truncate(fraction));
    }

    /**
     * @dev Truncates the given exp to a whole number value.
     *      For example, truncate(Exp{mantissa: 15 * expScale}) = 15
     */
    function truncate(Exp memory exp) pure internal returns (uint) {
        // Note: We are not using careful math here as we're performing a division that cannot fail
        return exp.mantissa / expScale;
    }
}

interface Comptroller {
    function redeemAllowed(address cToken, address redeemer, uint redeemTokens) external returns (uint);
}

contract CompoundBridge is BZxBridge, Exponential // TODO clean Exponential
{
    enum Error {
        NO_ERROR
    }

    address public cEther;
    mapping(address => address) public iTokens; // cToken => iToken
    mapping(address => address) public tokens; // cToken => underlying

    event NewToken(address cToken, address iToken);

    constructor(address[] memory cTokens, address[] memory _iTokens, address _cEther) public {
        setCEther(_cEther);
        setTokens(cTokens, _iTokens);
    }

    function migrateLoan(
        address loanToken, // cToken address
        uint loanAmount, // the amount of underlying tokens being migrated
        address[] memory assets, // collateral cToken addresses
        uint[] memory amounts, // collateral amounts, should be approved to transfer
        uint[] memory collateralAmounts, // will be used for borrow on bZx
        uint[] memory borrowAmounts // the amounts of underlying tokens for each new Torque loan
    )
        public
    {
        require(loanAmount > 0, "Invalid loan amount");
        require(assets.length > 0, "Invalid assets");
        require(assets.length == amounts.length, "Invalid amounts");
        require(amounts.length == collateralAmounts.length, "Invalid collateral amounts");
        require(collateralAmounts.length == borrowAmounts.length, "Invalid borrow amounts length");

        uint totalBorrowAmount;
        for (uint i = 0; i < borrowAmounts.length; i++) {
            totalBorrowAmount += borrowAmounts[i];
        }
        require(totalBorrowAmount == loanAmount, "Invalid borrow amounts value");

        CToken loanCToken = CToken(loanToken);
        require(loanCToken.borrowBalanceCurrent(msg.sender) >= loanAmount, "Invalid borrow balance");

        LoanTokenInterface iToken = LoanTokenInterface(iTokens[loanToken]);

        iToken.flashBorrowToken(
            loanAmount,
            address(this),
            address(this),
            "",
            abi.encodeWithSignature(
                "_migrateLoan(address,address,uint256,address[],uint256[],uint256[],uint256[])",
                msg.sender, loanToken, loanAmount, assets, amounts, collateralAmounts, borrowAmounts
            )
        );
    }

    function() external payable {}

    function _migrateLoan(
        address borrower,
        address loanToken,
        uint loanAmount,
        address[] memory assets,
        uint[] memory amounts,
        uint[] memory collateralAmounts,
        uint[] memory borrowAmounts
    )
        public
    {
        LoanTokenInterface iToken = LoanTokenInterface(iTokens[loanToken]);
        address loanTokenAddress = iToken.loanTokenAddress();
        uint err;

        if (loanToken == cEther) {
            CEther(loanToken).repayBorrowBehalf.value(loanAmount)(borrower);
        } else {
            ERC20(loanTokenAddress).approve(loanToken, loanAmount);
            err = CErc20(loanToken).repayBorrowBehalf(borrower, loanAmount);
            require(err == uint(Error.NO_ERROR), "Repay borrow behalf failed");
        }

        address _borrower = borrower;
        for (uint i = 0; i < assets.length; i++) {
            CToken cToken = CToken(assets[i]);
            uint amount = amounts[i];
            uint collateralAmount = collateralAmounts[i];

            uint cTokenAmount;
            MathError mathErr;
            (mathErr, cTokenAmount) = divScalarByExpTruncate(amount, Exp({mantissa: cToken.exchangeRateStored()}));
            requireThat(mathErr == MathError.NO_ERROR, "cToken exchangeRate calc error", i);

            requireThat(cToken.transferFrom(_borrower, address(this), cTokenAmount), "cToken transfer to the bridge failed", i);

            err = cToken.redeem(cTokenAmount);
            requireThat(err == uint(Error.NO_ERROR), "Redeem failed", i);

            LoanTokenInterface iCollateral = LoanTokenInterface(iTokens[address(cToken)]);

            uint excess = amount - collateralAmount;

            if (address(cToken) == cEther) {
                iToken.borrowTokenFromDeposit.value(collateralAmount)(
                    borrowAmounts[i],
                    leverageAmount,
                    initialLoanDuration,
                    0,
                    _borrower,
                    address(this),
                    address(0),
                    loanData
                );
                if (excess > 0) {
                    iCollateral.mintWithEther.value(excess)(_borrower);
                }
            } else {
                address underlying = tokens[address(cToken)];
                ERC20(underlying).approve(address(iToken), collateralAmount);
                iToken.borrowTokenFromDeposit(
                    borrowAmounts[i],
                    leverageAmount,
                    initialLoanDuration,
                    collateralAmount,
                    _borrower,
                    address(this),
                    underlying,
                    loanData
                );
                if (excess > 0) {
                    ERC20(underlying).approve(address(iCollateral), excess);
                    iCollateral.mint(_borrower, excess);
                }
            }
        }

        // repaying flash borrow
        ERC20(loanTokenAddress).transfer(address(iToken), loanAmount);
    }

    function setCEther(address _cEther) public onlyOwner
    {
        // require(isEqual(CToken(cEther).symbol(), "cETH"), "invalid cEther address");
        cEther = _cEther;
    }

    function setTokens(address[] memory cTokens, address[] memory _iTokens) public onlyOwner
    {
        require(cTokens.length == _iTokens.length, "Invalid tokens");

        for (uint i = 0; i < cTokens.length; i++) {
            address cToken = cTokens[i];
            LoanTokenInterface iToken = LoanTokenInterface(_iTokens[i]);
            if (cToken != cEther) {
                tokens[cToken] = CErc20(cToken).underlying();
                requireThat(
                    tokens[cToken] == iToken.loanTokenAddress(),
                    "Incompatible tokens",
                    i
                );
            } else {
                // require(isEqual(iToken.symbol(), "iETH"), "Incompatible ETH tokens");
            }
            iTokens[cToken] = _iTokens[i];
            emit NewToken(cTokens[i], _iTokens[i]);
        }
    }

//    function isEqual(string memory a, string memory b) private pure returns (bool)
//    {
//        return (keccak256(abi.encodePacked(a)) == keccak256(abi.encodePacked(b)));
//    }
}
