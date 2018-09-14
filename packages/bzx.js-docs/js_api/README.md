# JavaScript API

This documentation section contains the description of JavaScript API provided by the bzx.js library.

bzx.js is the library for interaction with the bZx protocol.

This library provides a way for interaction with the bZx smart contracts, and helper functions.

### Global

________________________________________________________________________________

##### Constructor

Creates an instance of BZxJS.

```typescript
  constructor(
    provider: Provider,
    params: { networkId: number; addresses?: string[] }
  );
```

###### Arguments

`provider` web3 provider

`params.networkid` id of the network to connect (for example `3` for `ropsten`)

`params.addresses` a map containing the bZx contracts addresses in the specified network

###### Returns

`BZxJS` instance

### Methods

________________________________________________________________________________

#### Allowance

________________________________________________________________________________

##### getAllowance

Get the amount of tokens granted to withdraw by `spenderAddress`.

```typescript
  getAllowance(params: {
    tokenAddress: string;
    ownerAddress: string;
    spenderAddress: string;
  }): BigNumber;
```

###### Arguments

`params.tokenAddress` ERC20 contract address of the token

`params.ownerAddress` address of the owner of the tokens - wallet who grants right to withdraw tokens

`params.spenderAddress` address of the spender of the tokens - wallet who gets right to withdraw tokens

###### Returns

`BigNumber` value indicating tokens amount allowed to withdraw

________________________________________________________________________________

##### setAllowance

Allow `spenderAddress` to withdraw tokens from `ownerAddress`, multiple times, up to the `amountInBaseUnits` amount.

```typescript
  setAllowance(params: {
    tokenAddress: string;
    ownerAddress: string;
    spenderAddress: string;
    amountInBaseUnits: BigNumber;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<boolean> | TransactionObject<boolean>;
```

###### Arguments

`params.tokenAddress` ERC20 contract address of the token

`params.ownerAddress` address of the owner of the tokens - wallet who grants right to use tokens

`params.spenderAddress` address of the spender of the tokens - wallet who gets right to use tokens

`params.amountInBaseUnits` amount of tokens that are allowed to use

`params.getObject` should this function return `TransactionObject` (`true`) or `Promise` (`false`)

