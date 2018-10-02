#!/usr/bin/env node

// const BigNumber =  require("bignumber.js");
// const BN =  require("bn.js");

const { initConnectivity } = require("./../../connectivity");
const { initLogger } = require("./../../logging");

const { wethExchangeScenario } = require("./wethExchangeScenario");
const { allowanceManagementScenario } = require("./allowanceManagementScenario");
const { oracleTradeScenario } = require("./oracleTradeScenario");
const { lendOrderScenario, lendOrderOnChainScenario } = require("./lendOrderScenario");
const { borrowOrderScenario, borrowOrderOnChainScenario } = require("./borrowOrderScenario");

// constants from ganache-cli address 0 and 1
const lenderAddress = "0x5409ed021d9299bf6814279a6a1411a7e866a631";
const traderAddress = "0x6ecbe1db9ef729cbe972c83fb886247691fb6beb";

(async () => {
  const l = initLogger();
  const c = await initConnectivity();

  // reading tokens info
  const tokens = await c.bzxjs.getTokenList();
  console.dir(tokens);

  // reading oracles info
  const oracles = await c.bzxjs.getOracleList();
  console.dir(oracles);

  await wethExchangeScenario(l, c, lenderAddress);
  await allowanceManagementScenario(l, c, lenderAddress);
  await oracleTradeScenario(l, c, tokens, oracles);
  await lendOrderScenario(l, c, lenderAddress, traderAddress, oracles);
  await lendOrderOnChainScenario(l, c, lenderAddress, traderAddress, oracles);
  await borrowOrderScenario(l, c, lenderAddress, traderAddress, oracles);
  await borrowOrderOnChainScenario(l, c, lenderAddress, traderAddress, oracles);
})();
