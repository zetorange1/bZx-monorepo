const artifacts = require("./../../artifacts");
const utils = require("./../../utils");

async function seedTokensByFaucetScenario(l, c, lenderAddress, trader1Address, trader2Address) {
  const loanToken = artifacts.testToken0;
  const interestToken = artifacts.testToken1;
  const collateral1Token = artifacts.testToken2;
  const collateral2Token = artifacts.testToken3;
  const exchangeToken = artifacts.testToken4;

  let transactionReceipt, balance;

  // getting balance of collateral1Token
  balance = await c.bzxjs.getBalance({
    tokenAddress: loanToken.address.toLowerCase(),
    ownerAddress: lenderAddress.toLowerCase()
  });
  console.dir(balance.toString());

  // getting faucet collateral1Token
  transactionReceipt = await c.bzxjs.requestFaucetToken({
    tokenAddress: loanToken.address,
    receiverAddress: lenderAddress,
    getObject: false,
    txOpts: { from: lenderAddress, gasLimit: utils.gasLimit }
  });
  console.dir(transactionReceipt);

  // getting balance of collateral1Token
  balance = await c.bzxjs.getBalance({
    tokenAddress: loanToken.address.toLowerCase(),
    ownerAddress: lenderAddress.toLowerCase()
  });
  console.dir(balance.toString());

  // getting balance of collateral1Token
  balance = await c.bzxjs.getBalance({
    tokenAddress: interestToken.address.toLowerCase(),
    ownerAddress: trader1Address.toLowerCase()
  });
  console.dir(balance.toString());

  // getting faucet collateral1Token
  transactionReceipt = await c.bzxjs.requestFaucetToken({
    tokenAddress: interestToken.address,
    receiverAddress: trader1Address,
    getObject: false,
    txOpts: { from: trader1Address, gasLimit: utils.gasLimit }
  });
  console.dir(transactionReceipt);

  // getting balance of collateral1Token
  balance = await c.bzxjs.getBalance({
    tokenAddress: interestToken.address.toLowerCase(),
    ownerAddress: trader1Address.toLowerCase()
  });
  console.dir(balance.toString());

  // getting balance of collateral1Token
  balance = await c.bzxjs.getBalance({
    tokenAddress: collateral1Token.address.toLowerCase(),
    ownerAddress: trader1Address.toLowerCase()
  });
  console.dir(balance.toString());

  // getting faucet collateral1Token
  transactionReceipt = await c.bzxjs.requestFaucetToken({
    tokenAddress: collateral1Token.address,
    receiverAddress: trader1Address,
    getObject: false,
    txOpts: { from: trader1Address, gasLimit: utils.gasLimit }
  });
  console.dir(transactionReceipt);

  // getting balance of collateral1Token
  balance = await c.bzxjs.getBalance({
    tokenAddress: collateral1Token.address.toLowerCase(),
    ownerAddress: trader1Address.toLowerCase()
  });
  console.dir(balance.toString());

  // getting balance of collateral2Token
  balance = await c.bzxjs.getBalance({
    tokenAddress: collateral2Token.address.toLowerCase(),
    ownerAddress: trader1Address.toLowerCase()
  });
  console.dir(balance.toString());

  // getting faucet collateral2Token
  transactionReceipt = await c.bzxjs.requestFaucetToken({
    tokenAddress: collateral2Token.address,
    receiverAddress: trader1Address,
    getObject: false,
    txOpts: { from: trader1Address, gasLimit: utils.gasLimit }
  });
  console.dir(transactionReceipt);

  // getting balance of collateral2Token
  balance = await c.bzxjs.getBalance({
    tokenAddress: collateral2Token.address.toLowerCase(),
    ownerAddress: trader1Address.toLowerCase()
  });
  console.dir(balance.toString());

  // getting balance of exchangeToken
  balance = await c.bzxjs.getBalance({
    tokenAddress: exchangeToken.address.toLowerCase(),
    ownerAddress: trader2Address.toLowerCase()
  });
  console.dir(balance.toString());

  // getting faucet exchangeToken
  transactionReceipt = await c.bzxjs.requestFaucetToken({
    tokenAddress: exchangeToken.address,
    receiverAddress: trader2Address,
    getObject: false,
    txOpts: { from: trader2Address, gasLimit: utils.gasLimit }
  });
  console.dir(transactionReceipt);

  // getting balance of exchangeToken
  balance = await c.bzxjs.getBalance({
    tokenAddress: exchangeToken.address.toLowerCase(),
    ownerAddress: trader2Address.toLowerCase()
  });
  console.dir(balance.toString());
}

module.exports.seedTokensByFaucetScenario = seedTokensByFaucetScenario;
