# bZx Smart Contracts [![Build Status](https://travis-ci.org/b0xNetwork/protocol_contracts.svg?branch=master)](https://travis-ci.org/b0xNetwork/protocol_contracts) [![Coverage Status](https://coveralls.io/repos/github/b0xNetwork/protocol_contracts/badge.svg?branch=master)](https://coveralls.io/github/b0xNetwork/protocol_contracts?branch=master)

## Overview
`bZx Smart Contracts` ecosystem is built around two things simple for understanding: `Loan orders` and `Trade orders`.
`Trade order` is an order to exchange to move funds between users' accounts.
`Loan order` is an order to the lending platform to take the lender's funds and provide the borrower with that funds directly or indirectly.

## Key Smart Contracts
### BZx (BZx.sol)
The entry point of the system. This interface is meant to used with the deployed `BZxProxy` contract (`BZxProxy.sol`) address.
```
// js example: 
var bZx = await BZx.at((await BZxProxy.deployed()).address);
```
Provides users with the abilities to:
- Order taking functions,
- Trade placing functions,
- Loan maintenance functions,
- Loan health functions.

See also `BZxProxy.sol` contract.

The next foundational blocks in the ecosystem are top-level contracts modules that provides all needed interfaces to trade using loaned ERC20 tokens.

### BZxOrderTaking.sol / BZxOrderTakingOnChain.sol
The key contract is `BZxOrderTaking`/`BZxOrderTakingOnChain` that manages order taking and allows users to
- Take the order as `trader`,
- Take the order as `lender`,
- Cancel remaining (untaken) `loan`,
- Cancel remaining (untaken) `loan`.

_Dev notes:_ This smart contract is deployed and attached to the system as submodule of _BZx_ and not designed to be used directly. Use `BZx.sol` and `BZxProxy.sol` instead.

### BZxTradePlacing.sol / BZxTradePlacing0xV2.sol
The important smart contract that give the ability to trade using loaned funds:
- Executes a `0x` trade using loaned funds,
- Executes a market order trade using the `oracle` contract specified in the loan referenced by `loanOrderHash`.

_Dev notes:_ This smart contract is deployed and attached to the system as submodule of _BZx_ and not designed to be used directly. Use `BZx.sol` and `BZxProxy.sol` instead.

### BZxLoanHealth.sol
Functions that allow users to `close` loans, `liquidate` positions and other related stuff.

_Dev notes:_ This smart contract is deployed and attached to the system as submodule of _BZx_ and not designed to be used directly. Use `BZx.sol` and `BZxProxy.sol` instead.

### BZxLoanMaintenance.sol
`Collateral` and `profit` management functions. Allows users to change amount of collaterals, allows the trader/lender to transfer ownership of the underlying assets in a position to another user and withdraw their profits.

_Dev notes:_ This smart contract is deployed and attached to the system as submodule of _BZx_ and not designed to be used directly. Use `BZx.sol` and `BZxProxy.sol` instead.

### BZxOrderHistory.sol
Returns information about currently registered `orders` and `loans` in the system. Users (traders and lenders) can get their orders and loans by utilizing functions from this smart contract.

_Dev notes:_ This smart contract is deployed and attached to the system as submodule of _BZx_ and not designed to be used directly. Use `BZx.sol` and `BZxProxy.sol` instead.

### BZxOracle.sol
The key contract is `BZxOracle` that provides logic for price discovery of ERC20 token pairs, and handle the trading of those pairs through an on-chain mechanism. Uses `Kyber Network` as a `liquidity provider`.

The oracle address should be specified in the loan order. See `BZxOrderTaking::takeLoanOrder*` and `BZxTradePlacing::tradePositionWithOracle` function for more details.

### Other 
#### OracleRegistry.sol
The contract which keeps track of all oracles registered in the system. `Oracles` added to the `bZx` network by decentralized governance.

## Documention
https://bZxNetwork.github.io/bZx-monorepo/

