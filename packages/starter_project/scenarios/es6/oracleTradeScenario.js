async function oracleTradeScenario(l, c, tokens, oracles) {
  // check if specified exchange is available for specified tokens pair in specified amount using the oracle
  const isTradeSupported = await c.bzxjs.isTradeSupported({
    sourceTokenAddress: tokens.find(e => e.symbol === "WETH").address.toLowerCase(),
    destTokenAddress: tokens.find(e => e.symbol === "BZRX").address.toLowerCase(),
    sourceTokenAmount: c.web3.utils.toWei("0.5", "ether"),
    oracleAddress: oracles[0].address.toLowerCase()
  });
  console.dir(isTradeSupported);

  // get conversion rates using the oracle
  const conversionData = await c.bzxjs.getConversionData(
    tokens.find(e => e.symbol === "WETH").address.toLowerCase(),
    tokens.find(e => e.symbol === "BZRX").address.toLowerCase(),
    c.web3.utils.toWei("0.5", "ether"),
    oracles[0].address.toLowerCase()
  );
  console.dir(conversionData);
}

module.exports.oracleTradeScenario = oracleTradeScenario;
