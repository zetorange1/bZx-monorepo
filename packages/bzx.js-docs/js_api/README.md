# JavaScript API

This documentation section contains the description of JavaScript API provided by the bzx.js library.

bzx.js is the library for interaction with the bZx protocol.

This library provides a way for interaction with the bZx smart contracts, and helper functions.

### Glossary

**Decentralized exchange (DEX)** is an exchange market that does not rely on a third-party service to hold the customer's funds. Instead, trades occur directly between users (peer to peer) through an automated process (https://www.cryptocompare.com/exchanges/guides/what-is-a-decentralized-exchange/).

**Trade order** is an order to exchange to move funds between users' accounts.

**Loan order** is an order to the lending platform to take the lender's funds and provide the borrower with that funds directly or indirectly.

**Orderbook** is the place, where users can publish their orders.

**Relayer** is a person or entity, which hosts off-chain orderbook.

**Long position** is an exchange deal, which has the intent to get some funds in exchange for another, and then to own new funds.

**Short position** is an exchange deal, which has the intent to get some funds in exchange for another, but to own them just for a short period, until price changes and funds would be sold with the profit.

**Collateral** is an asset that a borrower offers as a way for a lender to secure the loan.

**Margin trading** is usage of the borrowed funds when trading in a short position with the goal to increase profits while also increasing risks.

**Margin call** is a situation, when trader, who uses margin trading loses his own funds (collateral) in a short position, and market forces close of trader’s short position.

**Swap provider** is an external to the bZx platform DEX that can be used for trade orders execution.

**Liquidity source** is a funds reserve, that gives ability to execute orders (event unexpected).

**Liquidity provider** is a connection to source of liquidity, that provides ability to execute deals on side of liquidity source.

**Price feed provider** on-chain source of exchange rates.

**WETH** wrapped ETH. This is ERC20 token, which represents ETH. It's needed for trading ETH in the same way as any other ERC20 token. More at https://weth.io/.

### Roles

**Order Maker** is the person, who proposes the deal on the decentralized exchange or the decentralized lending platform.

**Order Taker** is the person, who accepts the deal on the decentralized exchange or the decentralized lending platform.

**Lender** is the person who wants to provide possesed funds for usage by another party while getting it’s interest from deals with these money.

**Borrower** is the person who wants to get another's party’s funds for usage in that person’s deals.

**Trader** is the person who trades funds on exchange.

**Bounty hunter** is the person or application who monitors current orders and initiates margin calls.

### Instance

________________________________________________________________________________

##### Constructor

Creates an instance of BZxJS.

```typescript
  constructor(
    web3: Web3,
    params: { networkId: number; addresses?: string[] }
  );
```

###### Arguments

`web3` web3 instance

`params.networkid` id of the network to connect (for example `3` for `ropsten`)

`params.addresses` a map containing the bZx contracts addresses in the specified network

###### Returns

`BZxJS` instance

### Methods

________________________________________________________________________________

#### Allowance

________________________________________________________________________________

##### getAllowance

Get the amount of tokens at `params.tokenAddress` granted to withdraw by `params.spenderAddress` from `params.ownerAddress`.

```typescript
  getAllowance(params: {
    tokenAddress: string;
    ownerAddress: string;
    spenderAddress: string;
  }): Promise<BigNumber>;
```

###### Arguments

`params.tokenAddress` ERC20 contract address of the token

`params.ownerAddress` address of the owner of the tokens - wallet who grants right to withdraw tokens

`params.spenderAddress` address of the spender of the tokens - wallet who gets right to withdraw tokens

###### Returns

`BigNumber` value indicating tokens amount allowed to withdraw

________________________________________________________________________________

##### setAllowance

Allow `params.spenderAddress` to withdraw tokens at `params.tokenAddress` from `params.ownerAddress`, multiple times, up to the `params.amountInBaseUnits` amount.

```typescript
  setAllowance(params: {
    tokenAddress: string;
    ownerAddress: string;
    spenderAddress: string;
    amountInBaseUnits: BigNumber | string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;
```

