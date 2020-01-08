/**
 * Copyright 2017-2020, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;


interface iiToken {
    function tokenPrice()
        external
        view
        returns (uint256 price);

    function avgBorrowInterestRate()
        external
        view
        returns (uint256);

    function borrowInterestRate()
        external
        view
        returns (uint256);

    function supplyInterestRate()
        external
        view
        returns (uint256);

    function marketLiquidity()
        external
        view
        returns (uint256);
}

contract TokenData {

    struct TokenDataItems {
        uint256 tokenPrice;
        uint256 avgBorrowInterestRate;
        uint256 borrowInterestRate;
        uint256 supplyInterestRate;
        uint256 marketLiquidity;
    }

    function getiTokenData(
        address iTokenAddress)
        public
        view
        returns (TokenDataItems memory tokenData)
    {
        iiToken token = iiToken(iTokenAddress);

        tokenData.tokenPrice = token.tokenPrice();
        tokenData.avgBorrowInterestRate = token.avgBorrowInterestRate();
        tokenData.borrowInterestRate = token.borrowInterestRate();
        tokenData.supplyInterestRate = token.supplyInterestRate();
        tokenData.marketLiquidity = token.marketLiquidity();
    }
}
