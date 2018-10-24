const artifacts = require("./../../artifacts");
const utils = require("./../../utils");

async function allowanceManagementScenario(l, c, walletAddress) {
  let transactionReceipt;

  // setting unlimited allowance from lender for token0 for bZxVault
  transactionReceipt = await c.bzxjs.setAllowanceUnlimited({
    tokenAddress: artifacts.testToken0.address,
    ownerAddress: walletAddress,
    spenderAddress: artifacts.bZxVault.address,
    getObject: false,
    txOpts: { from: walletAddress, gasLimit: utils.gasLimit }
  });
  console.dir(transactionReceipt);

  // setting limited allowance from lender for token0 for bZxVault
  transactionReceipt = await c.bzxjs.setAllowance({
    tokenAddress: artifacts.testToken0.address,
    ownerAddress: walletAddress,
    spenderAddress: artifacts.bZxVault.address,
    amountInBaseUnits: c.web3.utils.toWei("1000", "ether"),
    getObject: false,
    txOpts: { from: walletAddress, gasLimit: utils.gasLimit }
  });
  console.dir(transactionReceipt);

  // getting limited allowance from lender for token0 for bZxVault
  let allowance = await c.bzxjs.getAllowance({
    tokenAddress: artifacts.testToken0.address,
    ownerAddress: walletAddress,
    spenderAddress: artifacts.bZxVault.address,
    getObject: false,
    txOpts: { from: walletAddress, gasLimit: utils.gasLimit }
  });
  console.dir(allowance.toString());

  // resetting allowance from lender for token0 for bZxVault
  transactionReceipt = await c.bzxjs.resetAllowance({
    tokenAddress: artifacts.testToken0.address,
    ownerAddress: walletAddress,
    spenderAddress: artifacts.bZxVault.address,
    getObject: false,
    txOpts: { from: walletAddress, gasLimit: utils.gasLimit }
  });
  console.dir(transactionReceipt);
}

async function allowancePrepareScenario(l, c, lenderAddress, traderAddress) {
  let transactionReceipt;

  const loanToken = artifacts.testToken0;
  const interestToken = artifacts.testToken1;
  const collateral1Token = artifacts.testToken2;
  const collateral2Token = artifacts.testToken3;

  // setting limited allowance from lender for loanToken for bZxVault
  transactionReceipt = await c.bzxjs.setAllowance({
    tokenAddress: loanToken.address,
    ownerAddress: lenderAddress,
    spenderAddress: artifacts.bZxVault.address,
    amountInBaseUnits: c.web3.utils.toWei("1000", "ether"),
    getObject: false,
    txOpts: { from: lenderAddress, gasLimit: utils.gasLimit }
  });
  console.dir(transactionReceipt);

  // getting limited allowance from lender for loanToken for bZxVault
  let allowance = await c.bzxjs.getAllowance({
    tokenAddress: loanToken.address,
    ownerAddress: lenderAddress,
    spenderAddress: artifacts.bZxVault.address,
    getObject: false,
    txOpts: { from: lenderAddress, gasLimit: utils.gasLimit }
  });
  console.dir(allowance.toString());

  // setting limited allowance from trader for interestToken for bZxVault
  transactionReceipt = await c.bzxjs.setAllowance({
    tokenAddress: interestToken.address,
    ownerAddress: traderAddress,
    spenderAddress: artifacts.bZxVault.address,
    amountInBaseUnits: c.web3.utils.toWei("1000", "ether"),
    getObject: false,
    txOpts: { from: traderAddress, gasLimit: utils.gasLimit }
  });
  console.dir(transactionReceipt);

  // getting limited allowance from trader for interestToken for bZxVault
  allowance = await c.bzxjs.getAllowance({
    tokenAddress: interestToken.address,
    ownerAddress: traderAddress,
    spenderAddress: artifacts.bZxVault.address,
    getObject: false,
    txOpts: { from: traderAddress, gasLimit: utils.gasLimit }
  });
  console.dir(allowance.toString());

  // setting limited allowance from trader for collateral1Token for bZxVault
  transactionReceipt = await c.bzxjs.setAllowance({
    tokenAddress: collateral1Token.address,
    ownerAddress: traderAddress,
    spenderAddress: artifacts.bZxVault.address,
    amountInBaseUnits: c.web3.utils.toWei("1000", "ether"),
    getObject: false,
    txOpts: { from: traderAddress, gasLimit: utils.gasLimit }
  });
  console.dir(transactionReceipt);

  // getting limited allowance from trader for collateral1Token for bZxVault
  allowance = await c.bzxjs.getAllowance({
    tokenAddress: collateral1Token.address,
    ownerAddress: traderAddress,
    spenderAddress: artifacts.bZxVault.address,
    getObject: false,
    txOpts: { from: traderAddress, gasLimit: utils.gasLimit }
  });
  console.dir(allowance.toString());

  // setting limited allowance from trader for collateral2Token for bZxVault
  transactionReceipt = await c.bzxjs.setAllowance({
    tokenAddress: collateral2Token.address,
    ownerAddress: traderAddress,
    spenderAddress: artifacts.bZxVault.address,
    amountInBaseUnits: c.web3.utils.toWei("1000", "ether"),
    getObject: false,
    txOpts: { from: traderAddress, gasLimit: utils.gasLimit }
  });
  console.dir(transactionReceipt);

  // getting limited allowance from trader for collateral2Token for bZxVault
  allowance = await c.bzxjs.getAllowance({
    tokenAddress: collateral2Token.address,
    ownerAddress: traderAddress,
    spenderAddress: artifacts.bZxVault.address,
    getObject: false,
    txOpts: { from: traderAddress, gasLimit: utils.gasLimit }
  });
  console.dir(allowance.toString());
}

module.exports.allowanceManagementScenario = allowanceManagementScenario;
module.exports.allowancePrepareScenario = allowancePrepareScenario;
