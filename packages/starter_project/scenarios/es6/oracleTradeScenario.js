const artifacts = require("./../../artifacts");
const utils = require("./../../utils");

const { BZxJS } = require("bzx.js");

async function oracleTradeScenario(l, c, lenderAddress, trader1Address, trader2Address, tokens, oracles) {
  const latestBlock = await c.web3.eth.getBlock("latest");

  const loanToken = artifacts.testToken0;
  const interestToken = artifacts.testToken1;
  const collateralToken = artifacts.testToken2;
  const exchangeToken = artifacts.testToken4;

  let transactionReceipt;

  // creating lend order (loan order created by lender, lend proposal)
  const lendOrder = {
    bZxAddress: artifacts.bZx.address.toLowerCase(),
    makerAddress: lenderAddress.toLowerCase(),
    loanTokenAddress: loanToken.address.toLowerCase(),
    interestTokenAddress: interestToken.address.toLowerCase(),
    collateralTokenAddress: utils.zeroAddress.toLowerCase(),
    feeRecipientAddress: utils.zeroAddress.toLowerCase(),
    oracleAddress: oracles[0].address.toLowerCase(),
    loanTokenAmount: c.web3.utils.toWei("100", "ether"),
    interestAmount: c.web3.utils.toWei("2", "ether"),
    initialMarginAmount: "50",
    maintenanceMarginAmount: "5",
    lenderRelayFee: c.web3.utils.toWei("0.00", "ether"),
    traderRelayFee: c.web3.utils.toWei("0.00", "ether"),
    maxDurationUnixTimestampSec: "2419200",
    expirationUnixTimestampSec: (latestBlock.timestamp + 86400).toString(),
    makerRole: "0", // 0=lender, 1=trader
    salt: BZxJS.generatePseudoRandomSalt().toString()
  };

  // creating hash of lend order (on-chain mode)
  const lendOrderHash = await c.bzxjs.getLoanOrderHashAsync(lendOrder);
  console.dir(lendOrderHash);

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
  transactionReceipt = await c.bzxjs.takeLoanOrderAsTrader({
    order: signedLendOrder,
    collateralTokenAddress: collateralToken.address,
    loanTokenAmountFilled: c.web3.utils.toWei("0.1", "ether"),
    getObject: false,
    txOpts: { from: trader1Address, gasLimit: utils.gasLimit }
  });
  console.dir(transactionReceipt);

  transactionReceipt = c.bzxjs.tradePositionWithOracle({
    orderHash: lendOrderHash,
    tradeTokenAddress: exchangeToken.address,
    getObject: false,
    txOpts: { from: trader1Address, gasLimit: utils.gasLimit }
  });
  console.dir(transactionReceipt);

  // getting interest status (amounts accrued and paid) before payout
  let interestBeforePayout = await c.bzxjs.getInterest({ loanOrderHash: lendOrderHash, trader: trader1Address });
  console.dir(interestBeforePayout);

  // pay interest to lender
  // this function can be safely called by anyone
  transactionReceipt = await c.bzxjs.payInterest({
    loanOrderHash: lendOrderHash,
    trader: trader1Address,
    getObject: false,
    txOpts: { from: trader1Address, gasLimit: utils.gasLimit }
  });
  console.dir(transactionReceipt);

  // getting interest status (amounts accrued and paid) after payout
  let interestAfterPayout = await c.bzxjs.getInterest({ loanOrderHash: lendOrderHash, trader: trader1Address });
  console.dir(interestAfterPayout);

  // calculating current profit or loss
  let profitOrLoss = await c.bzxjs.getProfitOrLoss({ loanOrderHash: lendOrderHash, trader: trader1Address });
  console.dir(profitOrLoss);

  // withdrawing profit if any
  // we should make this check before calling withdrawProfit, or we can get revert if no profit there
  if (profitOrLoss.isProfit && profitOrLoss.profitOrLoss !== "0") {
    transactionReceipt = await c.bzxjs.withdrawProfit({
      loanOrderHash: lendOrderHash,
      getObject: false,
      txOpts: { from: trader1Address, gasLimit: utils.gasLimit }
    });
    console.dir(transactionReceipt);
  }
}

async function oracleConversionScenario(l, c, tokens, oracles) {
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
module.exports.oracleConversionScenario = oracleConversionScenario;
