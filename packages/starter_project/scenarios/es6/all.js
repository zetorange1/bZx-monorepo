#!/usr/bin/env node

const { initConnectivity } = require("./../../connectivity");
const { initLogger } = require("./../../logging");

const { tokensSeedByERC20Scenario } = require("./tokensSeedByERC20Scenario");
const { tokensSeedByFaucetScenario } = require("./tokensSeedByFaucetScenario");
const { wethExchangeScenario } = require("./wethExchangeScenario");
const { allowanceManagementScenario, allowancePrepareScenario } = require("./allowanceManagementScenario");
const { oracleTradeScenario, oracleConversionScenario } = require("./oracleTradeScenario");
const { lendOrderScenario, lendOrderOnChainScenario } = require("./lendOrderScenario");
const { borrowOrderScenario, borrowOrderOnChainScenario } = require("./borrowOrderScenario");
const { collateralManagementScenario } = require("./collateralManagementScenario");
const { zeroExTradeScenario } = require("./zeroExTradeScenario");
const { loanLiquidateScenario } = require("./loanLiquidateScenario");
const { ordersListingScenario } = require("./ordersListingScenario");

const { ownerAddress, lenderAddress, trader1Address, trader2Address } = require("./../../addresses");

(async () => {
  const l = initLogger();
  const c = await initConnectivity();

  // reading tokens info
  const tokens = await c.bzxjs.getTokenList();
  console.dir(tokens);

  // reading oracles info
  const oracles = await c.bzxjs.getOracleList();
  console.dir(oracles);

  await tokensSeedByERC20Scenario(l, c, ownerAddress, lenderAddress, trader1Address, trader2Address);
  // await tokensSeedByFaucetScenario(l, c, lenderAddress, trader1Address, trader2Address);
  await wethExchangeScenario(l, c, trader2Address);
  await allowanceManagementScenario(l, c, lenderAddress);
  await allowancePrepareScenario(l, c, lenderAddress, trader1Address);
  // await lendOrderScenario(l, c, lenderAddress, trader1Address, oracles);
  // await lendOrderOnChainScenario(l, c, lenderAddress, trader1Address, oracles);
  // await borrowOrderScenario(l, c, lenderAddress, trader1Address, oracles);
  // await borrowOrderOnChainScenario(l, c, lenderAddress, trader1Address, oracles);
  // await collateralManagementScenario(l, c, lenderAddress, trader1Address, tokens, oracles);
 // await zeroExTradeScenario(l, c, lenderAddress, trader1Address, trader2Address, tokens, oracles);
  // await oracleConversionScenario(l, c, tokens, oracles);
 // await oracleTradeScenario(l, c, lenderAddress, trader1Address, trader2Address, tokens, oracles);
 // await loanLiquidateScenario(l, c, lenderAddress, trader1Address, trader2Address, tokens, oracles);
  // await ordersListingScenario(l, c, lenderAddress, trader1Address, trader2Address, tokens, oracles);
})();
