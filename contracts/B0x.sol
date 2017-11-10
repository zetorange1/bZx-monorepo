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
        address trader;
        address lender;
        uint lendTokenAmountFilled;
    }

    struct PriceData {
        uint lendTokenPrice;
        uint marginTokenPrice;
        uint tradeTokenPrice;
    }


    mapping (bytes32 => uint) public filled; // mapping of orderHash to lendTokenAmount filled
    mapping (bytes32 => uint) public cancelled; // mapping of orderHash to lendTokenAmount cancelled
    mapping (bytes32 => FilledOrder[]) public orderFills; // mapping of orderHash to partial order fills


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
    event LogErrorText(string errorTxt, bytes32 indexed orderHash);

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

    function B0x(address _loanToken, address _vault, address _tokenPrices) {
        LOAN_TOKEN_CONTRACT = _loanToken;
        VAULT_CONTRACT = _vault;
        TOKEN_PRICES_CONTRACT = _tokenPrices;
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
                //keccak256(order.makerToken, order.takerToken),
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
                //keccak256(order.makerToken, order.takerToken),
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
    function depositTokenMargin(address token_, uint amount_) external nonReentrant {
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
    }


    /*function withdrawEtherMargin(uint amount_) external nonReentrant {
        uint balance = B0xVault(VAULT_CONTRACT).withdrawEtherMargin(msg.sender, amount_);
        WithdrawEtherMargin(msg.sender, amount_, balance);
    }
    function withdrawEtherFunding(uint amount_) external nonReentrant {
        uint balance = B0xVault(VAULT_CONTRACT).withdrawEtherFunding(msg.sender, amount_);
        WithdrawEtherFunding(msg.sender, amount_, balance);
    }*/
    function withdrawTokenMargin(address token_, uint amount_) external nonReentrant {
        require(token_ != address(0));        
        uint balance = B0xVault(VAULT_CONTRACT).withdrawTokenMargin(token_, msg.sender, amount_);
        WithdrawTokenMargin(token_, msg.sender, amount_, balance);
    }
    function withdrawTokenFunding(address token_, uint amount_) external nonReentrant {
        require(token_ != address(0));        
        uint balance = B0xVault(VAULT_CONTRACT).withdrawTokenFunding(token_, msg.sender, amount_);
        WithdrawTokenFunding(token_, msg.sender, amount_, balance);
    }


    function _checkMargin(address token_, address user_) internal returns (uint) {
        uint available = B0xVault(VAULT_CONTRACT).marginBalanceOf(token_,user_);
        return available; 
    }
    function _checkFunding(address token_, address user_) internal returns (uint) {
        uint available = B0xVault(VAULT_CONTRACT).fundingBalanceOf(token_,user_);
        return available; 
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
            LogError(uint8(Errors.ORDER_EXPIRED), lendOrder.orderHash);
            return 0;
        }

        uint remainingLendTokenAmount = lendOrder.lendTokenAmount.sub(getUnavailableLendTokenAmount(lendOrder.orderHash));
        uint cancelledLendTokenAmount = SafeMath.min256(cancelLendTokenAmount, remainingLendTokenAmount);
        if (cancelledLendTokenAmount == 0) {
            LogError(uint8(Errors.ORDER_FULLY_FILLED_OR_CANCELLED), lendOrder.orderHash);
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
            LogErrorText("error: invalid taker", lendOrder.orderHash);
            return false;
        }
        if (! (lendOrder.lendTokenAddress > 0 && lendOrder.marginTokenAddress > 0 && lendOrder.lendTokenAmount > 0)) {
            LogErrorText("error: invalid token params", lendOrder.orderHash);
            return false;
        }
        if (block.timestamp >= lendOrder.expirationUnixTimestampSec) {
            //LogError(uint8(Errors.ORDER_EXPIRED), lendOrder.orderHash);
            LogErrorText("error: order has expired", lendOrder.orderHash);
            return false;
        }
        if(! isValidSignature(
            lendOrder.maker,
            lendOrder.orderHash,
            v,
            r,
            s
        )) {
            LogErrorText("error: invalid signiture", lendOrder.orderHash);
            return false;
        }

        if(! (lendOrder.liquidationMarginAmount >= 0 && lendOrder.liquidationMarginAmount < lendOrder.initialMarginAmount && lendOrder.initialMarginAmount <= 100)) {
            LogErrorText("error: valid margin parameters", lendOrder.orderHash);
            return false;
        }

        uint remainingLendTokenAmount = lendOrder.lendTokenAmount.sub(getUnavailableLendTokenAmount(lendOrder.orderHash));
        if (remainingLendTokenAmount < lendTokenAmountFilled) {
            LogErrorText("error: not enough lendToken still available in thie order", lendOrder.orderHash);
            return false;
        }
        /*uint remainingLendTokenAmount = safeSub(lendOrder.lendTokenAmount, getUnavailableLendTokenAmount(lendOrder.orderHash));
        uint filledLendTokenAmount = min256(lendTokenAmountFilled, remainingLendTokenAmount);
        if (filledLendTokenAmount == 0) {
            //LogError(uint8(Errors.ORDER_FULLY_FILLED_OR_CANCELLED), lendOrder.orderHash);
            LogErrorText("error: order is fully filled or cancelled", lendOrder.orderHash);
            return false;
        }*/

        /*if (isRoundingError(filledLendTokenAmount, lendOrder.lendTokenAmount)) {
            //LogError(uint8(Errors.ROUNDING_ERROR_TOO_LARGE), lendOrder.orderHash);
            LogErrorText("error: rounding error to large", lendOrder.orderHash);
            return false;
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
        if (lendOrder.feeRecipientAddress != address(0) &&
            ! (
            _checkMargin(LOAN_TOKEN_CONTRACT, trader) >= lendOrder.traderRelayFee &&
            _checkFunding(LOAN_TOKEN_CONTRACT, lender) >= lendOrder.lenderRelayFee
        )) {
            LogErrorText("error: margin or lending balances can't cover fees", lendOrder.orderHash);
            return 0;
        }

        PriceData memory priceData = _getPriceData(lendOrder, 0);
        if (priceData.lendTokenPrice == 0) {
            LogErrorText("error: lendTokenPrice is 0 or not found", lendOrder.orderHash);
            return 0;
        }
        if (priceData.marginTokenPrice == 0) {
            LogErrorText("error: marginTokenPrice is 0 or not found", lendOrder.orderHash);
            return 0;
        }

        uint lendTokenBalance = _checkFunding(lendOrder.lendTokenAddress, lender);
        uint marginTokenBalance = _checkMargin(lendOrder.marginTokenAddress, trader);

        // Does lender have enough funds to cover the order?
        if(lendTokenAmountFilled <= lendTokenBalance) {
            LogErrorText("error: lender doesn't have enough funds to cover the order", lendOrder.orderHash);
            return 0;
        }

        // Does trader have enough initial margin to borrow the lendToken?
        if(! (
            (lendTokenBalance * priceData.lendTokenPrice * lendOrder.initialMarginAmount / 100) // initial margin required
                + (lendOrder.expirationUnixTimestampSec.sub(block.timestamp) / 86400 * lendOrder.interestAmount) // total interest required is loan is kept until order expiration
                    <= (marginTokenBalance * priceData.marginTokenPrice))) {
            LogErrorText("error: trader doesn't have enough intitial margin and interest to cover the lendOrder", lendOrder.orderHash);
            return 0;
        }

        uint paidTraderFee;
        uint paidLenderFee;
        filled[lendOrder.orderHash] = filled[lendOrder.orderHash].add(lendTokenAmountFilled);
        orderFills[lendOrder.orderHash].push(FilledOrder({
            trader: trader,
            lender: lender,
            lendTokenAmountFilled: lendTokenAmountFilled
        }));

        if (lendOrder.feeRecipientAddress != address(0)) {
            if (lendOrder.traderRelayFee > 0) {
                paidTraderFee = getPartialAmount(lendTokenAmountFilled, lendOrder.lendTokenAmount, lendOrder.traderRelayFee);
                
                if (! B0xVault(VAULT_CONTRACT).transferOutTokenMargin(
                    LOAN_TOKEN_CONTRACT, 
                    trader,
                    lendOrder.feeRecipientAddress,
                    paidTraderFee
                )) {
                    LogErrorText("error: unable to pay traderRelayFee", lendOrder.orderHash);
                    return lendTokenAmountFilled;
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
                    LogErrorText("error: unable to pay lenderRelayFee", lendOrder.orderHash);
                    return lendTokenAmountFilled;
                }
            }
        }

        LogErrorText("success!", lendOrder.orderHash);

        return lendTokenAmountFilled;
    }

    /*
    /// @dev Get token balance of an address.
    /// @param token Address of token.
    /// @param owner Address of owner.
    /// @return Token balance of owner.
    function getBalance(address token, address owner)
        internal
        constant  // The called token contract may attempt to change state, but will not be able to due to an added gas limit.
        returns (uint)
    {
        return ERC20(token).balanceOf.gas(EXTERNAL_QUERY_GAS_LIMIT)(owner); // Limit gas to prevent reentrancy
    }

    /// @dev Get allowance of token given to TokenTransferProxy by an address.
    /// @param token Address of token.
    /// @param owner Address of owner.
    /// @return Allowance of token given to TokenTransferProxy by owner.
    function getAllowance(address token, address owner)
        internal
        constant  // The called token contract may attempt to change state, but will not be able to due to an added gas limit.
        returns (uint)
    {
        return ERC20(token).allowance.gas(EXTERNAL_QUERY_GAS_LIMIT)(owner, TOKEN_TRANSFER_PROXY_CONTRACT); // Limit gas to prevent reentrancy
    }*/
}
