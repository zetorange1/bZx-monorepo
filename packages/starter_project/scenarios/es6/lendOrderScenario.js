const { BZxJS } = require("bzx.js");

const artifacts = require("./../../artifacts");
const utils = require("./../../utils");

async function lendOrderScenario(l, c, lenderAddress, traderAddress, oracles) {
  const latestBlock = await c.web3.eth.getBlock("latest");

  const loanToken = artifacts.testToken0;
  const interestToken = artifacts.testToken1;
  const collateralToken = artifacts.testToken2;

  // creating lend order (loan order created by lender, lend proposal)
  const lendOrder = {
    bZxAddress: artifacts.bZx.address.toLowerCase(),
    makerAddress: lenderAddress.toLowerCase(),
    loanTokenAddress: loanToken.address.toLowerCase(),
    interestTokenAddress: interestToken.address.toLowerCase(),
    collateralTokenAddress: utils.zeroAddress.toLowerCase(),
    feeRecipientAddress: utils.zeroAddress.toLowerCase(),
    oracleAddress: oracles[0].address.toLowerCase(),
    loanTokenAmount: c.web3.utils.toWei("10", "ether"),
    interestAmount: c.web3.utils.toWei("0.2", "ether"),
    initialMarginAmount: "50",
    maintenanceMarginAmount: "25",
    lenderRelayFee: c.web3.utils.toWei("0.0015", "ether"),
    traderRelayFee: c.web3.utils.toWei("0.0025", "ether"),
    maxDurationUnixTimestampSec: "2419200",
    expirationUnixTimestampSec: (latestBlock.timestamp + 86400).toString(),
    makerRole: "0", // 0=lender, 1=trader
    salt: BZxJS.generatePseudoRandomSalt().toString()
  };
  console.dir(lendOrder);

  // creating hash of lend order (on-chain mode)
  const lendOrderHash = await c.bzxjs.getLoanOrderHashAsync(lendOrder);
  console.dir(lendOrderHash);

  // creating hash of lend order (off-chain mode)
  const lendOrderHashHex = BZxJS.getLoanOrderHashHex(lendOrder);
  console.dir(lendOrderHashHex);

  // creating signature of lend order
  const lendOrderSignature = await c.bzxjs.signOrderHashAsync(lendOrderHash, lenderAddress);
  console.dir(lendOrderSignature);

  // validating signature of lend order
  const isValidLendOrderSignature = await c.bzxjs.isValidSignatureAsync({
    account: lenderAddress,
    orderHash: lendOrderHash,
    signature: lendOrderSignature
  });
  console.dir(isValidLendOrderSignature);

  // signing lend order
  const signedLendOrder = { ...lendOrder, signature: lendOrderSignature };
  console.dir(signedLendOrder);

  // taking lend order by trader and pushing it to bzx contract
  let transactionReceipt = await c.bzxjs.takeLoanOrderAsTrader({
    order: signedLendOrder,
    collateralTokenAddress: collateralToken.address,
    loanTokenAmountFilled: c.web3.utils.toWei("1", "ether"),
    getObject: false,
    txOpts: { from: traderAddress, gasLimit: utils.gasLimit }
  });
  console.dir(transactionReceipt);

  // decrease available loan amount by ETH 3 using lend order
  transactionReceipt = await c.bzxjs.cancelLoanOrder({
    order: signedLendOrder,
    cancelLoanTokenAmount: c.web3.utils.toWei("3", "ether"),
    getObject: false,
    txOpts: { from: lenderAddress, gasLimit: utils.gasLimit }
  });
  console.dir(transactionReceipt);

  // decrease available loan amount by ETH 3 using lend order hash
  transactionReceipt = await c.bzxjs.cancelLoanOrderWithHash({
    loanOrderHash: lendOrderHash,
    cancelLoanTokenAmount: c.web3.utils.toWei("3", "ether"),
    getObject: false,
    txOpts: { from: lenderAddress, gasLimit: utils.gasLimit }
  });
  console.dir(transactionReceipt);
}

