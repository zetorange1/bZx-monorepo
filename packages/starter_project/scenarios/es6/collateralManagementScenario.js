const BigNumber = require("bignumber.js");

const { BZxJS } = require("bzx.js");

const artifacts = require("./../../artifacts");
const utils = require("./../../utils");

async function collateralManagementScenario(l, c, lenderAddress, traderAddress, tokens, oracles) {
  const latestBlock = await c.web3.eth.getBlock("latest");

  const loanToken = artifacts.testToken0;
  const interestToken = artifacts.testToken1;
  const collateral1Token = artifacts.testToken2;
  const collateral2Token = artifacts.testToken3;

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
    collateralTokenAddress: collateral1Token.address,
    loanTokenAmountFilled: c.web3.utils.toWei("1", "ether"),
    getObject: false,
    txOpts: { from: traderAddress, gasLimit: utils.gasLimit }
  });
  console.dir(transactionReceipt);

  // calculate required collateral
  const initialCollateralRequired = await c.bzxjs.getInitialCollateralRequired(
    loanToken.address.toLowerCase(),
    collateral1Token.address.toLowerCase(),
    oracles[0].address.toLowerCase(),
    "50",
    "25"
  );
  console.dir(initialCollateralRequired);

  // increase collateral for specified order
  transactionReceipt = await c.bzxjs.depositCollateral({
    loanOrderHash: lendOrderHash,
    collateralTokenFilled: collateral1Token.address,
    depositAmount: (new BigNumber(initialCollateralRequired)).multipliedBy(2).toString(),
    getObject: false,
    txOpts: { from: traderAddress, gasLimit: utils.gasLimit }
  });
  console.dir(transactionReceipt);

  // decrease collateral for specified order by withdrawing some tokens
  transactionReceipt = await c.bzxjs.withdrawExcessCollateral({
    loanOrderHash: lendOrderHash,
    collateralTokenFilled: collateral1Token.address,
    withdrawAmount: (new BigNumber(initialCollateralRequired)).multipliedBy(2).toString(),
    getObject: false,
    txOpts: { from: traderAddress, gasLimit: utils.gasLimit }
  });
  console.dir(transactionReceipt);

  // change collateral token specified
  transactionReceipt = await c.bzxjs.changeCollateral({
    loanOrderHash: lendOrderHash,
    collateralTokenFilled: collateral2Token.address,
    getObject: false,
    txOpts: { from: traderAddress, gasLimit: utils.gasLimit }
  });
  console.dir(transactionReceipt);
}

module.exports.collateralManagementScenario = collateralManagementScenario;
