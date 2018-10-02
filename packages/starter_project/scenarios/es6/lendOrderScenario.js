const { BZxJS } = require("bzx.js");

const artifacts = require("./../../artifacts");
const utils = require("./../../utils");

async function lendOrderScenario(l, c, lenderAddress, traderAddress, oracles) {
  const latestBlock = await c.web3.eth.getBlock("latest");

  // creating lend order (loan order created by lender, lend proposal)
  const lendOrder = {
    bZxAddress: artifacts.bZx.address.toLowerCase(),
    makerAddress: lenderAddress.toLowerCase(),
    loanTokenAddress: artifacts.testToken0.address.toLowerCase(),
    interestTokenAddress: artifacts.testToken0.address.toLowerCase(),
    collateralTokenAddress: artifacts.testToken0.address.toLowerCase(),
    feeRecipientAddress: utils.zeroAddress.toLowerCase(),
    oracleAddress: oracles[0].address.toLowerCase(),
    loanTokenAmount: c.web3.utils.toWei("100", "ether"),
    interestAmount: c.web3.utils.toWei("0.2", "ether"),
    initialMarginAmount: "50",
    maintenanceMarginAmount: "25",
    lenderRelayFee: c.web3.utils.toWei("0.001", "ether"),
    traderRelayFee: c.web3.utils.toWei("0.0015", "ether"),
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
    collateralTokenAddress: artifacts.testToken1.address,
    loanTokenAmountFilled: c.web3.utils.toWei("0.123", "ether"),
    getObject: false,
    txOpts: { from: traderAddress, gasLimit: utils.gasLimit }
  });
  console.dir(transactionReceipt);
}

module.exports.lendOrderScenario = lendOrderScenario;
