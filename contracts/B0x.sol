
pragma solidity ^0.4.21;

import './modules/B0xStorage.sol';

// This interface is meant to used with the deployed B0xProxy contract (modules/B0xProxyContracts.sol) address.
// js example: var b0x = await B0x.at((await B0xProxy.deployed()).address);

contract B0x is B0xStorage {
   
    /*
    * B0xOrderTaking functions
    */

    function takeLoanOrderAsTrader(
        address[6] orderAddresses,
        uint[9] orderValues,
        address collateralTokenFilled,
        uint loanTokenAmountFilled,
        bytes signature)
        external
        returns (uint);
    
    function takeLoanOrderAsLender(
        address[6] orderAddresses,
        uint[9] orderValues,
        bytes signature)
        external
        returns (uint);

    function cancelLoanOrder(
        address[6] orderAddresses,
        uint[9] orderValues,
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
        uint[9] orderValues)
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
        address positionTokenAddress,
        address collateralTokenAddress,
        address oracleAddress,
        uint positionTokenAmount,
        uint initialMarginAmount)
        public
        view
        returns (uint collateralTokenAmount);

    function getUnavailableLoanTokenAmount(bytes32 loanOrderHash)
        public
        view
        returns (uint);

    function getOrders(
        address loanParty,
        uint start,
        uint count)
        public
        view
        returns (bytes);

    function getLoanPositions(
        address loanParty,
        uint start,
        uint count)
        public
        view
        returns (bytes);

    function getLoanOrderParts (
        bytes32 loanOrderHash)
        public
        view
        returns (address[6],uint[7]);

    function getLoanPositionParts (
        bytes32 loanOrderHash,
        address trader)
        public
        view
        returns (address[4], uint[5]);


    /*
    * B0xTradePlacer functions
    */

    function tradePositionWith0x(
        bytes32 loanOrderHash,
        bytes orderData0x, // 0x order arguments, converted to hex, padded to 32 bytes and concatenated
        bytes signiture0x) // ECDSA of the 0x order
        external
        returns (uint);

    function tradePositionWithOracle(
        bytes32 loanOrderHash,
        address tradeTokenAddress)
        external
        returns (uint);

    /*
    * B0xLoanHealth functions
    */

    function payInterest(
        bytes32 loanOrderHash,
        address trader)
        external
        returns (uint);

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

    function liquidatePosition(
        bytes32 loanOrderHash,
        address trader)
        external
        returns (bool);

    function closeLoan(
        bytes32 loanOrderHash)
        external
        returns (bool);

    function getProfitOrLoss(
        bytes32 loanOrderHash,
        address trader)
        public
        view
        returns (bool isProfit, uint profitOrLoss, uint positionToLoanAmount, uint positionToLoanRate);

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
        returns (address lender, address interestTokenAddress, uint totalAmountAccrued, uint interestPaidSoFar);
}