async function lendOrderOnChainScenario(l, c, lenderAddress, traderAddress, oracles) {
  const latestBlock = await c.web3.eth.getBlock("latest");

  const loanToken = artifacts.testToken0;
  const interestToken = artifacts.testToken1;
  const collateralToken = artifacts.testToken2;

  // creating lend order (loan order created by lender, lend proposal)
  const lendOrder = {
    bZxAddress: artifacts.bZx.address.toLowerCase(),
    makerAddress: lenderAddress.toLowerCase(),
    loanTokenAddress: loanToken.address.toLowerCase(),
    interestTokenAddress: interestToken.address.toLowerCase(),
    collateralTokenAddress: utils.zeroAddress.toLowerCase(),
    feeRecipientAddress: utils.zeroAddress.toLowerCase(),
    oracleAddress: oracles[0].address.toLowerCase(),
    loanTokenAmount: c.web3.utils.toWei("10", "ether"),
    interestAmount: c.web3.utils.toWei("0.2", "ether"),
    initialMarginAmount: "50",
    maintenanceMarginAmount: "25",
    lenderRelayFee: c.web3.utils.toWei("0.0015", "ether"),
    traderRelayFee: c.web3.utils.toWei("0.0025", "ether"),
    maxDurationUnixTimestampSec: "2419200",
    expirationUnixTimestampSec: (latestBlock.timestamp + 86400).toString(),
    makerRole: "0", // 0=lender, 1=trader
    salt: BZxJS.generatePseudoRandomSalt().toString()
  };
  console.dir(lendOrder);

  // creating hash of lend order (on-chain mode)
  const lendOrderHash = await c.bzxjs.getLoanOrderHashAsync(lendOrder);
  console.dir(lendOrderHash);

  // creating hash of lend order (off-chain mode)
  const lendOrderHashHex = BZxJS.getLoanOrderHashHex(lendOrder);
  console.dir(lendOrderHashHex);

  // creating signature of lend order
  const lendOrderSignature = await c.bzxjs.signOrderHashAsync(lendOrderHash, lenderAddress);
  console.dir(lendOrderSignature);

  // validating signature of lend order
  const isValidLendOrderSignature = await c.bzxjs.isValidSignatureAsync({
    account: lenderAddress,
    orderHash: lendOrderHash,
    signature: lendOrderSignature
  });
  console.dir(isValidLendOrderSignature);

  // signing lend order
  const signedLendOrder = { ...lendOrder, signature: lendOrderSignature };
  console.dir(signedLendOrder);

  // pushing lend order on-chain. this provides 'centralized' way of handing loan orders.
  let transactionReceipt = await c.bzxjs.pushLoanOrderOnChain({
    order: signedLendOrder,
    getObject: false,
    txOpts: { from: lenderAddress, gasLimit: utils.gasLimit }
  });
  console.dir(transactionReceipt);

  // taking lend order located on chain by trader
  transactionReceipt = await c.bzxjs.takeLoanOrderOnChainAsTrader({
    loanOrderHash: lendOrderHash,
    collateralTokenAddress: collateralToken.address,
    loanTokenAmountFilled: c.web3.utils.toWei("1", "ether"),
    getObject: false,
    txOpts: { from: traderAddress, gasLimit: utils.gasLimit }
  });
  console.dir(transactionReceipt);

  // decrease available loan amount by ETH 3 using lend order
  transactionReceipt = await c.bzxjs.cancelLoanOrder({
    order: signedLendOrder,
    cancelLoanTokenAmount: c.web3.utils.toWei("3", "ether"),
    getObject: false,
    txOpts: { from: lenderAddress, gasLimit: utils.gasLimit }
  });
  console.dir(transactionReceipt);

  // decrease available loan amount by ETH 3 using lend order hash
  transactionReceipt = await c.bzxjs.cancelLoanOrderWithHash({
    loanOrderHash: lendOrderHash,
    cancelLoanTokenAmount: c.web3.utils.toWei("3", "ether"),
    getObject: false,
    txOpts: { from: lenderAddress, gasLimit: utils.gasLimit }
  });
  console.dir(transactionReceipt);
}

module.exports.lendOrderScenario = lendOrderScenario;
module.exports.lendOrderOnChainScenario = lendOrderOnChainScenario;
