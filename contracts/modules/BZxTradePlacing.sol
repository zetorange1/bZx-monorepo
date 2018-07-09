
pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/math/Math.sol";

import "./BZxStorage.sol";
import "./BZxProxyContracts.sol";
import "../shared/InternalFunctions.sol";

import "../BZxVault.sol";
import "../oracle/OracleInterface.sol";

import "../tokens/EIP20.sol";


// solhint-disable-next-line contract-name-camelcase
interface BZxTo0x_Interface {
   function take0xTrade(
        address trader,
        address vaultAddress,
        uint sourceTokenAmountToUse,
        bytes orderData0x, // 0x order arguments, converted to hex, padded to 32 bytes and concatenated (multi-order batching allowed)
        bytes signature0x) // ECDSA of the 0x order (multi-order batching allowed)
        external
        returns (
            address destTokenAddress,
            uint destTokenAmount,
            uint sourceTokenUsedAmount);
}


contract BZxTradePlacing is BZxStorage, Proxiable, InternalFunctions {
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
    
    /// @dev Executes a 0x trade using loaned funds.
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param orderData0x 0x order arguments, converted to hex, padded to 32 bytes and concatenated (multi-order batching allowed)
    /// @param signature0x ECDSA of the 0x order (multi-order batching allowed)
    /// @return The amount of token received in the trade.
    function tradePositionWith0x(
        bytes32 loanOrderHash,
        bytes orderData0x,
        bytes signature0x)
        external
        nonReentrant
        tracksGas
        returns (uint)
    {
        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.maker == address(0)) {
            revert("BZxTradePlacing::tradePositionWith0x: loanOrder.maker == address(0)");
        }

        if (block.timestamp >= loanOrder.expirationUnixTimestampSec) {
            revert("BZxTradePlacing::tradePositionWith0x: block.timestamp >= loanOrder.expirationUnixTimestampSec");
        }

        LoanPosition storage loanPosition = loanPositions[loanOrderHash][msg.sender];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            revert("BZxTradePlacing::tradePositionWith0x: loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active");
        }

        // transfer the current position token to the BZxTo0x contract
        if (!BZxVault(vaultContract).withdrawToken(
            loanPosition.positionTokenAddressFilled,
            bZxTo0xContract,
            loanPosition.positionTokenAmountFilled)) {
            revert("BZxTradePlacing::tradePositionWith0x: BZxVault.withdrawToken failed");
        }

        address tradeTokenAddress;
        uint tradeTokenAmount;
        uint positionTokenUsedAmount;
        (tradeTokenAddress, tradeTokenAmount, positionTokenUsedAmount) = BZxTo0x_Interface(bZxTo0xContract).take0xTrade(
            msg.sender, // trader
            vaultContract,
            loanPosition.positionTokenAmountFilled,
            orderData0x,
            signature0x);

        if (tradeTokenAmount == 0 || positionTokenUsedAmount != loanPosition.positionTokenAmountFilled) {
            revert("BZxTradePlacing::tradePositionWith0x: tradeTokenAmount == 0 || positionTokenUsedAmount != loanPosition.positionTokenAmountFilled");
        }

        if (DEBUG_MODE) {
            _emitMarginLog(loanOrder, loanPosition);
        }

        // trade token has to equal loan token if loan needs to be liquidated
        if (tradeTokenAddress != loanOrder.loanTokenAddress && OracleInterface(loanOrder.oracleAddress).shouldLiquidate(
                loanOrderHash,
                msg.sender,
                loanOrder.loanTokenAddress,
                loanPosition.positionTokenAddressFilled,
                loanPosition.collateralTokenAddressFilled,
                loanPosition.loanTokenAmountFilled,
                loanPosition.positionTokenAmountFilled,
                loanPosition.collateralTokenAmountFilled,
                loanOrder.maintenanceMarginAmount)) {
            revert("BZxTradePlacing::tradePositionWith0x: liquidation required");
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

        if (! OracleInterface(loanOrder.oracleAddress).didTradePosition(
            loanOrderHash,
            msg.sender, // trader
            tradeTokenAddress,
            tradeTokenAmount,
            gasUsed // initial used gas, collected in modifier
        )) {
            revert("BZxTradePlacing::tradePositionWith0x: OracleInterface.didTradePosition failed");
        }

        return tradeTokenAmount;
    }

    /// @dev Executes a market order trade using the oracle contract specified in the loan referenced by loanOrderHash
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param tradeTokenAddress The address of the token to buy in the trade
    /// @return The amount of token received in the trade.
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
            revert("BZxTradePlacing::tradePositionWithOracle: loanOrder.maker == address(0)");
        }

        if (block.timestamp >= loanOrder.expirationUnixTimestampSec) {
            revert("BZxTradePlacing::tradePositionWithOracle: block.timestamp >= loanOrder.expirationUnixTimestampSec");
        }

        LoanPosition storage loanPosition = loanPositions[loanOrderHash][msg.sender];
        if (loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active) {
            revert("BZxTradePlacing::tradePositionWithOracle: loanPosition.loanTokenAmountFilled == 0 || !loanPosition.active");
        }

        if (tradeTokenAddress == loanPosition.positionTokenAddressFilled) {
            revert("BZxTradePlacing::tradePositionWithOracle: tradeTokenAddress == loanPosition.positionTokenAddressFilled");
        }

        if (DEBUG_MODE) {
            _emitMarginLog(loanOrder, loanPosition);
        }

        // trade token has to equal loan token if loan needs to be liquidated
        if (tradeTokenAddress != loanOrder.loanTokenAddress && OracleInterface(loanOrder.oracleAddress).shouldLiquidate(
                loanOrderHash,
                msg.sender,
                loanOrder.loanTokenAddress,
                loanPosition.positionTokenAddressFilled,
                loanPosition.collateralTokenAddressFilled,
                loanPosition.loanTokenAmountFilled,
                loanPosition.positionTokenAmountFilled,
                loanPosition.collateralTokenAmountFilled,
                loanOrder.maintenanceMarginAmount)) {
            revert("BZxTradePlacing::tradePositionWithOracle: liquidation required");
        }

        // check the current token balance of the oracle before sending token to be traded
        uint balanceBeforeTrade = EIP20(loanPosition.positionTokenAddressFilled).balanceOf.gas(4999)(loanOrder.oracleAddress); // Changes to state require at least 5000 gas

        uint tradeTokenAmount = _tradePositionWithOracle(
            loanOrder,
            loanPosition,
            tradeTokenAddress,
            false, // isLiquidation
            true // isManual
        );

        // It is assumed that all positionToken will be traded, so the remaining token balance of the oracle 
        // shouldn't be greater than the balance before we sent the token to be traded.
        if (balanceBeforeTrade < EIP20(loanPosition.positionTokenAddressFilled).balanceOf.gas(4999)(loanOrder.oracleAddress)) {
            revert("BZxTradePlacing::tradePositionWithOracle: balanceBeforeTrade is less");
        }

        if (tradeTokenAmount == 0) {
            revert("BZxTradePlacing::tradePositionWithOracle: tradeTokenAmount == 0");
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

        if (! OracleInterface(loanOrder.oracleAddress).didTradePosition(
            loanOrderHash,
            msg.sender, // trader
            tradeTokenAddress,
            tradeTokenAmount,
            gasUsed // initial used gas, collected in modifier
        )) {
            revert("BZxTradePlacing::tradePositionWithOracle: OracleInterface.didTradePosition");
        }

        return tradeTokenAmount;
    }
}