`params.txOpts` web3 transaction options object (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise` or `TransactionObject` for `boolean` value indicating if the operation succeeded

________________________________________________________________________________

##### setAllowanceUnlimited

Allow `spenderAddress` to withdraw tokens from `ownerAddress`, multiple times, without the limit.

```typescript
  setAllowanceUnlimited(params: {
    tokenAddress: string;
    ownerAddress: string;
    spenderAddress: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<boolean> | TransactionObject<boolean>;
```

###### Arguments

`params.tokenAddress` ERC20 contract address of the token

`params.ownerAddress` address of the owner of the tokens - wallet who grants right to use tokens

`params.spenderAddress` address of the spender of the tokens - wallet who gets right to use tokens

`params.getObject` should this function return `TransactionObject` (`true`) or `Promise` (`false`)

`params.txOpts` web3 transaction options object (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise` or `TransactionObject` for `boolean` value indicating if the operation succeeded

________________________________________________________________________________

##### resetAllowance

Disallow `spenderAddress` to withdraw tokens from `ownerAddress`.

```typescript
  resetAllowance(params: {
    tokenAddress: string;
    ownerAddress: string;
    spenderAddress: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<boolean> | TransactionObject<boolean>;
```

###### Arguments

`params.tokenAddress` ERC20 contract address of the token

`params.ownerAddress` address of the owner of the tokens - wallet who grants right to use tokens

`params.spenderAddress` address of the spender of the tokens - wallet who gets right to use tokens

`params.getObject` should this function return `TransactionObject` (`true`) or `Promise` (`false`)

`params.txOpts` web3 transaction options object (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise` or `TransactionObject` for `boolean` value indicating if the operation succeeded

#### Hash

________________________________________________________________________________

##### getLoanOrderHashHex

Calculate Keccak-256 hash of loan order with specified parameters.

```typescript
  getLoanOrderHashHex(order): Promise<string>;
```

###### Arguments

`order` loan order

###### Returns

Hash value `string`

________________________________________________________________________________

##### getLoanOrderHashAsync

Calculate Keccak-256 hash of order with specified parameters.

```typescript
  getLoanOrderHashAsync(order): Promise<string>;
```

###### Arguments

`order` loan order

###### Returns

`Promise` for hash value `string`

#### Signature

________________________________________________________________________________

##### signOrderHashAsync

Sign loan order and returns the signature `string`.

```typescript
  signOrderHashAsync(
    orderHash: string,
    signerAddress: string,
    shouldAddPersonalMessagePrefix: boolean
  ): Promise<string>;
```

###### Arguments

`orderHash` loan order hash

`signerAddress` address of a wallet signing the loan order hash

`shouldAddPersonalMessagePrefix` indicates whether or not personal message prefix should be added

###### Returns

`Promise` for `string` containing order hash signature

________________________________________________________________________________

##### isValidSignature

Check order hash signature validity.

```typescript
  static isValidSignature({ account, orderHash, signature }): boolean;
```

###### Arguments

`account` account who signed the loan order hash

`orderHash` loan order hash

`signature` loan order signature

###### Returns

`boolean` value indicating if the signature is valid

________________________________________________________________________________

##### isValidSignatureAsync

Check order hash signature validity.

```typescript
  isValidSignatureAsync({ account, orderHash, signature }): Promise<boolean>;
```

###### Arguments

`account` account who signed the loan order hash

`orderHash` loan order hash

`signature` loan order signature

###### Returns

`Promise` for `boolean` value indicating if the signature is valid

#### Exchange

________________________________________________________________________________

##### getTokenList

Provide metadata for all registered tokens.

```typescript
  getTokenList(): ITokenDescription[];
```

###### Arguments

None

###### Returns

Array of `ITokenDescription`

________________________________________________________________________________

##### getOracleList

Provide metadata for all registered oracles.

```typescript
  getOracleList(): IOracleDescription[];
```

###### Arguments

None

###### Returns

Array of `IOracleDescription`

________________________________________________________________________________

##### isTradeSupported

Check if specified `oracleAddress` supports exchange operation of provided tokens.

```typescript
  isTradeSupported(params: { 
    sourceTokenAddress: string; 
    destTokenAddress: string; 
    oracleAddress: string 
  }): boolean;
```

###### Arguments

`sourceTokenAddress` address of source token's ERC20 contract

`destTokenAddress` address of destination token's ERC20 contract

`oracleAddress` address of the oracle to check tokens pair support

###### Returns

`boolean` value indicating if oracle is able to make exchange operation between tokens

________________________________________________________________________________

##### getConversionData

Get terms of exchange operation between tokens in the specific amount using selected oracle.

```typescript
  getConversionData(params: {
    sourceTokenAddress: string;
    destTokenAddress: string;
    sourceTokenAmount: BigNumber;
    oracleAddress: string;
  }): { rate: BigNumber; amount: BigNumber };
```

###### Arguments

`sourceTokenAddress` address of source token's ERC20 contract

`destTokenAddress` address of destination token's ERC20 contract

`sourceTokenAmount` amount of tokens to exchange

`oracleAddress` address of oracle to check tokens pair support

###### Returns

Object with the next set of fields:

`rate` available exchange rate

`amount` available amount of tokens to exchange

#### Loan orders

________________________________________________________________________________

##### getSingleOrder

.

```typescript
  getSingleOrder(params: { 
    loanOrderHash: string 
  }): ILoanOrderFillable;
```

###### Arguments

`params.loanOrderHash` a unique hash representing the loan order

###### Returns

`ILoanOrderFillable` which represents the current state of specified loan order

________________________________________________________________________________

##### getOrdersFillable

Get the list of loan orders that are available for taking.

```typescript
  getOrdersFillable(params: { 
    start: number; 
    count: number 
  }): ILoanOrderFillable[];
```

###### Arguments

`params.start` starting number of the loan order in the list of orders that are available for taking

`params.count` maximum number of loan orders to return

###### Returns

Array of `ILoanOrderFillable` every item of which represents the current fill state of specified loan order

________________________________________________________________________________

##### getOrdersForUser

Return the list of loan orders filtered by specified `loanPartyAddress`.

```typescript
  getOrdersForUser(params: {
    loanPartyAddress: string; 
    start: number;
    count: number
  }): ILoanOrderFillable[];
```

###### Arguments

`params.loanPartyAddress` the address of the lender/trader in the loan order

`params.start` starting number of the loan order in the list of orders

`params.count` maximum number of loan orders to return

###### Returns

Array of `ILoanOrderFillable` every item of which represents the current fill state of specified loan order

________________________________________________________________________________

##### takeLoanOrderAsTrader

Take loan order created and signed by the lender and push it on-chain.

```typescript
  takeLoanOrderAsTrader(params: {
    order: ILoanOrderFillRequest;
    collateralTokenAddress: string;
    loanTokenAmountFilled: BigNumber;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<BigNumber> | TransactionObject<BigNumber>;
```

###### Arguments

`params.order` signed loan order `ILoanOrderFillRequest`

`params.collateralTokenAddress` desired address of the collateral the trader wants to use

`params.loanTokenAmountFilled` desired amount of loanToken the trader wants to borrow

`params.getObject` should this function return `TransactionObject` (`true`) or `Promise` (`false`)

`params.txOpts` web3 transaction options object (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise` or `TransactionObject` for `BigNumber` containing the total amount of loanToken borrowed

________________________________________________________________________________

##### takeLoanOrderAsLender

Take loan order created and signed by the trader and push it on-chain.

```typescript
  takeLoanOrderAsLender(params: {
    order: ILoanOrderFillRequest;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<BigNumber> | TransactionObject<BigNumber>;
```

###### Arguments

`params.order`signed loan order `ILoanOrderFillRequest`

`params.getObject` should this function return `TransactionObject` (`true`) or `Promise` (`false`)

`params.txOpts` web3 transaction options object (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise` or `TransactionObject` for `BigNumber` containing the total amount of loanToken borrowed

________________________________________________________________________________

##### pushLoanOrderOnChain

Push signed loan order on-chain.

```typescript
  pushLoanOrderOnChain(params: {
    order: ILoanOrderFillRequest;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<string> | TransactionObject<string>;
```

###### Arguments

`params.order`signed loan order `ILoanOrderFillRequest`

`params.getObject` should this function return `TransactionObject` (`true`) or `Promise` (`false`)

`params.txOpts` web3 transaction options object (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise` or `TransactionObject` for a unique hash `string` representing the loan order

________________________________________________________________________________

##### takeLoanOrderOnChainAsTrader

Take loan order created and signed by the lender and already located on-chain (partially filled).

```typescript
  takeLoanOrderOnChainAsTrader(params: {
    loanOrderHash: string;
    collateralTokenAddress: string;
    loanTokenAmountFilled: BigNumber;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<any> | TransactionObject<any>;
```

###### Arguments

`params.loanOrderHash` a unique hash representing the loan order

`params.collateralTokenAddress` desired address of the collateral the trader wants to use

`params.loanTokenAmountFilled` desired amount of loanToken the trader wants to borrow

`params.getObject` should this function return `TransactionObject` (`true`) or `Promise` (`false`)

`params.txOpts` web3 transaction options object (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise` or `TransactionObject` for `BigNumber` containing the total amount of loanToken borrowed

________________________________________________________________________________

##### takeLoanOrderOnChainAsLender

Take loan order created and signed by the trader and already located on-chain (partially filled).

```typescript
  takeLoanOrderOnChainAsLender(params: {
    loanOrderHash: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<any> | TransactionObject<any>;
```

###### Arguments

`params.loanOrderHash` a unique hash representing the loan order

`params.getObject` should this function return `TransactionObject` (`true`) or `Promise` (`false`)

`params.txOpts` web3 transaction options object (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise` or `TransactionObject` for `BigNumber` containing the total amount of loanToken borrowed

________________________________________________________________________________

##### getSingleLoan

Get the loan order current execution state.

```typescript
  getSingleLoan(params: { 
    loanOrderHash: string;
    trader: string 
  }): ILoanPositionState;
```

###### Arguments

`params.loanOrderHash` a unique hash representing the loan order

`params.trader` the address of the lender/trader in the loan order

###### Returns

`ILoanPositionState` which represents the current state of specified loan order

________________________________________________________________________________

##### getLoansForLender

Get the list of loan orders with current execution state filtered by lender `address`.

```typescript
  getLoansForLender(params: { 
    address: string; 
    count: number; 
    activeOnly: boolean 
  }): ILoanPositionState[];
```

###### Arguments

`params.address` the address of the lender in the loan order

`params.count` maximum number of loan orders to return

`params.activeOnly` should this function return loan orders in active only (`true`) or in any state (`false`)

###### Returns

An array of `ILoanPositionState` every item of which represents the current state of related loan order

________________________________________________________________________________

##### getLoansForTrader

Get the list of loan orders with current execution state filtered by trader `address`.

```typescript
  getLoansForTrader(params: { 
    address: string; 
    count: number; 
    activeOnly: boolean 
  }): ILoanPositionState[];
```

###### Arguments

`params.address` the address of the trader in the loan order

`params.count` maximum number of loan orders to return

`params.activeOnly` should this function return loan orders in active only (`true`) or in any state (`false`)

###### Returns

An array of `ILoanPositionState` every item of which represents the current state of related loan order

________________________________________________________________________________

##### getActiveLoans

Get the paginated list of active loan orders.

```typescript
  getActiveLoans(params: { 
    start: number; 
    count: number 
  }): ILoanOrderActive[];
```

###### Arguments

`params.start` starting number of the loan order in the list of active orders

`params.count` maximum number of loan orders to return

###### Returns

An array of `ILoanOrderActive` every item of which contains a unique hash representing the loan order, trader and expiration timestamp of the loan order

________________________________________________________________________________

##### getMarginLevels

Get current margin data for the loan order.

```typescript
  getMarginLevels(params: {
    loanOrderHash;
    trader;
  }): {
    initialMarginAmount: BigNumber;
    maintenanceMarginAmount: BigNumber;
    currentMarginAmount: BigNumber;
  };
```

###### Arguments

`params.loanOrderHash` a unique hash representing the loan order

`params.trader` the address of the trader in the loan order

###### Returns

`Object` with the next set of fields:

`initialMarginAmount` the initial margin percentage set on the loan order

`maintenanceMarginAmount` the maintenance margin percentage set on the loan order

`currentMarginAmount` the current margin percentage, representing the health of the loan (i.e., 54350000000000000000 == 54.35%)

________________________________________________________________________________

##### getProfitOrLoss

Get the current profit/loss data of the position.

```typescript
  getProfitOrLoss(params: {
    loanOrderHash: string;
    trader: string;
  }): {
    isProfit: boolean;
    profitOrLoss: BigNumber;
    positionTokenAddress: string;
  };
```

###### Arguments

`params.loanOrderHash` a unique hash representing the loan order

`params.trader` the address of the trader in the loan order

###### Returns

`Object` with the next set of fields:

`isProfit` `false` it there's a loss, `true` otherwise

`profitOrLoss` the amount of profit or the amount of loss (denominated in `positionToken`)

`positionTokenAddress` ERC20 contract address of the position token used in this order

________________________________________________________________________________

##### withdrawProfit

Withdraw profits, if any. This function should be called by the trader.

```typescript
  withdrawProfit(params: {
    loanOrderHash: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<BigNumber> | TransactionObject<BigNumber>;
```

###### Arguments

`params.loanOrderHash` a unique hash representing the loan order

`params.getObject` should this function return `TransactionObject` (`true`) or `Promise` (`false`)

`params.txOpts` web3 transaction options object (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise` or `TransactionObject` for `BigNumber` containing the amount of profit withdrawn denominated in `positionToken`

________________________________________________________________________________

##### getInterest

Get current interest data for the loan order.

```typescript
  getInterest(params: {
    loanOrderHash: string;
    traderAddress: string;
  }): {
    lender: string;
    interestTokenAddress: string;
    interestTotalAccrued: BigNumber;
    interestPaidSoFar: BigNumber;
  };
```

###### Arguments

`params.loanOrderHash` a unique hash representing the loan order

`params.traderAddress` the address of the trader in the loan order

###### Returns

`Object` with the next set of fields:

`lender` address of the lender in the loan order

`interestTokenAddress` ERC20 contract address of the interest token used in this order

`interestTotalAccrued` the total amount of interest that has been earned so far

`interestPaidSoFar` the amount of earned interest that has been withdrawn

________________________________________________________________________________

##### payInterest

Pay the lender of a loan the total amount of interest accrued for a loan.

```typescript
  payInterest(params: {
    loanOrderHash: string;
    trader: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<BigNumber> | TransactionObject<BigNumber>;
```

###### Arguments

`params.loanOrderHash` a unique hash representing the loan order

`params.trader` the address of the trader in the loan order

`params.getObject` should this function return `TransactionObject` (`true`) or `Promise` (`false`)

`params.txOpts` web3 transaction options object (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise` or `TransactionObject` for `BigNumber` containing the amount of interest paid out

________________________________________________________________________________

##### cancelLoanOrder

Cancels remaining (untaken) loan.

```typescript
  cancelLoanOrder(params: {
    order: ILoanOrderFillRequest;
    cancelLoanTokenAmount: BigNumber;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<BigNumber> | TransactionObject<BigNumber>;
```

###### Arguments

`params.order` signed loan order `ILoanOrderFillRequest`

`params.cancelLoanTokenAmount` the amount of remaining unloaned token to cancel

`params.getObject` should this function return `TransactionObject` (`true`) or `Promise` (`false`)

`params.txOpts` web3 transaction options object (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise` or `TransactionObject` for `BigNumber` containing the amount of loan token canceled

________________________________________________________________________________

##### cancelLoanOrderWithHash

Cancels remaining (untaken) loan.

```typescript
  cancelLoanOrderWithHash(params: {
    loanOrderHash: string;
    cancelLoanTokenAmount: BigNumber;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<BigNumber> | TransactionObject<BigNumber>;
```

###### Arguments

`params.loanOrderHash` a unique hash representing the loan order

`params.cancelLoanTokenAmount` the amount of remaining unloaned token to cancel

`params.getObject` should this function return `TransactionObject` (`true`) or `Promise` (`false`)

`params.txOpts` web3 transaction options object (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise` or `TransactionObject` for `BigNumber` containing the amount of loan token canceled

________________________________________________________________________________

##### closeLoan

Called by the trader to close their loan early.

```typescript
  closeLoan(params: {
    loanOrderHash: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<boolean> | TransactionObject<boolean>;
```

###### Arguments

`params.loanOrderHash` a unique hash representing the loan order

`params.getObject` should this function return `TransactionObject` (`true`) or `Promise` (`false`)

`params.txOpts` web3 transaction options object (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise` or `TransactionObject` for `boolean` value indicating if the operation succeeded

________________________________________________________________________________

##### liquidateLoan

Checks that a position meets the conditions for liquidation, then closes the position and loan.

If called by `trader` himself, calls `closeLoan`.

```typescript
  liquidateLoan(params: {
    loanOrderHash: string;
    trader: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<boolean> | TransactionObject<boolean>;
```

###### Arguments

`params.loanOrderHash` a unique hash representing the loan order

`params.trader` the trader of the position

`params.getObject` should this function return `TransactionObject` (`true`) or `Promise` (`false`)

`params.txOpts` web3 transaction options object (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise` or `TransactionObject` for `boolean` value indicating if the operation succeeded

#### Collateral

________________________________________________________________________________

##### getInitialCollateralRequired

Calculates the initial collateral required to open the loan.

```typescript
  getInitialCollateralRequired(
    loanTokenAddress: string,
    collateralTokenAddress: string,
    oracleAddress: string,
    loanTokenAmountFilled: BigNumber,
    initialMarginAmount: BigNumber
  ): Promise<BigNumber>;
```

###### Arguments

`loanTokenAddress` the collateral token used by the trader

`collateralTokenAddress` desired address of the collateral the trader wants to use

`oracleAddress` the oracle address specified in the loan order

`loanTokenAmountFilled` the amount of loan token borrowed

`initialMarginAmount` the initial margin percentage amount (i.e. 50 == 50%)

###### Returns

`Promise` for `BigNumber` containing the minimum collateral requirement to open the loan

________________________________________________________________________________

##### changeCollateral

Change the collateral token being used for a loan.

This function will transfer in the initial margin requirement of the new token and the old token will be refunded to the trader.

```typescript
  changeCollateral(params: {
    loanOrderHash: string;
    collateralTokenFilled: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<boolean> | TransactionObject<boolean>;
```

###### Arguments

`params.loanOrderHash` a unique hash representing the loan order

`params.collateralTokenFilled` the address of the collateral token used

`params.getObject` should this function return `TransactionObject` (`true`) or `Promise` (`false`)

`params.txOpts` web3 transaction options object (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise` or `TransactionObject` for `boolean` value indicating if the operation succeeded

________________________________________________________________________________

##### depositCollateral

Increase the collateral for a loan.

```typescript
  depositCollateral(params: {
    loanOrderHash: string;
    collateralTokenFilled: string;
    depositAmount: BigNumber;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<BigNumber> | TransactionObject<BigNumber>;
```

###### Arguments

`params.loanOrderHash` a unique hash representing the loan order

`params.collateralTokenFilled` the address of the collateral token used

`params.depositAmount` the amount of additional collateral token to deposit.

`params.getObject` should this function return `TransactionObject` (`true`) or `Promise` (`false`)

`params.txOpts` web3 transaction options object (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise` or `TransactionObject` for `BigNumber` containing the amount of additional collateral token to deposit.

________________________________________________________________________________

##### withdrawExcessCollateral

Allows the trader to withdraw excess collateral for a loan.

Excess collateral is any amount above the initial margin.

```typescript
  withdrawExcessCollateral(params: {
    loanOrderHash: string;
    collateralTokenFilled: string;
    withdrawAmount: BigNumber;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<BigNumber> | TransactionObject<BigNumber>;
```

###### Arguments

`params.loanOrderHash` a unique hash representing the loan order

`params.collateralTokenFilled` the address of the collateral token used

`params.withdrawAmount` the amount of excess collateral token to withdraw

`params.getObject` should this function return `TransactionObject` (`true`) or `Promise` (`false`)

`params.txOpts` web3 transaction options object (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise` for `BigNumber` containing actual amount withdrawn

#### Trade

________________________________________________________________________________

##### tradePositionWith0x

Execute a 0x trade using loaned funds.

```typescript
  tradePositionWith0x(params: {
    order0x: IZeroExOrder;
    orderHashBZx: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<string> | TransactionObject<string>;
```

###### Arguments

`params.order0x` ZeroEx (c) trade order description

`params.orderHashBZx` a unique hash representing the loan order

`params.getObject` should this function return `TransactionObject` (`true`) or `Promise` (`false`)

`params.txOpts` web3 transaction options object (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise` or `TransactionObject` for `string` containing transaction id

________________________________________________________________________________

##### tradePositionWithOracle

Execute a market order trade using the oracle contract specified in the loan referenced by `orderHash`.

```typescript
  tradePositionWithOracle(params: {
    orderHash: string;
    tradeTokenAddress: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<string> | TransactionObject<string>;
```

###### Arguments

`params.orderHash` a unique hash representing the loan order

`params.tradeTokenAddress` ERC20 contract address of the token to buy in the trade

`params.getObject` should this function return `TransactionObject` (`true`) or `Promise` (`false`)

`params.txOpts` web3 transaction options object (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise` or `TransactionObject` for `string` containing transaction id

________________________________________________________________________________

#### ETH/WETH

________________________________________________________________________________

##### wrapEth

Converts ETH to WETH Tokens.

```typescript
  wrapEth(params: {
    amount: BigNumber;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<string> | TransactionObject<string>;
```

###### Arguments

`params.amount` amount of ETH to convert to WETH

`params.getObject` should this function return `TransactionObject` (`true`) or `Promise` (`false`)

`params.txOpts` web3 transaction options object (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise` or `TransactionObject` for `string` containing transaction id

________________________________________________________________________________

##### unwrapEth

Converts ETH to WETH Tokens.

```typescript
  unwrapEth(params: {
    amount: BigNumber;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<string> | TransactionObject<string>;
```

###### Arguments

`params.amount` amount of WETH to convert to ETH

`params.getObject` should this function return `TransactionObject` (`true`) or `Promise` (`false`)

`params.txOpts` web3 transaction options object (`from`, `gasPrice`, `gas` etc.)

###### Returns

`string` containing transaction id

#### Utils

________________________________________________________________________________

##### generatePseudoRandomSalt

Static method that generates a pseudo-random UINT256 number.

```typescript
  static generatePseudoRandomSalt(): BigNumber;
```

###### Arguments

None

###### Returns

`BigNumber` instance

________________________________________________________________________________

##### getBalance

Get balance of specific ERC20 token at `ownerAddress`

```typescript
  getBalance(params: { tokenAddress: string; ownerAddress: string }): BigNumber;
```

###### Arguments

`tokenAddress` address of token ERC20 contract
`ownerAddress` address tokens' owner

###### Returns

`BigNumber` instance

________________________________________________________________________________

##### noop

Static method that does nothing. Just an empty function.

```typescript
  static noop(): void;
```

###### Arguments

None

###### Returns

Nothing

________________________________________________________________________________

##### requestFaucetToken

Request test token transfer `receiverAddress`.

```typescript
  requestFaucetToken(params: {
    tokenAddress: string;
    receiverAddress: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<boolean> | TransactionObject<boolean>;
```

###### Arguments

`params.tokenAddress` an address of token ERC20 contract

`params.receiverAddress` recipient wallet address

`params.getObject` should this function return `TransactionObject` (`true`) or `Promise` (`false`)

`params.txOpts` web3 transaction options object (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise` or `TransactionObject` for `boolean` value indicating if the operation succeeded

________________________________________________________________________________

##### toChecksumAddress

Will convert an upper or lowercase Ethereum address to a checksum address.

```typescript
  static toChecksumAddress(address: string): string;
```

###### Arguments

`address` an address string

###### Returns

The checksum address `string`

________________________________________________________________________________

##### transferToken

Transfers specified amount of tokens to `to address` address.

```typescript
  transferToken(params: {
    tokenAddress: string;
    to: string;
    amount: BigNumber;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<boolean> | TransactionObject<boolean>;
```

###### Arguments

`params.tokenAddress` an address of token ERC20 contract

`params.to` recipient wallet address

`params.amount` amount of tokens to transfer

`params.getObject` should this function return `TransactionObject` (`true`) or `Promise` (`false`)

`params.txOpts` web3 transaction options object (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise` or `TransactionObject` for `boolean` value indicating if the operation succeeded

### Structures

________________________________________________________________________________

##### ITokenDescription

```typescript
export declare interface ITokenDescription {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  url: string;
}
```
________________________________________________________________________________

##### IOracleDescription

```typescript
export declare interface IOracleDescription {
  address: string;
  name: string;
}
```
________________________________________________________________________________

##### ILoanOrderActive

```typescript
export declare interface ILoanOrderActive {
  loanOrderHash: string;
  trader: string;
  loanEndUnixTimestampSec: number;
}

```
________________________________________________________________________________

##### ILoanOrderFillable

```typescript
export declare interface ILoanOrderFillable {
  makerAddress: string;
  loanTokenAddress: string;
  interestTokenAddress: string;
  collateralTokenAddress: string;
  feeRecipientAddress: string;
  oracleAddress: string;
  loanTokenAmount: BigNumber;
  interestAmount: BigNumber;
  initialMarginAmount: BigNumber;
  maintenanceMarginAmount: BigNumber;
  lenderRelayFee: BigNumber;
  traderRelayFee: BigNumber;
  maxDurationUnixTimestampSec: number;
  expirationUnixTimestampSec: number;
  loanOrderHash: string;
  lender: string;
  orderFilledAmount: BigNumber;
  orderCancelledAmount: BigNumber;
  orderTraderCount: number;
  addedUnixTimestampSec: number;
}
```
________________________________________________________________________________

##### ILoanOrderFillRequest

```typescript
export declare interface ILoanOrderFillRequest {
  makerAddress: string;
  loanTokenAddress: string;
  interestTokenAddress: string;
  collateralTokenAddress: string;
  feeRecipientAddress: string;
  oracleAddress: string;
  loanTokenAmount: BigNumber;
  interestAmount: BigNumber;
  initialMarginAmount: BigNumber;
  maintenanceMarginAmount: BigNumber;
  lenderRelayFee: BigNumber;
  traderRelayFee: BigNumber;
  maxDurationUnixTimestampSec: number;
  expirationUnixTimestampSec: number;
  makerRole: number;
  salt: string;
  signature: string;
}
```
________________________________________________________________________________

##### ILoanPositionState

```typescript
export declare interface ILoanPositionState {
  lender: string;
  trader: string;
  collateralTokenAddressFilled: string;
  positionTokenAddressFilled: string;
  loanTokenAddress: string;
  interestTokenAddress: string;
  loanTokenAmountFilled: BigNumber;
  collateralTokenAmountFilled: BigNumber;
  positionTokenAmountFilled: BigNumber;
  loanStartUnixTimestampSec: number;
  loanEndUnixTimestampSec: number;
  active: boolean;
  interestTotalAccrued: BigNumber;
  interestPaidSoFar: BigNumber;
  loanOrderHash: string;
}
```
________________________________________________________________________________

##### IZeroExOrder

```typescript
export declare interface IZeroExOrder {
  signedOrder: any;
  exchangeContractAddress: string;
  expirationUnixTimestampSec: number;
  feeRecipient: string;
  maker: string;
  makerFee: number;
  makerTokenAddress: string;
  makerTokenAmount: number;
  salt: string;
  taker: string;
  takerFee: number;
  takerTokenAddress: string;
  takerTokenAmount: number;
}
```
________________________________________________________________________________

