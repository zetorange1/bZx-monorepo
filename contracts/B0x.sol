/*

  Copyright 2017 Tom Bean
  Parts copyright 2017 ZeroEx Intl.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.

*/

pragma solidity ^0.4.9;
import 'oz_contracts/token/StandardToken.sol';
import 'oz_contracts/math/SafeMath.sol';
import 'oz_contracts/ownership/Ownable.sol';
import 'oz_contracts/ReentrancyGuard.sol';

//import '../tinyoracle/api.sol';
import './B0xVault.sol';
import './B0xPrices.sol';

contract Exchange0x {
    function fillOrder(
          address[5] orderAddresses,
          uint[6] orderValues,
          uint fillTakerTokenAmount,
          bool shouldThrowOnInsufficientBalanceOrAllowance,
          uint8 v,
          bytes32 r,
          bytes32 s)
          public
          returns (uint filledTakerTokenAmount);
}

contract B0x is Ownable, ReentrancyGuard { //, usingTinyOracle {
    using SafeMath for uint256;

    // Error Codes
    /*enum Errors {
        ORDER_EXPIRED,                    // Order has already expired
        ORDER_FULLY_FILLED_OR_CANCELLED,  // Order has already been fully filled or cancelled
        ROUNDING_ERROR_TOO_LARGE,         // Rounding error too large
        INSUFFICIENT_BALANCE_OR_ALLOWANCE // Insufficient balance or allowance for token transfer
    }*/

    string constant public VERSION = "1.0.0";
    uint16 constant public EXTERNAL_QUERY_GAS_LIMIT = 4999;    // Changes to state require at least 5000 gas

    address public LOAN_TOKEN_CONTRACT;
    address public VAULT_CONTRACT;
    address public TOKEN_PRICES_CONTRACT;
    address public EXCHANGE0X_CONTRACT;

    struct LendOrder {
        address maker;
        address taker;
        address lendTokenAddress;
        address marginTokenAddress;
        address feeRecipientAddress;
        uint lendTokenAmount;
        uint interestAmount;
        uint initialMarginAmount;
        uint liquidationMarginAmount;
        uint lenderRelayFee;
        uint traderRelayFee;
        uint expirationUnixTimestampSec;
        bytes32 orderHash;
    }

    struct FilledOrder {
        address lender;
        uint marginTokenAmountFilled;
        uint lendTokenAmountFilled;
        uint filledUnixTimestampSec;
    }

    struct PriceData {
        uint lendTokenPrice;
        uint marginTokenPrice;
        uint tradeTokenPrice;
    }

    struct BalanceData {
        uint marginTokenBalance;
        uint lendTokenBalance;
        uint feeTokenTraderBalance;
        uint feeTokenLenderBalance;
    }

    mapping (bytes32 => uint) public filled; // mapping of orderHash to lendTokenAmount filled
    mapping (bytes32 => uint) public cancelled; // mapping of orderHash to lendTokenAmount cancelled
    mapping (bytes32 => LendOrder) public orders; // mapping of orderHash to taken lendOrders
    mapping (bytes32 => mapping (address => FilledOrder)) public orderFills; // mapping of orderHash to mapping of traders to lendOrder fills

    mapping (bytes32 => mapping (address => uint)) public interestPaid; // mapping of orderHash to mapping of traders to amount of interest paid so far to a lender

    bool DEBUG = true;
    uint constant MAX_UINT = 2**256 - 1;

    //mapping (bytes32 => OrderAddresses) public openTradeAddresses; // mapping of orderHash to open trade order addreses
    //mapping (bytes32 => OrderValues) public openTradeValues; // mapping of orderHash to open trade order values
    //mapping (bytes32 => uint) public openTrades; // mapping of orderHash to open trade amounts (in trade token units)


    //address[] dexList; // list of dex's for opening trades

    event LogFill(
        address indexed trader,
        address indexed lender,
        address indexed feeRecipientAddress,
        address lendTokenAddress,
        address marginTokenAddress,
        uint lendTokenAmountFilled,
        uint interestAmount,
        uint initialMarginAmount,
        uint liquidationMarginAmount,
        uint lenderRelayFee,
        uint traderRelayFee,
        uint expirationUnixTimestampSec,
        //bytes32 indexed tokens, // keccak256(makerToken, takerToken), allows subscribing to a token pair
        bytes32 orderHash
    );

    /*event LogCancel(
        address indexed maker,
        address indexed feeRecipient,
        address makerToken,
        address takerToken,
        uint cancelledMakerTokenAmount,
        uint cancelledLendTokenAmount,
        bytes32 indexed tokens,
        bytes32 orderHash
    );*/

    event LogError(uint8 indexed errorId, bytes32 indexed orderHash);
    event LogErrorText(string errorTxt, uint errorValue, bytes32 indexed orderHash);

    //event DepositEtherMargin(address user, uint amount, uint balance);
    //event DepositEtherFunding(address user, uint amount, uint balance);
    event DepositTokenMargin(address token, address user, uint amount, uint balance);
    event DepositTokenFunding(address token, address user, uint amount, uint balance);
    
    //event WithdrawEtherMargin(address user, uint amount, uint balance);
    //event WithdrawEtherFunding(address user, uint amount, uint balance);
    event WithdrawTokenMargin(address token, address user, uint amount, uint balance);
    event WithdrawTokenFunding(address token, address user, uint amount, uint balance);

    function() {
        revert();
    }

    function B0x(address _loanToken, address _vault, address _tokenPrices, address _0xExchange) {
        LOAN_TOKEN_CONTRACT = _loanToken;
        VAULT_CONTRACT = _vault;
        TOKEN_PRICES_CONTRACT = _tokenPrices;
        EXCHANGE0X_CONTRACT = _0xExchange;
    }
    /*
    bytes public response;
    function __tinyOracleCallback(uint256 id_, address token_, uint price_) onlyFromTinyOracle external {
        require(B0xPrices(TOKEN_PRICES_CONTRACT).setTokenPrice(msg.sender, token_, price_));
    }

    // uint price = B0xPrices(TOKEN_PRICES_CONTRACT).getTokenPrice(token_)
    */

    // this is purely for testing in a test environment
    // NOT FOR PRODUCTION!
    function testSendPriceUpdate(address token_, uint price_) public {
        require(B0xPrices(TOKEN_PRICES_CONTRACT).setTokenPrice(msg.sender, token_, price_));
    }



    /*function get0xObject(bytes32 orderHash)
        public
        constant 
        returns (string jsonStr)
    {
        jsonStr = "{";

        OrderAddresses memory orderAddresses = openTradeAddresses[orderHash];
        OrderValues memory orderValues = openTradeValues[orderHash];

        jsonStr = strConcat(jsonStr, "\x22b0x\x22: \x220x", toAsciiString(msg.sender), "\x22");
        jsonStr = strConcat(jsonStr, "\x22maker\x22: \x220x", toAsciiString(msg.sender), "\x22");
        jsonStr = strConcat(jsonStr, "\x22b0x\x22: \x220x", toAsciiString(msg.sender), "\x22");
        jsonStr = strConcat(jsonStr, "\x22b0x\x22: \x220x", toAsciiString(msg.sender), "\x22");
        
        jsonStr = strConcat(jsonStr,"}");
    }*/


    /*function liquidateTrade(
        bytes32 orderHash,
        address dexAddress)
        public
        returns (bool tradeSuccess)
    {
        OrderAddresses memory orderAddresses = openTradeAddresses[orderHash];
        OrderValues memory orderValues = openTradeValues[orderHash];
        
        uint tradeAmount = openTrades[orderHash];

        //closedOrders[orderHash] = true;

        return true;
    }*/

    function getLiquidationLevel(
        bytes32 lendOrderHash,
        address trader)
        internal
        constant
        returns (uint)
    {
        // todo: implement below!!!
        uint level;
        /*uint level = (
                                     (lendTokenAmountFilled * priceData.lendTokenPrice * lendOrder.initialMarginAmount / 100) // initial margin required
                                   + (lendOrder.expirationUnixTimestampSec.sub(block.timestamp) / 86400 * lendOrder.interestAmount * lendTokenAmountFilled / lendOrder.lendTokenAmount) // total interest required is loan is kept until order expiration
        ) / priceData.marginTokenPrice;*/

        return level;
    }

    function set0xExchange(
        address _0xExchange)
        public
        onlyOwner
    {
        EXCHANGE0X_CONTRACT = _0xExchange;
    }

/*
    /// @param orderAddresses Array of order's maker, taker, makerToken, takerToken, and feeRecipient.
    /// @param orderValues Array of order's makerTokenAmount, takerTokenAmount, makerFee, takerFee, expirationTimestampInSec, and salt.
    /// @param fillTakerTokenAmount Desired amount of takerToken to fill.
    /// @param shouldThrowOnInsufficientBalanceOrAllowance Test if transfer will fail before attempting.
    /// @param v ECDSA signature parameter v.
    /// @param r ECDSA signature parameters r.
    /// @param s ECDSA signature parameters s.
*/
    function open0xTrade(
        bytes32 lendOrderHash,
        address[5] orderAddresses0x,
        uint[6] orderValues0x,
        uint8 v,
        bytes32 r,
        bytes32 s)
        public
        returns (uint)
    {
        LendOrder memory lendOrder = orders[lendOrderHash];
        if (lendOrder.orderHash != lendOrderHash) {
            LogErrorText("error: invalid lend order", 0, lendOrderHash);
            return intOrRevert(0);
        }

        FilledOrder memory filledOrder = orderFills[lendOrderHash][msg.sender];
        if (filledOrder.lender == address(0)) {
            LogErrorText("error: filled order not found", 0, lendOrderHash);
            return intOrRevert(0);
        }

        // todo: check b0xVault for available margin, available fund token etc 
        uint marginlevel = getLiquidationLevel(lendOrderHash, msg.sender);
        if (marginlevel <= 100) {
            // todo: trigger order liquidation!
            LogErrorText("error: lendOrder has been liquidated!", 0, lendOrderHash);
            return intOrRevert(0);
        } else if (marginlevel < 110) {
            LogErrorText("error: margin level too low!", 0, lendOrderHash);
            return intOrRevert(0);
        }

        // 0x order will fail if filledOrder.lendTokenAmountFilled is too high
        uint amountFilled = Exchange0x(EXCHANGE0X_CONTRACT).fillOrder(
            orderAddresses0x,
            orderValues0x,
            filledOrder.lendTokenAmountFilled,
            true,
            v,
            r,
            s);
        if (amountFilled == 0) {
            LogErrorText("error: 0x order failed!", 0, lendOrderHash);
            return intOrRevert(0);
        }

        // todo: record trade data with amountFilled

        return amountFilled;
    }

    function payInterest(
        bytes32 lendOrderHash,
        address trader)
        public
        returns (uint)
    {
        LendOrder memory lendOrder = orders[lendOrderHash];
        if (lendOrder.orderHash != lendOrderHash) {
            LogErrorText("error: invalid lend order", 0, lendOrderHash);
            return intOrRevert(0);
        }

        FilledOrder memory filledOrder = orderFills[lendOrderHash][trader];
        if (filledOrder.lendTokenAmountFilled == 0) {
            LogErrorText("error: filled order not found for specified lendOrder and trader", 0, lendOrderHash);
            return intOrRevert(0);
        }
        
        if (block.timestamp >= lendOrder.expirationUnixTimestampSec) {
            //LogError(uint8(Errors.ORDER_EXPIRED), 0, lendOrderHash);
            LogErrorText("error: lendOrder has expired", 0, lendOrderHash);
            return intOrRevert(0);
        }
        
        uint totalAmountAccrued = block.timestamp.sub(filledOrder.filledUnixTimestampSec) / 86400 * lendOrder.interestAmount * filledOrder.lendTokenAmountFilled / lendOrder.lendTokenAmount;
        if (interestPaid[lendOrderHash][trader] >= totalAmountAccrued) {
            LogErrorText("warning: nothing left to pay for this trader", 0, lendOrderHash);
            return intOrRevert(0);
        }

        uint amountToPay = totalAmountAccrued.sub(interestPaid[lendOrderHash][trader]);
        interestPaid[lendOrderHash][trader] = totalAmountAccrued;
        
        if (! B0xVault(VAULT_CONTRACT).transferOutTokenMargin(
            lendOrder.marginTokenAddress,
            trader,
            filledOrder.lender,
            amountToPay
        )) {
            LogErrorText("error: unable to pay interest!!", amountToPay, lendOrder.orderHash);
            return intOrRevert(0);
        }

        return amountToPay;
    }

    // trader's can take a portion of the total coin being lended (lendTokenAmountFilled)
    function takeLendOrderAsTrader(
        address[5] orderAddresses,
        uint[8] orderValues,
        uint lendTokenAmountFilled,
        uint8 v,
        bytes32 r,
        bytes32 s)
        public
        returns (uint)
    {
        LendOrder memory lendOrder = LendOrder({
            maker: orderAddresses[0],
            taker: orderAddresses[1],
            lendTokenAddress: orderAddresses[2],
            marginTokenAddress: orderAddresses[3],
            feeRecipientAddress: orderAddresses[4],
            lendTokenAmount: orderValues[0],
            interestAmount: orderValues[1],
            initialMarginAmount: orderValues[2],
            liquidationMarginAmount: orderValues[3],
            lenderRelayFee: orderValues[4],
            traderRelayFee: orderValues[5],
            expirationUnixTimestampSec: orderValues[6],
            orderHash: getLendOrderHash(orderAddresses, orderValues)
        });

        if (_verifyLendOrder(
            lendOrder,
            lendTokenAmountFilled,
            v,
            r,
            s
        )) {
            lendTokenAmountFilled = _takeLendOrder(
                lendOrder,
                msg.sender,
                lendOrder.maker,
                lendTokenAmountFilled
            );
            
            LogFill(
                msg.sender,
                lendOrder.maker,
                lendOrder.feeRecipientAddress,
                lendOrder.lendTokenAddress,
                lendOrder.marginTokenAddress,
                lendTokenAmountFilled,
                lendOrder.interestAmount,
                lendOrder.initialMarginAmount,
                lendOrder.liquidationMarginAmount,
                lendOrder.lenderRelayFee,
                lendOrder.traderRelayFee,
                lendOrder.expirationUnixTimestampSec,
                //keccak256(lendOrder.makerToken, lendOrder.takerToken),
                lendOrder.orderHash
            );

            return lendTokenAmountFilled;
        }
        else {
            return 0;
        }
    }

    // lenders have to fill the entire desired amount the trader wants to borrow
    // this make lendTokenAmountFilled = lendOrder.lendTokenAmount
    function takeLendOrderAsLender(
        address[5] orderAddresses,
        uint[8] orderValues,
        uint8 v,
        bytes32 r,
        bytes32 s)
        public
        returns (uint)
    {
        LendOrder memory lendOrder = LendOrder({
            maker: orderAddresses[0],
            taker: orderAddresses[1],
            lendTokenAddress: orderAddresses[2],
            marginTokenAddress: orderAddresses[3],
            feeRecipientAddress: orderAddresses[4],
            lendTokenAmount: orderValues[0],
            interestAmount: orderValues[1],
            initialMarginAmount: orderValues[2],
            liquidationMarginAmount: orderValues[3],
            lenderRelayFee: orderValues[4],
            traderRelayFee: orderValues[5],
            expirationUnixTimestampSec: orderValues[6],
            orderHash: getLendOrderHash(orderAddresses, orderValues)
        });

        if (_verifyLendOrder(
            lendOrder,
            lendOrder.lendTokenAmount,
            v,
            r,
            s
        )) {
            uint lendTokenAmountFilled = _takeLendOrder(
                lendOrder,
                lendOrder.maker,
                msg.sender,
                lendOrder.lendTokenAmount
            );
            
            LogFill(
                lendOrder.maker,
                msg.sender,
                lendOrder.feeRecipientAddress,
                lendOrder.lendTokenAddress,
                lendOrder.marginTokenAddress,
                lendTokenAmountFilled,
                lendOrder.interestAmount,
                lendOrder.initialMarginAmount,
                lendOrder.liquidationMarginAmount,
                lendOrder.lenderRelayFee,
                lendOrder.traderRelayFee,
                lendOrder.expirationUnixTimestampSec,
                //keccak256(lendOrder.makerToken, lendOrder.takerToken),
                lendOrder.orderHash
            );

            return lendTokenAmountFilled;
        }
        else {
            return 0;
        }
    }

    /*function tradeBalanceOf(bytes32 orderHash_) public constant returns (uint balance) {
        return openTrades[orderHash_];
    }*/


    /*function depositEtherMargin() external nonReentrant payable {
        uint balance = B0xVault(VAULT_CONTRACT).depositEtherMargin.value(msg.value)(msg.sender);
        DepositEtherMargin(msg.sender, msg.value, balance);
    }
    function depositEtherFunding() external nonReentrant payable {
        uint balance = B0xVault(VAULT_CONTRACT).depositEtherFunding.value(msg.value)(msg.sender);
        DepositEtherFunding(msg.sender, msg.value, balance);
    }*/
    /*function depositTokenMargin(address token_, uint amount_) external nonReentrant {
        //remember to call ERC20(address).approve(this, amount) or this contract will not be able to do the transfer on your behalf.
        require(token_ != address(0));
        require(ERC20(token_).transferFrom(msg.sender, VAULT_CONTRACT, amount_));
    
        uint balance = B0xVault(VAULT_CONTRACT).depositTokenMargin(token_, msg.sender, amount_);
        DepositTokenMargin(token_, msg.sender, amount_, balance);
    }
    function depositTokenFunding(address token_, uint amount_) external nonReentrant {
        //remember to call ERC20(address).approve(this, amount) or this contract will not be able to do the transfer on your behalf.
        require(token_ != address(0));
        require(ERC20(token_).transferFrom(msg.sender, VAULT_CONTRACT, amount_));
    
        uint balance = B0xVault(VAULT_CONTRACT).depositTokenFunding(token_, msg.sender, amount_);
        DepositTokenFunding(token_, msg.sender, amount_, balance);
    }*/


    /*function withdrawEtherMargin(uint amount_) external nonReentrant {
        uint balance = B0xVault(VAULT_CONTRACT).withdrawEtherMargin(msg.sender, amount_);
        WithdrawEtherMargin(msg.sender, amount_, balance);
    }
    function withdrawEtherFunding(uint amount_) external nonReentrant {
        uint balance = B0xVault(VAULT_CONTRACT).withdrawEtherFunding(msg.sender, amount_);
        WithdrawEtherFunding(msg.sender, amount_, balance);
    }*/
    /*function withdrawTokenMargin(address token_, uint amount_) external nonReentrant {
        require(token_ != address(0));        
        uint balance = B0xVault(VAULT_CONTRACT).withdrawTokenMargin(token_, msg.sender, amount_);
        WithdrawTokenMargin(token_, msg.sender, amount_, balance);
    }
    function withdrawTokenFunding(address token_, uint amount_) external nonReentrant {
        require(token_ != address(0));        
        uint balance = B0xVault(VAULT_CONTRACT).withdrawTokenFunding(token_, msg.sender, amount_);
        WithdrawTokenFunding(token_, msg.sender, amount_, balance);
    }*/


    function _checkUsedMargin(address token_, address user_) internal returns (uint) {
        return B0xVault(VAULT_CONTRACT).usedMarginBalanceOf(token_,user_);
    }
    function _checkUsedFunding(address token_, address user_) internal returns (uint) {
        return B0xVault(VAULT_CONTRACT).usedFundingBalanceOf(token_,user_); 
    }


    /*
    function getDexList() public returns (address[]) {
        return dexList;
    }

    function addToDexList(address[] dexListToAdd) public onlyOwner {
        uint i;
        uint j;
        for (i = 0; i < dexListToAdd.length; i++) {
            bool found = false;
            for (j = 0; j < dexList.length; j++) {
                if (dexList[j] == dexListToAdd[i]) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                dexList.push(dexListToAdd[i]);
            }
        }
    }

    function removeFromDexList(address[] dexListToRemove) public onlyOwner {
        uint i;
        uint j;
        uint k;
        for (i = 0; i < dexListToRemove.length; i++) {
            bool found = false;
            for (j = 0; j < dexList.length; j++) {
                if (dexList[j] == dexListToRemove[i]) {
                    found = true;
                    break;
                }
            }
            if (found) {
                // removes found value and shrinks array
                for (k = j; k < dexList.length-1; k++) {
                    dexList[k] = dexList[k+1];
                }
                delete dexList[dexList.length-1];
                dexList.length--;
            }
        }
    }
    */

    /*
 
   /// @dev Cancels the input lendOrder.
    /// @param orderAddresses Array of order's maker, taker, makerToken, takerToken, and feeRecipient.
    /// @param orderValues Array of order's makerTokenAmount, lendTokenAmount, makerFee, takerFee, expirationUnixTimestampSec, and salt.
    /// @param cancelLendTokenAmount Desired amount of takerToken to cancel in lendOrder.
    /// @return Amount of takerToken cancelled.
    function cancelOrder(
        address[5] orderAddresses,
        uint[6] orderValues,
        uint cancelLendTokenAmount)
        public
        returns (uint)
    {
        Order memory order = Order({
            maker: orderAddresses[0],
            taker: orderAddresses[1],
            makerToken: orderAddresses[2],
            takerToken: orderAddresses[3],
            feeRecipient: orderAddresses[4],
            makerTokenAmount: orderValues[0],
            lendTokenAmount: orderValues[1],
            makerFee: orderValues[2],
            takerFee: orderValues[3],
            expirationUnixTimestampSec: orderValues[4],
            orderHash: getLendOrderHash(orderAddresses, orderValues)
        });

        require(lendOrder.maker == msg.sender);
        require(lendOrder.makerTokenAmount > 0 && lendOrder.lendTokenAmount > 0 && cancelLendTokenAmount > 0);

        if (block.timestamp >= lendOrder.expirationUnixTimestampSec) {
            LogError(uint8(Errors.ORDER_EXPIRED), 0, lendOrder.orderHash);
            return 0;
        }

        uint remainingLendTokenAmount = lendOrder.lendTokenAmount.sub(getUnavailableLendTokenAmount(lendOrder.orderHash));
        uint cancelledLendTokenAmount = SafeMath.min256(cancelLendTokenAmount, remainingLendTokenAmount);
        if (cancelledLendTokenAmount == 0) {
            LogError(uint8(Errors.ORDER_FULLY_FILLED_OR_CANCELLED), 0, lendOrder.orderHash);
            return 0;
        }

        cancelled[lendOrder.orderHash] = cancelled[lendOrder.orderHash].add(cancelledLendTokenAmount);

        LogCancel(
            lendOrder.maker,
            lendOrder.feeRecipient,
            lendOrder.makerToken,
            lendOrder.takerToken,
            getPartialAmount(cancelledLendTokenAmount, lendOrder.lendTokenAmount, lendOrder.makerTokenAmount),
            cancelledLendTokenAmount,
            keccak256(lendOrder.makerToken, lendOrder.takerToken),
            lendOrder.orderHash
        );
        return cancelledLendTokenAmount;
    }
    */
    
    
    /*
    * Constant public functions
    */

    /// @dev Calculates Keccak-256 hash of order with specified parameters.
    /// @param orderAddresses Array of order's maker, taker, lendTokenAddress, marginTokenAddress, and feeRecipientAddress.
    /// @param orderValues Array of order's lendTokenAmount, interestAmount, initialMarginAmount, liquidationMarginAmount, lenderRelayFee, traderRelayFee, expirationUnixTimestampSec, and salt
    /// @return Keccak-256 hash of lendOrder.
    function getLendOrderHash(
        address[5] orderAddresses, 
        uint[8] orderValues)
        public
        constant
        returns (bytes32)
    {
        return(keccak256(
            address(this),
            orderAddresses[0],  // maker
            orderAddresses[1],  // taker
            orderAddresses[2],  // lendTokenAddress
            orderAddresses[3],  // marginTokenAddress
            orderAddresses[4],   // feeRecipientAddress
            orderValues[0],    // lendTokenAmount
            orderValues[1],    // interestAmount
            orderValues[2],    // initialMarginAmount
            orderValues[3],    // liquidationMarginAmount
            orderValues[4],    // lenderRelayFee
            orderValues[5],    // traderRelayFee
            orderValues[6],    // expirationUnixTimestampSec
            orderValues[7]     // salt
        ));
    }

    /// @dev Verifies that an order signature is valid.
    /// @param signer address of signer.
    /// @param hash Signed Keccak-256 hash.
    /// @param v ECDSA signature parameter v.
    /// @param r ECDSA signature parameters r.
    /// @param s ECDSA signature parameters s.
    /// @return Validity of order signature.
    function isValidSignature(
        address signer,
        bytes32 hash,
        uint8 v,
        bytes32 r,
        bytes32 s)
        public
        constant
        returns (bool)
    {
        return signer == ecrecover(
            keccak256("\x19Ethereum Signed Message:\n32", hash),
            v,
            r,
            s
        );
    }

    /// @dev Checks if rounding error > 0.1%.
    /// @param numerator Numerator.
    /// @param denominator Denominator.
    /// @param target Value to multiply with numerator/denominator.
    /// @return Rounding error is present.
    /*function isRoundingError(uint numerator, uint denominator, uint target)
        public
        constant
        returns (bool)
    {
        uint remainder = mulmod(target, numerator, denominator);
        if (remainder == 0) return false; // No rounding error.

        uint errPercentageTimes1000000 = SafeMath.div(
            remainder.mul(1000000),
            numerator.mul(target)
        );
        return errPercentageTimes1000000 > 1000;
    }*/

    /// @dev Calculates partial value given a numerator and denominator.
    /// @param numerator Numerator.
    /// @param denominator Denominator.
    /// @param target Value to calculate partial of.
    /// @return Partial value of target.
    function getPartialAmount(uint numerator, uint denominator, uint target)
        public
        constant
        returns (uint)
    {
        return SafeMath.div(SafeMath.mul(numerator, target), denominator);
    }

    /// @dev Calculates the sum of values already filled and cancelled for a given lendOrder.
    /// @param orderHash The Keccak-256 hash of the given lendOrder.
    /// @return Sum of values already filled and cancelled.
    function getUnavailableLendTokenAmount(bytes32 orderHash)
        public
        constant
        returns (uint)
    {
        return filled[orderHash].add(cancelled[orderHash]);
    }


    /*
    * Internal functions
    */
   

    function _getPriceData(
        LendOrder lendOrder,
        address tradeTokenAddress)
        internal 
        constant 
        returns (PriceData)
    {   
        // prices are returned in wei per 1 token
        uint lendTokenPrice = B0xPrices(TOKEN_PRICES_CONTRACT).getTokenPrice(lendOrder.lendTokenAddress);
        
        uint marginTokenPrice = B0xPrices(TOKEN_PRICES_CONTRACT).getTokenPrice(lendOrder.marginTokenAddress);
        
        uint tradeTokenPrice = 0;
        if (tradeTokenAddress != address(0)) {
            tradeTokenPrice = B0xPrices(TOKEN_PRICES_CONTRACT).getTokenPrice(tradeTokenAddress);
        }

        return (PriceData({
            lendTokenPrice: lendTokenPrice,
            marginTokenPrice: marginTokenPrice,
            tradeTokenPrice: tradeTokenPrice
        }));
    }

    function _verifyLendOrder(
        LendOrder lendOrder,
        uint lendTokenAmountFilled,
        uint8 v,
        bytes32 r,
        bytes32 s)
        internal
        returns (bool)
    {
        if ((lendOrder.taker != address(0) && lendOrder.taker != msg.sender) || lendOrder.maker == msg.sender) {
            LogErrorText("error: invalid taker", 0, lendOrder.orderHash);
            return boolOrRevert(false);
        }
        if (! (lendOrder.lendTokenAddress > 0 && lendOrder.marginTokenAddress > 0 && lendOrder.lendTokenAmount > 0)) {
            LogErrorText("error: invalid token params", 0, lendOrder.orderHash);
            return boolOrRevert(false);
        }
        if (block.timestamp >= lendOrder.expirationUnixTimestampSec) {
            //LogError(uint8(Errors.ORDER_EXPIRED), 0, lendOrder.orderHash);
            LogErrorText("error: lendOrder has expired", 0, lendOrder.orderHash);
            return boolOrRevert(false);
        }
        if(! isValidSignature(
            lendOrder.maker,
            lendOrder.orderHash,
            v,
            r,
            s
        )) {
            LogErrorText("error: invalid signiture", 0, lendOrder.orderHash);
            return boolOrRevert(false);
        }

        if(! (lendOrder.liquidationMarginAmount >= 0 && lendOrder.liquidationMarginAmount < lendOrder.initialMarginAmount && lendOrder.initialMarginAmount <= 100)) {
            LogErrorText("error: valid margin parameters", 0, lendOrder.orderHash);
            return boolOrRevert(false);
        }

        uint remainingLendTokenAmount = lendOrder.lendTokenAmount.sub(getUnavailableLendTokenAmount(lendOrder.orderHash));
        if (remainingLendTokenAmount < lendTokenAmountFilled) {
            LogErrorText("error: not enough lendToken still available in thie order", 0, lendOrder.orderHash);
            return boolOrRevert(false);
        }
        /*uint remainingLendTokenAmount = safeSub(lendOrder.lendTokenAmount, getUnavailableLendTokenAmount(lendOrder.orderHash));
        uint filledLendTokenAmount = min256(lendTokenAmountFilled, remainingLendTokenAmount);
        if (filledLendTokenAmount == 0) {
            //LogError(uint8(Errors.ORDER_FULLY_FILLED_OR_CANCELLED), 0, lendOrder.orderHash);
            LogErrorText("error: order is fully filled or cancelled", 0, lendOrder.orderHash);
            return boolOrRevert(false);
        }*/

        /*if (isRoundingError(filledLendTokenAmount, lendOrder.lendTokenAmount)) {
            //LogError(uint8(Errors.ROUNDING_ERROR_TOO_LARGE), 0, lendOrder.orderHash);
            LogErrorText("error: rounding error to large", 0, lendOrder.orderHash);
            return boolOrRevert(false);
        }*/

        return true;
    }

    function _takeLendOrder(
        LendOrder lendOrder,
        address trader,
        address lender,
        uint lendTokenAmountFilled)
        internal
        returns (uint)
    {
        // a trader can only fill a portion or all of a lendOrder once
        // todo: explain reason in the whitepaper:
        //      - avoids complex interest payments for parts of an order filled at different times by the same trader
        //      - avoids potentially large loops when calculating margin reqirements and interest payments
        FilledOrder storage filledOrder = orderFills[lendOrder.orderHash][trader];
        if (filledOrder.lendTokenAmountFilled != 0) {
            LogErrorText("error: lendOrder already filled for this trader", 0, lendOrder.orderHash);
            return intOrRevert(0);
        }

        PriceData memory priceData = _getPriceData(lendOrder, 0);
        if (priceData.lendTokenPrice == 0) {
            LogErrorText("error: lendTokenPrice is 0 or not found", 0, lendOrder.orderHash);
            return intOrRevert(0);
        }
        if (priceData.marginTokenPrice == 0) {
            LogErrorText("error: marginTokenPrice is 0 or not found", 0, lendOrder.orderHash);
            return intOrRevert(0);
        }

        uint marginTokenAmountFilled = _initialMargin(lendOrder, priceData, lendTokenAmountFilled);

        uint paidTraderFee;
        uint paidLenderFee;
        orders[lendOrder.orderHash] = lendOrder;
        filled[lendOrder.orderHash] = filled[lendOrder.orderHash].add(lendTokenAmountFilled);

        filledOrder.lender = lender;
        filledOrder.marginTokenAmountFilled = marginTokenAmountFilled;
        filledOrder.lendTokenAmountFilled = lendTokenAmountFilled;
        filledOrder.filledUnixTimestampSec = block.timestamp;
        
        if (! B0xVault(VAULT_CONTRACT).transferInTokenMarginAndUse(
            lendOrder.marginTokenAddress,
            trader,
            marginTokenAmountFilled
        )) {
            LogErrorText("error: unable to transfer enough marginToken", 0, lendOrder.orderHash);
            return intOrRevert(lendTokenAmountFilled);
        }

        if (! B0xVault(VAULT_CONTRACT).transferInTokenFundingAndUse(
            lendOrder.lendTokenAddress,
            lender,
            lendTokenAmountFilled
        )) {
            LogErrorText("error: unable to transfer enough lendToken", 0, lendOrder.orderHash);
            return intOrRevert(lendTokenAmountFilled);
        }

        if (lendOrder.feeRecipientAddress != address(0)) {
            if (lendOrder.traderRelayFee > 0) {
                paidTraderFee = getPartialAmount(lendTokenAmountFilled, lendOrder.lendTokenAmount, lendOrder.traderRelayFee);
                
                if (! B0xVault(VAULT_CONTRACT).transferOutTokenMargin(
                    LOAN_TOKEN_CONTRACT, 
                    trader,
                    lendOrder.feeRecipientAddress,
                    paidTraderFee
                )) {
                    LogErrorText("error: unable to pay traderRelayFee", 0, lendOrder.orderHash);
                    return intOrRevert(lendTokenAmountFilled);
                }
            }
            if (lendOrder.lenderRelayFee > 0) {
                paidLenderFee = getPartialAmount(lendTokenAmountFilled, lendOrder.lendTokenAmount, lendOrder.lenderRelayFee);
                
                if (! B0xVault(VAULT_CONTRACT).transferOutTokenFunding(
                    LOAN_TOKEN_CONTRACT, 
                    lender,
                    lendOrder.feeRecipientAddress,
                    paidLenderFee
                )) {
                    LogErrorText("error: unable to pay lenderRelayFee", 0, lendOrder.orderHash);
                    return intOrRevert(lendTokenAmountFilled);
                }
            }
        }

        LogErrorText("success!", 0, lendOrder.orderHash);

        return lendTokenAmountFilled;
    }


    // todo: rather than have a checkAmounts function
    // just initiate transfers in Vault contract
    // before calling the tokens for transfer check margin and funding balances
    // maybe make checkAmounts below, actually do the transfers
    /*function checkAmounts_new(
        lendOrder
    )*/

    /*function checkAmounts(
        LendOrder lendOrder,
        PriceData priceData,
        BalanceData balanceData,
        address trader,
        address lender,
        uint lendTokenAmountFilled)
        internal
        constant  // The called token contracts may attempt to change state, but will not be able to due to gas limits on getBalance and getAllowance.
        returns (bool)
    {
        // todo: deal with stack too deep, by calculating marginTokenAmountFilled prior to this function
        // and also calculate requiredLenderFeeTokenTransfer and others prior to this
        
        uint requiredLendTokenTransfer = SafeMath.max256(lendTokenAmountFilled-balanceData.lendTokenBalance,0);

        uint marginTokenAmountFilled = _initialMargin(lendOrder, priceData, lendTokenAmountFilled);
        uint requiredMarginTokenTransfer = SafeMath.max256(marginTokenAmountFilled-balanceData.marginTokenBalance,0);

        if (lendOrder.feeRecipientAddress != address(0)) {
            //bool isLendTokenLOAN = lendOrder.lendTokenAddress == LOAN_TOKEN_CONTRACT;
            //bool isMarginTokenLOAN = lendOrder.marginTokenAddress == LOAN_TOKEN_CONTRACT;
            uint paidLenderFee = getPartialAmount(lendTokenAmountFilled, lendOrder.lendTokenAmount, lendOrder.lenderRelayFee);
            uint paidTraderFee = getPartialAmount(lendTokenAmountFilled, lendOrder.lendTokenAmount, lendOrder.traderRelayFee);
            
            uint requiredLenderFeeTokenTransfer = lendOrder.lendTokenAddress == LOAN_TOKEN_CONTRACT ? lendTokenAmountFilled.add(paidLenderFee) : paidLenderFee;
            requiredLenderFeeTokenTransfer = SafeMath.max256(requiredLenderFeeTokenTransfer-balanceData.feeTokenLenderBalance,0);
            
            uint requiredTraderFeeTokenTransfer = lendOrder.marginTokenAddress == LOAN_TOKEN_CONTRACT ? marginTokenAmountFilled.add(paidTraderFee) : paidTraderFee;
            requiredTraderFeeTokenTransfer = SafeMath.max256(requiredTraderFeeTokenTransfer-balanceData.feeTokenTraderBalance,0);

            if (requiredLenderFeeTokenTransfer > 0 && (   getBalance(LOAN_TOKEN_CONTRACT, lender) < requiredLenderFeeTokenTransfer
                                           || getAllowance(LOAN_TOKEN_CONTRACT, lender) < requiredLenderFeeTokenTransfer)
            ) return false;
            if (requiredTraderFeeTokenTransfer > 0 && (   getBalance(LOAN_TOKEN_CONTRACT, trader) < requiredTraderFeeTokenTransfer
                                           || getAllowance(LOAN_TOKEN_CONTRACT, trader) < requiredTraderFeeTokenTransfer)
            ) return false;

            if (lendOrder.lendTokenAddress != LOAN_TOKEN_CONTRACT && requiredLendTokenTransfer > 0 && (   getBalance(lendOrder.lendTokenAddress, lender) < requiredLendTokenTransfer // Don't double check lendTokenAddress if LOAN
                                     || getAllowance(lendOrder.lendTokenAddress, lender) < requiredLendTokenTransfer)
            ) return false;
            if (lendOrder.marginTokenAddress != LOAN_TOKEN_CONTRACT && requiredMarginTokenTransfer > 0 && (   getBalance(lendOrder.marginTokenAddress, trader) < requiredMarginTokenTransfer // Don't double check marginTokenAddress if LOAN
                                     || getAllowance(lendOrder.marginTokenAddress, trader) < requiredMarginTokenTransfer)
            ) return false;
        } else if (requiredLendTokenTransfer > 0 && (   getBalance(lendOrder.lendTokenAddress, lender) < requiredLendTokenTransfer
                                                     || getAllowance(lendOrder.lendTokenAddress, lender) < requiredLendTokenTransfer)
        ) { 
            return false;
        } else if (requiredMarginTokenTransfer > 0 && (   getBalance(lendOrder.marginTokenAddress, trader) < requiredMarginTokenTransfer
                                                     || getAllowance(lendOrder.marginTokenAddress, trader) < requiredMarginTokenTransfer)
        ) {
            return false;
        }

        return true;
    }*/

    function _initialMargin(
        LendOrder lendOrder,
        PriceData priceData,
        uint lendTokenAmountFilled)
        internal
        constant
        returns (uint marginTokenAmountFilled)
    {
        marginTokenAmountFilled = (
                                     (lendTokenAmountFilled * priceData.lendTokenPrice * lendOrder.initialMarginAmount / 100) // initial margin required
                                   + (lendOrder.expirationUnixTimestampSec.sub(block.timestamp) / 86400 * lendOrder.interestAmount * lendTokenAmountFilled / lendOrder.lendTokenAmount) // total interest required is loan is kept until order expiration
        ) / priceData.marginTokenPrice;
    }

    function intOrRevert(uint retVal) 
        internal
        constant 
        returns (uint) {
        if (!DEBUG) {
            revert();
        }

        return retVal;
    }
    function boolOrRevert(bool retVal) 
        internal
        constant 
        returns (bool) {
        if (!DEBUG) {
            revert();
        }

        return retVal;
    }

    /*
        if (lendOrder.feeRecipientAddress != address(0) &&
            ! (
            _checkMargin(LOAN_TOKEN_CONTRACT, trader) >= lendOrder.traderRelayFee &&
            _checkFunding(LOAN_TOKEN_CONTRACT, lender) >= lendOrder.lenderRelayFee
        )) {
            LogErrorText("error: margin or lending balances can't cover fees", 0, lendOrder.orderHash);
            return 0;
        }

        PriceData memory priceData = _getPriceData(lendOrder, 0);
        if (priceData.lendTokenPrice == 0) {
            LogErrorText("error: lendTokenPrice is 0 or not found", 0, lendOrder.orderHash);
            return 0;
        }
        if (priceData.marginTokenPrice == 0) {
            LogErrorText("error: marginTokenPrice is 0 or not found", 0, lendOrder.orderHash);
            return 0;
        }

        uint lendTokenBalance = _checkFunding(lendOrder.lendTokenAddress, lender);
        uint marginTokenBalance = _checkMargin(lendOrder.marginTokenAddress, trader);

        // Does lender have enough funds to cover the order?
        if(lendTokenAmountFilled <= lendTokenBalance) {
            LogErrorText("error: lender doesn't have enough funds to cover the order", 0, lendOrder.orderHash);
            return 0;
        }

        // Does trader have enough initial margin to borrow the lendToken?
        if(! (
            (lendTokenAmountFilled * priceData.lendTokenPrice * lendOrder.initialMarginAmount / 100) // initial margin required
                + (lendOrder.expirationUnixTimestampSec.sub(block.timestamp) / 86400 * lendOrder.interestAmount) // total interest required is loan is kept until order expiration
                    <= (marginTokenBalance * priceData.marginTokenPrice))) {
            LogErrorText("error: trader doesn't have enough intitial margin and interest to cover the lendOrder", 0, lendOrder.orderHash);
            return 0;
        }
    */
}
