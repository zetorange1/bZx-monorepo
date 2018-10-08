#!/usr/bin/env node

// const BigNumber =  require("bignumber.js");
// const BN =  require("bn.js");

const { initConnectivity } = require("./../../connectivity");
const { initLogger } = require("./../../logging");

const { seedTokensByERC20Scenario } = require("./seedTokensByERC20Scenario");
const { seedTokensByFaucetScenario } = require("./seedTokensByFaucetScenario");
const { wethExchangeScenario } = require("./wethExchangeScenario");
const { allowanceManagementScenario, allowancePrepareScenario } = require("./allowanceManagementScenario");
const { oracleTradeScenario } = require("./oracleTradeScenario");
const { lendOrderScenario, lendOrderOnChainScenario } = require("./lendOrderScenario");
const { borrowOrderScenario, borrowOrderOnChainScenario } = require("./borrowOrderScenario");
const { collateralManagementScenario } = require("./collateralManagementScenario");
const { zeroExTradeScenario } = require("./zeroExTradeScenario");

// constants from ganache-cli address 0 and 1
const ownerAddress = "0x5409ed021d9299bf6814279a6a1411a7e866a631";    // accounts[0]
const lenderAddress = "0xa8dda8d7f5310e4a9e24f8eba77e091ac264f872";   // accounts[5]
const trader1Address = "0x06cef8e666768cc40cc78cf93d9611019ddcb628";  // accounts[6]
const trader2Address = "0x4404ac8bd8f9618d27ad2f1485aa1b2cfd82482d";  // accounts[7]

(async () => {
  const l = initLogger();
  const c = await initConnectivity();

  // reading tokens info
  const tokens = await c.bzxjs.getTokenList();
  console.dir(tokens);

  // reading oracles info
  const oracles = await c.bzxjs.getOracleList();
  console.dir(oracles);

  await seedTokensByERC20Scenario(l, c, ownerAddress, lenderAddress, trader1Address, trader2Address);
  // await seedTokensByFaucetScenario(l, c, lenderAddress, trader1Address, trader2Address);
  await wethExchangeScenario(l, c, trader2Address);
  await allowanceManagementScenario(l, c, lenderAddress);
  await allowancePrepareScenario(l, c, lenderAddress, trader1Address);
  await lendOrderScenario(l, c, lenderAddress, trader1Address, oracles);
  await lendOrderOnChainScenario(l, c, lenderAddress, trader1Address, oracles);
  await borrowOrderScenario(l, c, lenderAddress, trader1Address, oracles);
  await borrowOrderOnChainScenario(l, c, lenderAddress, trader1Address, oracles);
  await collateralManagementScenario(l, c, lenderAddress, trader1Address, tokens, oracles);
  await zeroExTradeScenario(l, c, lenderAddress, trader1Address, trader2Address, tokens, oracles);
  // await oracleTradeScenario(l, c, tokens, oracles);
})();
