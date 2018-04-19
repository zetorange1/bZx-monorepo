
pragma solidity ^0.4.22;

import 'zeppelin-solidity/contracts/math/Math.sol';

import './B0xStorage.sol';
import './B0xProxyContracts.sol';
import '../shared/InternalFunctions.sol';

import '../B0xVault.sol';
import '../interfaces/Oracle_Interface.sol';
import '../interfaces/B0xTo0x_Interface.sol';

contract B0xTradePlacing is B0xStorage, Proxiable, InternalFunctions {
    using SafeMath for uint256;

    constructor() public {}
    
    function initialize(
        address _target)
        public
        onlyOwner
    {
        targets[bytes4(keccak256("tradePositionWith0x(bytes32,bytes,bytes)"))] = _target;
        targets[bytes4(keccak256("tradePositionWithOracle(bytes32,address)"))] = _target;
    }
    
    function tradePositionWith0x(
        bytes32 loanOrderHash,
        bytes orderData0x, // 0x order arguments, converted to hex, padded to 32 bytes and concatenated
        bytes signiture0x) // ECDSA of the 0x order
        external
        nonReentrant
        tracksGas
        returns (uint)
    {
        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.maker == address(0)) {
            return intOrRevert(0,39);
        }

        if (block.timestamp >= loanOrder.expirationUnixTimestampSec) {
            return intOrRevert(0,43);
        }

        LoanPosition storage loanPosition = loanPositions[loanOrderHash][msg.sender];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            return intOrRevert(0,48);
        }

        // transfer the current position token to the B0xTo0x contract
        if (!B0xVault(VAULT_CONTRACT).transferToken(
            loanPosition.positionTokenAddressFilled,
            B0XTO0X_CONTRACT,
            loanPosition.positionTokenAmountFilled)) {
            return intOrRevert(0,56);
        }

        address tradeTokenAddress;
        uint tradeTokenAmount;
        uint positionTokenUsedAmount;
        (tradeTokenAddress, tradeTokenAmount, positionTokenUsedAmount) = B0xTo0x_Interface(B0XTO0X_CONTRACT).take0xTrade(
            msg.sender, // trader
            VAULT_CONTRACT,
            loanPosition.positionTokenAmountFilled,
            orderData0x,
            signiture0x);


        if (tradeTokenAmount == 0 || positionTokenUsedAmount != loanPosition.positionTokenAmountFilled) {
            return intOrRevert(0,71);
        }

        if (DEBUG_MODE) {
            _emitMarginLog(loanOrder, loanPosition);
        }

        // trade token has to equal loan token if loan needs to be liquidated
        if (tradeTokenAddress != loanOrder.loanTokenAddress && Oracle_Interface(loanOrder.oracleAddress).shouldLiquidate(
                loanOrderHash,
                msg.sender,
                loanOrder.loanTokenAddress,
                loanPosition.positionTokenAddressFilled,
                loanPosition.collateralTokenAddressFilled,
                loanPosition.loanTokenAmountFilled,
                loanPosition.positionTokenAmountFilled,
                loanPosition.collateralTokenAmountFilled,
                loanOrder.maintenanceMarginAmount)) {
            return intOrRevert(0,89);
        }

        emit LogPositionTraded(
            loanOrderHash,
            msg.sender,
            loanPosition.positionTokenAddressFilled,
            tradeTokenAddress,
            positionTokenUsedAmount,
            tradeTokenAmount
        );

        // the trade token becomes the new position token
        loanPosition.positionTokenAddressFilled = tradeTokenAddress;
        loanPosition.positionTokenAmountFilled = tradeTokenAmount;

        if (! Oracle_Interface(loanOrder.oracleAddress).didTradePosition(
            loanOrderHash,
            msg.sender, // trader
            tradeTokenAddress,
            tradeTokenAmount,
            gasUsed // initial used gas, collected in modifier
        )) {
            return intOrRevert(0,112);
        }

        return tradeTokenAmount;
    }

    function tradePositionWithOracle(
        bytes32 loanOrderHash,
        address tradeTokenAddress)
        external
        nonReentrant
        tracksGas
        returns (uint)
    {
        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.maker == address(0)) {
            return intOrRevert(0,128);
        }

        if (block.timestamp >= loanOrder.expirationUnixTimestampSec) {
            return intOrRevert(0,132);
        }

        LoanPosition storage loanPosition = loanPositions[loanOrderHash][msg.sender];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            return intOrRevert(0,137);
        }

        if (tradeTokenAddress == loanPosition.positionTokenAddressFilled) {
            return intOrRevert(0,141);
        }

        if (DEBUG_MODE) {
            _emitMarginLog(loanOrder, loanPosition);
        }

        // trade token has to equal loan token if loan needs to be liquidated
        if (tradeTokenAddress != loanOrder.loanTokenAddress && Oracle_Interface(loanOrder.oracleAddress).shouldLiquidate(
                loanOrderHash,
                msg.sender,
                loanOrder.loanTokenAddress,
                loanPosition.positionTokenAddressFilled,
                loanPosition.collateralTokenAddressFilled,
                loanPosition.loanTokenAmountFilled,
                loanPosition.positionTokenAmountFilled,
                loanPosition.collateralTokenAmountFilled,
                loanOrder.maintenanceMarginAmount)) {
            return intOrRevert(0,159);
        }

        uint tradeTokenAmount = _tradePositionWithOracle(
            loanOrder,
            loanPosition,
            tradeTokenAddress,
            false // isLiquidation
        );

        if (tradeTokenAmount == 0) {
            return intOrRevert(0,170);
        }

        emit LogPositionTraded(
            loanOrderHash,
            msg.sender,
            loanPosition.positionTokenAddressFilled,
            tradeTokenAddress,
            loanPosition.positionTokenAmountFilled,
            tradeTokenAmount
        );

        // the trade token becomes the new position token
        loanPosition.positionTokenAddressFilled = tradeTokenAddress;
        loanPosition.positionTokenAmountFilled = tradeTokenAmount;

        if (! Oracle_Interface(loanOrder.oracleAddress).didTradePosition(
            loanOrderHash,
            msg.sender, // trader
            tradeTokenAddress,
            tradeTokenAmount,
            gasUsed // initial used gas, collected in modifier
        )) {
            return intOrRevert(0,193);
        }

        return tradeTokenAmount;
    }
}

