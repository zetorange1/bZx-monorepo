/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
 
/* solhint-disable func-order, separate-by-one-line-in-contract */

pragma solidity 0.4.24;
pragma experimental ABIEncoderV2;

import "./modules/BZxStorage.sol";
import "./ZeroEx/ExchangeV2Interface.sol";

// This interface is meant to used with the deployed BZxProxy contract (modules/BZxProxyContracts.sol) address.
// js example: var bZx = await BZx.at((await BZxProxy.deployed()).address);

contract BZx is BZxStorage {

    /*
    * BZxOrderTaking functions
    */

    function takeLoanOrderAsTrader(
        address[6] orderAddresses,
        uint[10] orderValues,
        address collateralTokenFilled,
        uint loanTokenAmountFilled,
        bytes signature)
        external
        returns (uint);

    function takeLoanOrderAsLender(
        address[6] orderAddresses,
        uint[10] orderValues,
        bytes signature)
        external
        returns (uint);

    function pushLoanOrderOnChain(
        address[6] orderAddresses,
        uint[10] orderValues,
        bytes signature)
        external
        returns (bytes32);

    function takeLoanOrderOnChainAsTrader(
        bytes32 loanOrderHash,
        address collateralTokenFilled,
        uint loanTokenAmountFilled)
        external
        returns (uint);

    function takeLoanOrderOnChainAsLender(
        bytes32 loanOrderHash)
        external
        returns (uint);

    function cancelLoanOrder(
        address[6] orderAddresses,
        uint[10] orderValues,
        uint cancelLoanTokenAmount)
        external
        returns (uint);

    function cancelLoanOrder(
        bytes32 loanOrderHash,
        uint cancelLoanTokenAmount)
        external
        returns (uint);

    function getLoanOrderHash(
        address[6] orderAddresses,
        uint[10] orderValues)
        public
        view
        returns (bytes32);

    function isValidSignature(
        address signer,
        bytes32 hash,
        bytes signature)
        public
        pure
        returns (bool);

    function getInitialCollateralRequired(
        address loanTokenAddress,
        address collateralTokenAddress,
        address oracleAddress,
        uint loanTokenAmountFilled,
        uint initialMarginAmount)
        public
        view
        returns (uint collateralTokenAmount);

    function getSingleOrder(
        bytes32 loanOrderHash)
        public
        view
        returns (bytes);

    function getOrdersFillable(
        uint start,
        uint count)
        public
        view
        returns (bytes);

    function getOrdersForUser(
        address loanParty,
        uint start,
        uint count)
        public
        view
        returns (bytes);

    function getSingleLoan(
        bytes32 loanOrderHash,
        address trader)
        public
        view
        returns (bytes);

    function getLoansForLender(
        address loanParty,
        uint count,
        bool activeOnly)
        public
        view
        returns (bytes);

    function getLoansForTrader(
        address loanParty,
        uint count,
        bool activeOnly)
        public
        view
        returns (bytes);

    function getActiveLoans(
        uint start,
        uint count)
        public
        view
        returns (bytes);

    /*
    * BZxTradePlacing functions
    */

    function tradePositionWith0x(
        bytes32 loanOrderHash,
        bytes orderData0x, // 0x order arguments, converted to hex, padded to 32 bytes and concatenated
        bytes signature0x) // ECDSA of the 0x order
        external
        returns (uint);

    function tradePositionWith0xV2(
        bytes32 loanOrderHash,
        ExchangeV2Interface.OrderV2[] memory orders0x,
        bytes[] memory signatures0x)
        public
        returns (uint);

    function tradePositionWithOracle(
        bytes32 loanOrderHash,
        address tradeTokenAddress)
        external
        returns (uint);

    /*
    * BZxLoanMaintenance functions
    */

    function depositCollateral(
        bytes32 loanOrderHash,
        address collateralTokenFilled,
        uint depositAmount)
        external
        returns (bool);

    function withdrawExcessCollateral(
        bytes32 loanOrderHash,
        address collateralTokenFilled,
        uint withdrawAmount)
        external
        returns (uint excessCollateral);

    function changeCollateral(
        bytes32 loanOrderHash,
        address collateralTokenFilled)
        external
        returns (bool);

    function withdrawProfit(
        bytes32 loanOrderHash)
        external
        returns (uint profitAmount);

    function changeTraderOwnership(
        bytes32 loanOrderHash,
        address newOwner)
        external
        returns (bool);

    function changeLenderOwnership(
        bytes32 loanOrderHash,
        address newOwner)
        external
        returns (bool);

    function getProfitOrLoss(
        bytes32 loanOrderHash,
        address trader)
        public
        view
        returns (bool isProfit, uint profitOrLoss, address positionTokenAddress);

    /*
    * BZxLoanHealth functions
    */

    function payInterest(
        bytes32 loanOrderHash,
        address trader)
        external
        returns (uint);

    function liquidatePosition(
        bytes32 loanOrderHash,
        address trader)
        external
        returns (bool);

    function closeLoan(
        bytes32 loanOrderHash)
        external
        returns (bool);

    function forceCloanLoan(
        bytes32 loanOrderHash,
        address trader)
        public
        returns (bool);

    function shouldLiquidate(
        bytes32 loanOrderHash,
        address trader)
        public
        view
        returns (bool);

    function getMarginLevels(
        bytes32 loanOrderHash,
        address trader)
        public
        view
        returns (uint, uint, uint);

    function getInterest(
        bytes32 loanOrderHash,
        address trader)
        public
        view
        returns (address lender, address interestTokenAddress, uint interestTotalAccrued, uint interestPaidSoFar);
}
