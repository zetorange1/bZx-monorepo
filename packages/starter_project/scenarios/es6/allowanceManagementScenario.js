const artifacts = require("./../../artifacts");
const utils = require("./../../utils");

async function allowanceManagementScenario(l, c, lenderAddress, traderAddress) {
  // resetting allowance for token0
  let transactionReceipt = await c.bzxjs.resetAllowance({
    tokenAddress: artifacts.testToken0.address,
    ownerAddress: lenderAddress,
    spenderAddress: traderAddress,
    getObject: false,
    txOpts: { from: lenderAddress, gasLimit: utils.gasLimit }
  });
  console.dir(transactionReceipt);

  // setting unlimited allowance for token0
  transactionReceipt = await c.bzxjs.setAllowanceUnlimited({
    tokenAddress: artifacts.testToken0.address,
    ownerAddress: lenderAddress,
    spenderAddress: traderAddress,
    getObject: false,
    txOpts: { from: lenderAddress, gasLimit: utils.gasLimit }
  });
  console.dir(transactionReceipt);

  // setting limited allowance for token0
  transactionReceipt = await c.bzxjs.setAllowance({
    tokenAddress: artifacts.testToken0.address,
    ownerAddress: lenderAddress,
    spenderAddress: traderAddress,
    amountInBaseUnits: c.web3.utils.toWei("1000", "ether"),
    getObject: false,
    txOpts: { from: lenderAddress, gasLimit: utils.gasLimit }
  });
  console.dir(transactionReceipt);

  // getting limited allowance for token0
  transactionReceipt = await c.bzxjs.getAllowance({
    tokenAddress: artifacts.testToken0.address,
    ownerAddress: lenderAddress,
    spenderAddress: traderAddress,
    getObject: false,
    txOpts: { from: lenderAddress, gasLimit: utils.gasLimit }
  });
  console.dir(transactionReceipt.toString());
}

module.exports.allowanceManagementScenario = allowanceManagementScenario;
