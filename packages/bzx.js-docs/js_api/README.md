# JavaScript API

This documentation section contains the description of JavaScript API provided by the bzx.js library.

bzx.js is the library for interaction with the bZx protocol.

This library provides a way for interaction with the bZx smart contracts, and helper functions.

### Constructor

Creates instance of BZxJS.

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

#### Allowance

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

`params.txOpts` web3 transaction options (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise` or `TransactionObject`for `boolean` value indicating if the operation succeeded

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

`params.txOpts` web3 transaction options (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise` or `TransactionObject`for `boolean` value indicating if the operation succeeded

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

`params.txOpts` web3 transaction options (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise` or `TransactionObject`for `boolean` value indicating if the operation succeeded

#### Hash

##### getLoanOrderHashHex

Calculate Keccak-256 hash of loan order with specified parameters.

```typescript
  getLoanOrderHashHex(order): Promise<string>;
```

###### Arguments

`order` loan order

###### Returns

Hash value `string`

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

##### signOrderHashAsync

Sign loan order and returns signature `string`.

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

`boolean` value inidcating if the signature is valid

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

`Promise` for `boolean` value inidcating if the signature is valid

#### Exchange

##### getTokenList

Provide metadata for all registered tokens

```typescript
  getTokenList(): ITokenDescription[];
```

###### Arguments

None

###### Returns

Array of `ITokenDescription`

##### getOracleList

Provide metadata for all registered oracles

```typescript
  getOracleList(): IOracleDescription[];
```

###### Arguments

None

###### Returns

Array of `IOracleDescription`

##### isTradeSupported

Check if spicified `oracleAddress` supports exchange of provided tokens

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

`oracleAddress` address of oracle to check tokens pair support

###### Returns

`boolean` value indicating if oracle is able to make exchange between tokens

##### getConversionData

Get terms of exchange between tokens in the specific amount using selected oracle.

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

`result.rate` available exhange rate
`result.amount` available amount of tokens to exchange

#### Loan orders

##### takeLoanOrderAsTrader

Take loan order created by lender and push it on chain.

```typescript
  takeLoanOrderAsTrader(params: {
    order: ILoanOrderFillRequestSigned;
    collateralTokenAddress: string;
    loanTokenAmountFilled: BigNumber;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<BigNumber> | TransactionObject<BigNumber>;
```

###### Arguments

`params.order` signed loan order `ILoanOrderFillRequestSigned`

`params.collateralTokenAddress` desired address of the collateral the trader wants to use

`params.loanTokenAmountFilled` desired amount of loanToken the trader wants to borrow

`params.getObject` should this function return `TransactionObject` (`true`) or `Promise` (`false`)

`params.txOpts` web3 transaction options (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise` or `TransactionObject`for `BigNumber` containing total amount of loanToken borrowed

##### takeLoanOrderAsLender

Take loan order created by traider and push it on chain.

```typescript
  takeLoanOrderAsLender(params: {
    order: ILoanOrderFillRequestSigned;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<BigNumber> | TransactionObject<BigNumber>;
```

###### Arguments

`params.order`signed loan order `ILoanOrderFillRequestSigned`

`params.getObject` should this function return `TransactionObject` (`true`) or `Promise` (`false`)

`params.txOpts` web3 transaction options (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise` or `TransactionObject`for `BigNumber` containing total amount of loanToken borrowed

##### pushLoanOrderOnChain

Push signed loan order on chain.

```typescript
  pushLoanOrderOnChain(params: {
    order: ILoanOrderFillRequestSigned;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<string> | TransactionObject<string>;
```

###### Arguments

`params.order`signed loan order `ILoanOrderFillRequestSigned`

`params.getObject` should this function return `TransactionObject` (`true`) or `Promise` (`false`)

`params.txOpts` web3 transaction options (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise` or `TransactionObject`for a unique hash `string` representing the loan order

##### takeLoanOrderOnChainAsTrader

Take loan order created by lender and already located on chain (partially filled).

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

`params.txOpts` web3 transaction options (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise` or `TransactionObject`for `BigNumber` containing total amount of loanToken borrowed

##### takeLoanOrderOnChainAsLender

Take loan order created by traider and already located on chain (partially filled).

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

`params.txOpts` web3 transaction options (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise` or `TransactionObject`for `BigNumber` containing total amount of loanToken borrowed

##### cancelLoanOrder

Cancels remaining (untaken) loan

```typescript
  cancelLoanOrder(params: {
    order: ILoanOrderFillRequestSigned;
    cancelLoanTokenAmount: BigNumber;
    getObject: boolean;
    txOpts: Tx;
  }): Promise<BigNumber> | TransactionObject<BigNumber>;
```

###### Arguments

`params.order` signed loan order `ILoanOrderFillRequestSigned`

`params.cancelLoanTokenAmount` the amount of remaining unloaned token to cancel

`params.getObject` should this function return `TransactionObject` (`true`) or `Promise` (`false`)

`params.txOpts` web3 transaction options (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise` or `TransactionObject`for `BigNumber` containing the amount of loan token canceled

##### cancelLoanOrderWithHash

Cancels remaining (untaken) loan

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

`params.txOpts` web3 transaction options (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise` or `TransactionObject`for `BigNumber` containing the amount of loan token canceled

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

`params.txOpts` web3 transaction options (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise` or `TransactionObject`for `boolean` value indicating if the operation succeeded

#### Collateral

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

`params.txOpts` web3 transaction options (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise` or `TransactionObject`for `boolean` value indicating if the operation succeeded

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

`params.txOpts` web3 transaction options (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise` or `TransactionObject`for `BigNumber` containing the amount of additional collateral token to deposit.

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

`params.txOpts` web3 transaction options (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise` for `BigNumber` containing actual amount withdrawn

#### Trade



#### ETH/WETH

##### wrapEth

Converts ETH to WETH Tokens

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

`params.txOpts` web3 transaction options (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise` or `TransactionObject`for `string` containing transaction id

##### unwrapEth

Converts ETH to WETH Tokens

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

`params.txOpts` web3 transaction options (`from`, `gasPrice`, `gas` etc.)

###### Returns

`string` containing transaction id

#### Utils

##### generatePseudoRandomSalt

Static method that generates pseudo-random UINT256 number.

```typescript
  static generatePseudoRandomSalt(): BigNumber;
```

###### Arguments

None

###### Returns

`BigNumber` instance

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

##### noop

Static method that does nothing. Just an empty function.

```typescript
  static noop(): void;
```

###### Arguments

None

###### Returns

Nothing

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

`params.txOpts` web3 transaction options (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise` or `TransactionObject`for `boolean` value indicating if the operation succeeded

##### toChecksumAddress

Will convert an upper or lowercase Ethereum address to a checksum address.

```typescript
  static toChecksumAddress(address: string): string;
```

###### Arguments

`address` an address string

###### Returns

The checksum address `string`

##### transferToken

Transfers specified amount of token to `to address` address.

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

`params.txOpts` web3 transaction options (`from`, `gasPrice`, `gas` etc.)

###### Returns

`Promise` or `TransactionObject`for `boolean` value indicating if the operation succeeded

### Constants

### Structures
