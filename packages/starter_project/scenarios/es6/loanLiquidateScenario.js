const artifacts = require("./../../artifacts");
const utils = require("./../../utils");

const { BZxJS } = require("@bzxnetwork/bzx.js");
const BigNumber = require("bignumber.js");
const moment = require("moment");

async function loanLiquidateScenario(l, c, lenderAddress, trader1Address, trader2Address, tokens, oracles) {
  const latestBlock = await c.web3.eth.getBlock("latest");

  const loanToken = artifacts.testToken0;
  const interestToken = artifacts.testToken1;
  const collateralToken = artifacts.testToken2;

  let transactionReceipt;

  // creating lend order (loan order created by lender, lend proposal)
  const lendOrder = {
    bZxAddress: artifacts.bZx.address.toLowerCase(),
    makerAddress: lenderAddress.toLowerCase(),
    takerAddress: utils.zeroAddress.toLowerCase(),
    tradeTokenToFillAddress: utils.zeroAddress.toLowerCase(),
    withdrawOnOpen: "0",
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
  const lendOrderHash = BZxJS.getLoanOrderHashHex({ ...lendOrder, oracleData: "" } );
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
    tradeTokenToFillAddress: utils.zeroAddress.toLowerCase(),
    withdrawOnOpen: "0",
    getObject: false,
    txOpts: { from: trader1Address, gasLimit: utils.gasLimit }
  });
  console.dir(transactionReceipt);

  // getting list of active loans
  const activeLoans = await c.bzxjs.getActiveLoans({ start: 0, count: 50 });

  // finding loan created earlier in active loans list for example purposes
  const activeLoan = activeLoans.filter(loan => loan.loanOrderHash === lendOrderHash && loan.trader === trader1Address)[0];

  // getting margin levels
  const marginLevels = await c.bzxjs.getMarginLevels({
    loanOrderHash: activeLoan.loanOrderHash,
    trader: activeLoan.trader
  });
  console.dir(marginLevels);

  // simple check of current margin against maintenance margin
  const isUnSafe = !BigNumber(marginLevels.currentMarginAmount)
    .dividedBy(1e18)
    .plus(2) // start reporting "unsafe" when 2% above maintenance threshold
    .gt(marginLevels.maintenanceMarginAmount);
  console.dir(isUnSafe);

  // simple check for expiration
  const expireDate = moment(activeLoan.loanEndUnixTimestampSec * 1000).utc();
  // cheating with current date to make loan order expired for example purposes
  const currentDate = moment()
    .add(2420000, "second")
    .utc();
  const isExpired = currentDate.isAfter(expireDate);
  console.dir(isExpired);

  // if smth wrong with loan
  if (isUnSafe || isExpired) {
    // requesting loan order liquidation
    transactionReceipt = await c.bzxjs.liquidateLoan({
      loanOrderHash: activeLoan.loanOrderHash,
      trader: activeLoan.trader,
      getObject: false,
      txOpts: { from: trader1Address, gasLimit: utils.gasLimit }
    });
    console.dir(transactionReceipt);
  }
}

module.exports.loanLiquidateScenario = loanLiquidateScenario;