###### Arguments

`params.tokenAddress` ERC20 contract address of the token

`params.ownerAddress` address of the owner of the tokens - wallet who grants right to use tokens

`params.spenderAddress` address of the spender of the tokens - wallet who gets right to use tokens

`params.amountInBaseUnits` amount of tokens that are allowed to use

`params.getObject` should this function return `Promise<TransactionReceipt>` (`false`) or `TransactionObject<TransactionReceipt>` (`true`)

`params.txOpts` web3 transaction options object (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise<TransactionReceipt>` or `TransactionObject<TransactionReceipt>`

________________________________________________________________________________

##### setAllowanceUnlimited

Allow `params.spenderAddress` to withdraw tokens from `params.ownerAddress`, multiple times, without the limit.

```typescript
  setAllowanceUnlimited(params: {
    tokenAddress: string;
    ownerAddress: string;
    spenderAddress: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;
```

###### Arguments

`params.tokenAddress` ERC20 contract address of the token

`params.ownerAddress` address of the owner of the tokens - wallet who grants right to use tokens

`params.spenderAddress` address of the spender of the tokens - wallet who gets right to use tokens

`params.getObject` should this function return `Promise<TransactionReceipt>` (`false`) or `TransactionObject<TransactionReceipt>` (`true`)

`params.txOpts` web3 transaction options object (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise<TransactionReceipt>` or `TransactionObject<TransactionReceipt>`

________________________________________________________________________________

##### resetAllowance

Disallow `params.spenderAddress` to withdraw tokens from `params.ownerAddress`.

```typescript
  resetAllowance(params: {
    tokenAddress: string;
    ownerAddress: string;
    spenderAddress: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;
```

###### Arguments

`params.tokenAddress` ERC20 contract address of the token

`params.ownerAddress` address of the owner of the tokens - wallet who grants right to use tokens

`params.spenderAddress` address of the spender of the tokens - wallet who gets right to use tokens

`params.getObject` should this function return `Promise<TransactionReceipt>` (`false`) or `TransactionObject<TransactionReceipt>` (`true`)

`params.txOpts` web3 transaction options object (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise<TransactionReceipt>` or `TransactionObject<TransactionReceipt>`

#### Hash

________________________________________________________________________________

##### getLoanOrderHashHex

Calculate Keccak-256 hash of loan order with specified parameters.

```typescript
  getLoanOrderHashHex(order: ILoanOrderFillRequest): string;
```

###### Arguments

`order` loan order

###### Returns

Hash value `string`

________________________________________________________________________________

##### getLoanOrderHashAsync

Calculate Keccak-256 hash of order with specified parameters.

```typescript
  getLoanOrderHashAsync(order: ILoanOrderFillRequest): Promise<string>;
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
  static isValidSignature(params: {
    account: string,
    orderHash: string,
    signature: string
  }): boolean;
```

###### Arguments

`params.account` account who signed the loan order hash

`params.orderHash` loan order hash

`params.signature` loan order signature

###### Returns

`boolean` value indicating if the signature is valid

________________________________________________________________________________

##### isValidSignatureAsync

Check order hash signature validity.

```typescript
  isValidSignatureAsync(params: {
    account: string,
    orderHash: string,
    signature: string
  }): Promise<boolean>;
```

###### Arguments

`params.account` account who signed the loan order hash

`params.orderHash` loan order hash

`params.signature` loan order signature

###### Returns

`Promise` for `boolean` value indicating if the signature is valid

#### Exchange

________________________________________________________________________________

##### getTokenList

Provide metadata for all registered tokens.

```typescript
  getTokenList(): Promise<ITokenDescription[]>;
```

###### Arguments

None

###### Returns

`Promise` for an array of `ITokenDescription`

________________________________________________________________________________

##### getOracleList

Provide metadata for all registered oracles.

```typescript
  getOracleList(): Promise<IOracleDescription[]>;
```

###### Arguments

None

###### Returns

`Promise` for an array of `IOracleDescription`

________________________________________________________________________________

##### isTradeSupported

Check if specified `params.oracleAddress` supports exchange operation of provided tokens.

```typescript
  isTradeSupported(params: { 
    sourceTokenAddress: string; 
    sourceTokenAmount: string;
    destTokenAddress: string; 
    oracleAddress: string;
  }): Promise<boolean>;
```

###### Arguments

`sourceTokenAddress` address of source token's ERC20 contract

`sourceTokenAmount` amount of source tokens to exchange

`destTokenAddress` address of destination token's ERC20 contract

`oracleAddress` address of the oracle to check tokens pair support

###### Returns

`Promise` for `boolean` value indicating if oracle is able to make exchange operation between tokens

________________________________________________________________________________

##### getConversionData

Get terms of exchange operation between tokens in the specific amount using selected oracle.

```typescript
  getConversionData(params: {
    sourceTokenAddress: string;
    sourceTokenAmount: string;
    destTokenAddress: string;
    oracleAddress: string;
  }): Promise<IConversionData>;
```

###### Arguments

`sourceTokenAddress` address of source token's ERC20 contract

`sourceTokenAmount` amount of source tokens to exchange

`destTokenAddress` address of destination token's ERC20 contract

`oracleAddress` address of oracle to check tokens pair support

###### Returns

`Promise` for `IConversionData` value containing exchange rate and available amount of tokens for exchange

#### Loan orders

________________________________________________________________________________

##### getSingleOrder

Get single loan order by it's `params.loanOrderHash`.

```typescript
  getSingleOrder(params: { 
    loanOrderHash: string 
  }): Promise<ILoanOrderFillable>;
```

###### Arguments

`params.loanOrderHash` a unique hash representing the loan order

###### Returns

`Promise` for `ILoanOrderFillable` which represents the current fill state of specified loan order

________________________________________________________________________________

##### getOrdersFillable

Get the list of loan orders that are available for taking.

```typescript
  getOrdersFillable(params: { 
    start: number; 
    count: number 
  }): Promise<ILoanOrderFillable[]>;
```

###### Arguments

`params.start` starting number of the loan order in the list of orders that are available for taking

`params.count` maximum number of loan orders to return

###### Returns

`Promise` for an array of `ILoanOrderFillable` every item of which represents the current fill state of specified loan order

________________________________________________________________________________

##### getOrdersForUser

Return the list of loan orders filtered by specified `params.loanPartyAddress`.

```typescript
  getOrdersForUser(params: {
    loanPartyAddress: string; 
    start: number;
    count: number
  }): Promise<ILoanOrderFillable[]>;
```

###### Arguments

`params.loanPartyAddress` the address of the lender/trader in the loan order

`params.start` starting number of the loan order in the list of orders

`params.count` maximum number of loan orders to return

###### Returns

`Promise` for an array of `ILoanOrderFillable` every item of which represents the current fill state of specified loan order

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
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;
```

###### Arguments

`params.order` signed loan order `ILoanOrderFillRequest`

`params.collateralTokenAddress` desired address of the collateral the trader wants to use

`params.loanTokenAmountFilled` desired amount of loanToken the trader wants to borrow

`params.getObject` should this function return `Promise<TransactionReceipt>` (`false`) or `TransactionObject<TransactionReceipt>` (`true`)

`params.txOpts` web3 transaction options object (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise<TransactionReceipt>` or `TransactionObject<TransactionReceipt>`

________________________________________________________________________________

##### takeLoanOrderAsLender

Take loan order created and signed by the trader and push it on-chain.

```typescript
  takeLoanOrderAsLender(params: {
    order: ILoanOrderFillRequest;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;
```

###### Arguments

`params.order` signed loan order `ILoanOrderFillRequest`

`params.getObject` should this function return `Promise<TransactionReceipt>` (`false`) or `TransactionObject<TransactionReceipt>` (`true`)

`params.txOpts` web3 transaction options object (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise<TransactionReceipt>` or `TransactionObject<TransactionReceipt>`

________________________________________________________________________________

##### pushLoanOrderOnChain

Push signed loan order on-chain.

```typescript
  pushLoanOrderOnChain(params: {
    order: ILoanOrderFillRequest;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;
```

###### Arguments

`params.order` signed loan order `ILoanOrderFillRequest`

`params.getObject` should this function return `Promise<TransactionReceipt>` (`false`) or `TransactionObject<TransactionReceipt>` (`true`)

`params.txOpts` web3 transaction options object (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise<TransactionReceipt>` or `TransactionObject<TransactionReceipt>`

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
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;
```

###### Arguments

`params.loanOrderHash` a unique hash representing the loan order

`params.collateralTokenAddress` desired address of the collateral the trader wants to use

`params.loanTokenAmountFilled` desired amount of loanToken the trader wants to borrow

`params.getObject` should this function return `Promise<TransactionReceipt>` (`false`) or `TransactionObject<TransactionReceipt>` (`true`)

`params.txOpts` web3 transaction options object (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise<TransactionReceipt>` or `TransactionObject<TransactionReceipt>`

________________________________________________________________________________

##### takeLoanOrderOnChainAsLender

Take loan order created and signed by the trader and already located on-chain (partially filled).

```typescript
  takeLoanOrderOnChainAsLender(params: {
    loanOrderHash: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;
```

###### Arguments

`params.loanOrderHash` a unique hash representing the loan order

`params.getObject` should this function return `Promise<TransactionReceipt>` (`false`) or `TransactionObject<TransactionReceipt>` (`true`)

`params.txOpts` web3 transaction options object (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise<TransactionReceipt>` or `TransactionObject<TransactionReceipt>`

________________________________________________________________________________

##### getSingleLoan

Get the loan order current execution state.

```typescript
  getSingleLoan(params: { 
    loanOrderHash: string;
    trader: string 
  }): Promise<ILoanPositionState>;
```

###### Arguments

`params.loanOrderHash` a unique hash representing the loan order

`params.trader` the address of the lender/trader in the loan order

###### Returns

`Promise` for `ILoanPositionState` which represents the current state of specified loan order

________________________________________________________________________________

##### getLoansForLender

Get the list of loan orders with current execution state filtered by lender `params.address`.

```typescript
  getLoansForLender(params: { 
    address: string; 
    count: number; 
    activeOnly: boolean 
  }): Promise<ILoanPositionState[]>;
```

###### Arguments

`params.address` the address of the lender in the loan order

`params.count` maximum number of loan orders to return

`params.activeOnly` should this function return loan orders in active only (`true`) or in any state (`false`)

###### Returns

`Promise` for an array of `ILoanPositionState` every item of which represents the current state of related loan order

________________________________________________________________________________

##### getLoansForTrader

Get the list of loan orders with current execution state filtered by trader `params.address`.

```typescript
  getLoansForTrader(params: { 
    address: string; 
    count: number; 
    activeOnly: boolean 
  }): Promise<ILoanPositionState[]>;
```

###### Arguments

`params.address` the address of the trader in the loan order

`params.count` maximum number of loan orders to return

`params.activeOnly` should this function return loan orders in active only (`true`) or in any state (`false`)

###### Returns

`Promise` for an array of `ILoanPositionState` every item of which represents the current state of related loan order

________________________________________________________________________________

##### getActiveLoans

Get the paginated list of active loan orders.

```typescript
  getActiveLoans(params: { 
    start: number; 
    count: number 
  }): Promise<ILoanOrderActive[]>;
```

###### Arguments

`params.start` starting number of the loan order in the list of active orders

`params.count` maximum number of loan orders to return

###### Returns

`Promise` for an array of `ILoanOrderActive` every item of which contains a unique hash representing the loan order, trader and expiration timestamp of the loan order

________________________________________________________________________________

##### getMarginLevels

Get current margin data for the loan order.

```typescript
  getMarginLevels(params: {
    loanOrderHash: string;
    trader: string;
  }): Promise<IMarginLevel>;
```

###### Arguments

`params.loanOrderHash` a unique hash representing the loan order

`params.trader` the address of the trader in the loan order

###### Returns

`Promise` for `IMarginLevel` which represents current state of margin of the loan order

________________________________________________________________________________

##### getProfitOrLoss

Get the current profit/loss data of the position.

```typescript
  getProfitOrLoss(params: {
    loanOrderHash: string;
    trader: string;
  }): Promise<IProfitStatus>;
```

###### Arguments

`params.loanOrderHash` a unique hash representing the loan order

`params.trader` the address of the trader in the loan order

###### Returns

`Promise` for `IProfitStatus` which represents current state of profits/losses of the loan order

________________________________________________________________________________

##### withdrawProfit

Withdraw profits, if any. This function should be called by the trader.

```typescript
  withdrawProfit(params: {
    loanOrderHash: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;
```

###### Arguments

`params.loanOrderHash` a unique hash representing the loan order

`params.getObject` should this function return `Promise<TransactionReceipt>` (`false`) or `TransactionObject<TransactionReceipt>` (`true`)

`params.txOpts` web3 transaction options object (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise<TransactionReceipt>` or `TransactionObject<TransactionReceipt>`

________________________________________________________________________________

##### getInterest

Get current interest data for the loan order.

```typescript
  getInterest(params: {
    loanOrderHash: string;
    trader: string;
  }): Promise<IInterestStatus>;
```

###### Arguments

`params.loanOrderHash` a unique hash representing the loan order

`params.trader` the address of the trader in the loan order

###### Returns

`Promise` for `IInterestStatus` which represents current state of interests of the loan order

________________________________________________________________________________

##### payInterest

Pay the lender of a loan the total amount of interest accrued for a loan.

```typescript
  payInterest(params: {
    loanOrderHash: string;
    trader: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;
```

###### Arguments

`params.loanOrderHash` a unique hash representing the loan order

`params.trader` the address of the trader in the loan order

`params.getObject` should this function return `Promise<TransactionReceipt>` (`false`) or `TransactionObject<TransactionReceipt>` (`true`)

`params.txOpts` web3 transaction options object (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise<TransactionReceipt>` or `TransactionObject<TransactionReceipt>`

________________________________________________________________________________

##### cancelLoanOrder

Cancels remaining (untaken) loan.

```typescript
  cancelLoanOrder(params: {
    order: ILoanOrderFillRequest;
    cancelLoanTokenAmount: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;
```

###### Arguments

`params.order` signed loan order `ILoanOrderFillRequest`

`params.cancelLoanTokenAmount` the amount of remaining unloaned token to cancel

`params.getObject` should this function return `Promise<TransactionReceipt>` (`false`) or `TransactionObject<TransactionReceipt>` (`true`)

`params.txOpts` web3 transaction options object (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise<TransactionReceipt>` or `TransactionObject<TransactionReceipt>`

________________________________________________________________________________

##### cancelLoanOrderWithHash

Cancels remaining (untaken) loan.

```typescript
  cancelLoanOrderWithHash(params: {
    loanOrderHash: string;
    cancelLoanTokenAmount: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;
```

###### Arguments

`params.loanOrderHash` a unique hash representing the loan order

`params.cancelLoanTokenAmount` the amount of remaining unloaned token to cancel

`params.getObject` should this function return `Promise<TransactionReceipt>` (`false`) or `TransactionObject<TransactionReceipt>` (`true`)

`params.txOpts` web3 transaction options object (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise<TransactionReceipt>` or `TransactionObject<TransactionReceipt>`

________________________________________________________________________________

##### closeLoan

Called by the trader to close their loan early.

```typescript
  closeLoan(params: {
    loanOrderHash: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;
```

###### Arguments

`params.loanOrderHash` a unique hash representing the loan order

`params.getObject` should this function return `Promise<TransactionReceipt>` (`false`) or `TransactionObject<TransactionReceipt>` (`true`)

`params.txOpts` web3 transaction options object (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise<TransactionReceipt>` or `TransactionObject<TransactionReceipt>`

________________________________________________________________________________

##### liquidateLoan

Checks that a position meets the conditions for liquidation, then closes the position and loan.

If called by `params.trader` himself, calls `closeLoan`.

```typescript
  liquidateLoan(params: {
    loanOrderHash: string;
    trader: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;
```

###### Arguments

`params.loanOrderHash` a unique hash representing the loan order

`params.trader` the trader of the position

`params.getObject` should this function return `Promise<TransactionReceipt>` (`false`) or `TransactionObject<TransactionReceipt>` (`true`)

`params.txOpts` web3 transaction options object (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise<TransactionReceipt>` or `TransactionObject<TransactionReceipt>`

#### Collateral

________________________________________________________________________________

##### getInitialCollateralRequired

Calculates the initial collateral required to open the loan.

```typescript
  getInitialCollateralRequired(
    loanTokenAddress: string,
    collateralTokenAddress: string,
    oracleAddress: string,
    loanTokenAmountFilled: string,
    initialMarginAmount: string
  ): Promise<string>;
```

###### Arguments

`loanTokenAddress` the collateral token used by the trader

`collateralTokenAddress` desired address of the collateral the trader wants to use

`oracleAddress` the oracle address specified in the loan order

`loanTokenAmountFilled` the amount of loan token borrowed

`initialMarginAmount` the initial margin percentage amount (i.e. 50 == 50%)

###### Returns

`Promise` for `string` containing the minimum collateral requirement to open the loan

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
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;
```

###### Arguments

`params.loanOrderHash` a unique hash representing the loan order

`params.collateralTokenFilled` the address of the collateral token used

`params.getObject` should this function return `Promise<TransactionReceipt>` (`false`) or `TransactionObject<TransactionReceipt>` (`true`)

`params.txOpts` web3 transaction options object (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise<TransactionReceipt>` or `TransactionObject<TransactionReceipt>`

________________________________________________________________________________

##### depositCollateral

Increase the collateral for a loan.

```typescript
  depositCollateral(params: {
    loanOrderHash: string;
    collateralTokenFilled: string;
    depositAmount: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;
```

###### Arguments

`params.loanOrderHash` a unique hash representing the loan order

`params.collateralTokenFilled` the address of the collateral token used

`params.depositAmount` the amount of additional collateral token to deposit.

`params.getObject` should this function return `Promise<TransactionReceipt>` (`false`) or `TransactionObject<TransactionReceipt>` (`true`)

`params.txOpts` web3 transaction options object (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise<TransactionReceipt>` or `TransactionObject<TransactionReceipt>`

________________________________________________________________________________

##### withdrawExcessCollateral

Allows the trader to withdraw excess collateral for a loan.

Excess collateral is any amount above the initial margin.

```typescript
  withdrawExcessCollateral(params: {
    loanOrderHash: string;
    collateralTokenFilled: string;
    withdrawAmount: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;
```

###### Arguments

`params.loanOrderHash` a unique hash representing the loan order

`params.collateralTokenFilled` the address of the collateral token used

`params.withdrawAmount` the amount of excess collateral token to withdraw

`params.getObject` should this function return `Promise<TransactionReceipt>` (`false`) or `TransactionObject<TransactionReceipt>` (`true`)

`params.txOpts` web3 transaction options object (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise<TransactionReceipt>` or `TransactionObject<TransactionReceipt>`

#### Trade

________________________________________________________________________________

##### tradePositionWith0x

Execute a 0x trade using loaned funds.

```typescript
  tradePositionWith0x(params: {
    order0x: IZeroExTradeRequest;
    orderHashBZx: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;
```

###### Arguments

`params.order0x` ZeroEx (c) trade order description

`params.orderHashBZx` a unique hash representing the loan order

`params.getObject` should this function return `Promise<TransactionReceipt>` (`false`) or `TransactionObject<TransactionReceipt>` (`true`)

`params.txOpts` web3 transaction options object (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise<TransactionReceipt>` or `TransactionObject<TransactionReceipt>`

________________________________________________________________________________

##### tradePositionWith0xV2

Execute a 0x trade using loaned funds on 0x V2 protocol network.

```typescript
  tradePositionWith0x(params: {
    order0x: IZeroExV2TradeRequest;
    orderHashBZx: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;
```

###### Arguments

`params.order0x` ZeroEx (c) trade order description

`params.orderHashBZx` a unique hash representing the loan order

`params.getObject` should this function return `Promise<TransactionReceipt>` (`false`) or `TransactionObject<TransactionReceipt>` (`true`)

`params.txOpts` web3 transaction options object (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise<TransactionReceipt>` or `TransactionObject<TransactionReceipt>`

________________________________________________________________________________

##### tradePositionWithOracle

Execute a market order trade using the oracle contract specified in the loan referenced by `params.orderHash`.

```typescript
  tradePositionWithOracle(params: {
    orderHash: string;
    tradeTokenAddress: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;
```

###### Arguments

`params.orderHash` a unique hash representing the loan order

`params.tradeTokenAddress` ERC20 contract address of the token to buy in the trade

`params.getObject` should this function return `Promise<TransactionReceipt>` (`false`) or `TransactionObject<TransactionReceipt>` (`true`)

`params.txOpts` web3 transaction options object (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise<TransactionReceipt>` or `TransactionObject<TransactionReceipt>`

________________________________________________________________________________

#### ETH/WETH

________________________________________________________________________________

##### wrapEth

Converts ETH to WETH Tokens.

```typescript
  wrapEth(params: {
    amount: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;
```

###### Arguments

`params.amount` amount of ETH to convert to WETH

`params.getObject` should this function return `Promise<TransactionReceipt>` (`false`) or `TransactionObject<TransactionReceipt>` (`true`)

`params.txOpts` web3 transaction options object (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise<TransactionReceipt>` or `TransactionObject<TransactionReceipt>`

________________________________________________________________________________

##### unwrapEth

Converts ETH to WETH Tokens.

```typescript
  unwrapEth(params: {
    amount: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;
```

###### Arguments

`params.amount` amount of WETH to convert to ETH

`params.getObject` should this function return `Promise<TransactionReceipt>` (`false`) or `TransactionObject<TransactionReceipt>` (`true`)

`params.txOpts` web3 transaction options object (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise<TransactionReceipt>` or `TransactionObject<TransactionReceipt>`

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

Get balance of specific ERC20 token at `params.ownerAddress`

```typescript
  getBalance(params: { tokenAddress: string; ownerAddress: string }): Promise<BigNumber>;
```

###### Arguments

`tokenAddress` address of token ERC20 contract
`ownerAddress` address tokens' owner

###### Returns

`Promise` for `BigNumber` instance

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

Request test token transfer `params.receiverAddress`.

```typescript
  requestFaucetToken(params: {
    tokenAddress: string;
    receiverAddress: string;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;
```

###### Arguments

`params.tokenAddress` an address of token ERC20 contract

`params.receiverAddress` recipient wallet address

`params.getObject` should this function return `Promise<TransactionReceipt>` (`false`) or `TransactionObject<TransactionReceipt>` (`true`)

`params.txOpts` web3 transaction options object (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise<TransactionReceipt>` or `TransactionObject<TransactionReceipt>`

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

Transfers specified amount of tokens to `to` address.

```typescript
  transferToken(params: {
    tokenAddress: string;
    to: string;
    amount: BigNumber;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<TransactionReceipt> | TransactionObject<TransactionReceipt>;
```

###### Arguments

`params.tokenAddress` an address of token ERC20 contract

`params.to` recipient wallet address

`params.amount` amount of tokens to transfer

`params.getObject` should this function return `Promise<TransactionReceipt>` (`false`) or `TransactionObject<TransactionReceipt>` (`true`)

`params.txOpts` web3 transaction options object (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise<TransactionReceipt>` or `TransactionObject<TransactionReceipt>`

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
  loanTokenAmount: number | string;
  interestAmount: number | string;
  initialMarginAmount: number | string;
  maintenanceMarginAmount: number | string;
  lenderRelayFee: number | string;
  traderRelayFee: number | string;
  maxDurationUnixTimestampSec: number | string;
  expirationUnixTimestampSec: number | string;
  loanOrderHash: string;
  lender: string;
  orderFilledAmount: number;
  orderCancelledAmount: number;
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
  loanTokenAmount: number | string;
  interestAmount: number | string;
  initialMarginAmount: number | string;
  maintenanceMarginAmount: number | string;
  lenderRelayFee: number | string;
  traderRelayFee: number | string;
  maxDurationUnixTimestampSec: number | string;
  expirationUnixTimestampSec: number | string;
  bZxAddress: string;
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
  loanOrderHash: string;
  loanStartUnixTimestampSec: number;
  loanEndUnixTimestampSec: number;
  active: number;
  loanTokenAddress: string;
  loanTokenAmountFilled: number;
  collateralTokenAddressFilled: string;
  collateralTokenAmountFilled: number;
  positionTokenAddressFilled: number;
  positionTokenAmountFilled: number;
  interestTokenAddress: string;
  interestTotalAccrued: number;
  interestLastPaidDate: number;
  interestPaidSoFar: number;
}
```
________________________________________________________________________________

##### IZeroExOrder

```typescript
export declare interface IZeroExOrder {
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

##### IZeroExV2Order

```typescript
export declare interface IZeroExV2Order {
  senderAddress: string;
  makerAddress: string;
  takerAddress: string;
  makerFee: string;
  takerFee: string;
  makerAssetAmount: string;
  takerAssetAmount: string;
  makerAssetData: any;
  takerAssetData: any;
  salt: string;
  exchangeAddress: string;
  feeRecipientAddress: string;
  expirationTimeSeconds: string;
}
```
________________________________________________________________________________

##### ITokenMetadata

```typescript
export declare interface ITokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
}
```
________________________________________________________________________________

##### IZeroExV2OrderMetadata

```typescript
export declare interface IZeroExV2OrderMetadata {
  makerToken: ITokenMetadata;
  takerToken: ITokenMetadata;
}
```
________________________________________________________________________________

##### ISignatureParams

```typescript
export declare interface ISignatureParams {
  v: number;
  r: Buffer;
  s: Buffer;
}
```
________________________________________________________________________________

##### IZeroExOrderSigned

```typescript
export declare interface IZeroExOrderSigned extends IZeroExOrder {
  ecSignature: ISignatureParams;
}
```
________________________________________________________________________________

##### IZeroExV2OrderSigned

```typescript
export declare interface IZeroExV2OrderSigned extends IZeroExV2Order {
  signature: string;
}
```
________________________________________________________________________________

##### IZeroExTradeRequest

```typescript
export declare interface IZeroExTradeRequest {
  signedOrder: IZeroExOrderSigned;
}
```
________________________________________________________________________________

##### IZeroExV2TradeRequest

```typescript
export declare interface IZeroExV2TradeRequest {
  signedOrder: IZeroExV2OrderSigned;
  metadata: IZeroExV2OrderMetadata;
}
```
________________________________________________________________________________

##### IConversionData

```typescript
export declare interface IConversionData {
  rate: string;
  amount: string;
}
```
________________________________________________________________________________

##### IMarginLevel

```typescript
export declare interface IMarginLevel {
  initialMarginAmount: string;
  maintenanceMarginAmount: string;
  currentMarginAmount: string;
}
```
________________________________________________________________________________

##### IInterestStatus

```typescript
export declare interface IInterestStatus {
  lender: string;
  interestTokenAddress: string;
  interestTotalAccrued: string;
  interestPaidSoFar: string;
}
```
________________________________________________________________________________

##### IProfitStatus

```typescript
export declare interface IProfitStatus {
  isProfit: boolean;
  profitOrLoss: string;
  positionTokenAddress: string;
}
```
________________________________________________________________________________

