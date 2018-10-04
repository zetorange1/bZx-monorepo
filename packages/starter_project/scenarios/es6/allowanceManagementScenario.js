const artifacts = require("./../../artifacts");
const utils = require("./../../utils");

async function allowanceManagementScenario(l, c, lenderAddress, traderAddress) {
  // resetting allowance from lender for token0 for bZxVault
  let transactionReceipt = await c.bzxjs.resetAllowance({
    tokenAddress: artifacts.testToken0.address,
    ownerAddress: lenderAddress,
    spenderAddress: artifacts.bZxVault.address,
    getObject: false,
    txOpts: { from: lenderAddress, gasLimit: utils.gasLimit }
  });
  console.dir(transactionReceipt);

  // setting unlimited allowance from lender for token0 for bZxVault
  transactionReceipt = await c.bzxjs.setAllowanceUnlimited({
    tokenAddress: artifacts.testToken0.address,
    ownerAddress: lenderAddress,
    spenderAddress: artifacts.bZxVault.address,
    getObject: false,
    txOpts: { from: lenderAddress, gasLimit: utils.gasLimit }
  });
  console.dir(transactionReceipt);

  // setting limited allowance from lender for token0 for bZxVault
  transactionReceipt = await c.bzxjs.setAllowance({
    tokenAddress: artifacts.testToken0.address,
    ownerAddress: lenderAddress,
    spenderAddress: artifacts.bZxVault.address,
    amountInBaseUnits: c.web3.utils.toWei("1000", "ether"),
    getObject: false,
    txOpts: { from: lenderAddress, gasLimit: utils.gasLimit }
  });
  console.dir(transactionReceipt);

  // getting limited allowance from lender for token0 for bZxVault
  let allowance = await c.bzxjs.getAllowance({
    tokenAddress: artifacts.testToken0.address,
    ownerAddress: lenderAddress,
    spenderAddress: artifacts.bZxVault.address,
    getObject: false,
    txOpts: { from: lenderAddress, gasLimit: utils.gasLimit }
  });
  console.dir(allowance.toString());

  // setting limited allowance from trader for token1 for bZxVault
  transactionReceipt = await c.bzxjs.setAllowance({
    tokenAddress: artifacts.testToken1.address,
    ownerAddress: traderAddress,
    spenderAddress: artifacts.bZxVault.address,
    amountInBaseUnits: c.web3.utils.toWei("1000", "ether"),
    getObject: false,
    txOpts: { from: traderAddress, gasLimit: utils.gasLimit }
  });
  console.dir(transactionReceipt);

  // getting limited allowance from trader for token1 for bZxVault
  allowance = await c.bzxjs.getAllowance({
    tokenAddress: artifacts.testToken1.address,
    ownerAddress: traderAddress,
    spenderAddress: artifacts.bZxVault.address,
    getObject: false,
    txOpts: { from: traderAddress, gasLimit: utils.gasLimit }
  });
  console.dir(allowance.toString());

  // setting limited allowance from trader for token2 for bZxVault
  transactionReceipt = await c.bzxjs.setAllowance({
    tokenAddress: artifacts.testToken2.address,
    ownerAddress: traderAddress,
    spenderAddress: artifacts.bZxVault.address,
    amountInBaseUnits: c.web3.utils.toWei("1000", "ether"),
    getObject: false,
    txOpts: { from: traderAddress, gasLimit: utils.gasLimit }
  });
  console.dir(transactionReceipt);

  // getting limited allowance from trader for token2 for bZxVault
  allowance = await c.bzxjs.getAllowance({
    tokenAddress: artifacts.testToken2.address,
    ownerAddress: traderAddress,
    spenderAddress: artifacts.bZxVault.address,
    getObject: false,
    txOpts: { from: traderAddress, gasLimit: utils.gasLimit }
  });
  console.dir(allowance.toString());
}

module.exports.allowanceManagementScenario = allowanceManagementScenario;
