const { BZxJS } = require("bzx.js");

const artifacts = require("./../../artifacts");
const utils = require("./../../utils");

async function collateralManagementScenario(l, c, lenderAddress, traderAddress, tokens, oracles) {
  const latestBlock = await c.web3.eth.getBlock("latest");

  // creating lend order (loan order created by lender, lend proposal)
  const lendOrder = {
    bZxAddress: artifacts.bZx.address.toLowerCase(),
    makerAddress: lenderAddress.toLowerCase(),
    loanTokenAddress: artifacts.testToken0.address.toLowerCase(),
    interestTokenAddress: artifacts.testToken0.address.toLowerCase(),
    collateralTokenAddress: utils.zeroAddress.toLowerCase(),
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
    loanTokenAmountFilled: c.web3.utils.toWei("1", "ether"),
    getObject: false,
    txOpts: { from: traderAddress, gasLimit: utils.gasLimit }
  });
  console.dir(transactionReceipt);

  // getting balance of testToken1
  let balance = await c.bzxjs.getBalance({
    tokenAddress: artifacts.testToken1.address.toLowerCase(),
    ownerAddress: traderAddress.toLowerCase()
  });
  console.dir(balance.toString());

  if (balance.lte(new BigNumber(100))) {
    // getting faucet testToken1
    transactionReceipt = await c.bzxjs.requestFaucetToken({
      tokenAddress: artifacts.testToken1.address,
      receiverAddress: traderAddress,
      getObject: false,
      txOpts: { from: traderAddress, gasLimit: utils.gasLimit }
    });
    console.dir(transactionReceipt);

    // getting balance of testToken1
    balance = await c.bzxjs.getBalance({
      tokenAddress: artifacts.testToken1.address.toLowerCase(),
      ownerAddress: traderAddress.toLowerCase()
    });
    console.dir(balance.toString());
  }

  // getting balance of testToken1
  balance = await c.bzxjs.getBalance({
    tokenAddress: artifacts.testToken2.address.toLowerCase(),
    ownerAddress: traderAddress.toLowerCase()
  });
  console.dir(balance.toString());

  if (balance.lte(new BigNumber(100))) {
    // getting faucet testToken1
    transactionReceipt = await c.bzxjs.requestFaucetToken({
      tokenAddress: artifacts.testToken2.address,
      receiverAddress: traderAddress,
      getObject: false,
      txOpts: { from: traderAddress, gasLimit: utils.gasLimit }
    });
    console.dir(transactionReceipt);

    // getting balance of testToken1
    balance = await c.bzxjs.getBalance({
      tokenAddress: artifacts.testToken2.address.toLowerCase(),
      ownerAddress: traderAddress.toLowerCase()
    });
    console.dir(balance.toString());
  }

  const initialCollateralRequired = await c.bzxjs.getInitialCollateralRequired(
    artifacts.testToken0.address.toLowerCase(),
    artifacts.testToken0.address.toLowerCase(),
    oracles[0].address.toLowerCase(),
    "5",
    "25"
  );
  console.dir(initialCollateralRequired);

  transactionReceipt = await c.bzxjs.depositCollateral({
    loanOrderHash: lendOrderHash,
    collateralTokenFilled: artifacts.testToken1.address,
    depositAmount: "1",
    getObject: false,
    txOpts: { from: traderAddress, gasLimit: utils.gasLimit }
  });
  console.dir(transactionReceipt);

  transactionReceipt = await c.bzxjs.withdrawExcessCollateral({
    loanOrderHash: lendOrderHash,
    collateralTokenFilled: artifacts.testToken1.address,
    withdrawAmount: "1",
    getObject: false,
    txOpts: { from: traderAddress, gasLimit: utils.gasLimit }
  });
  console.dir(transactionReceipt);

  transactionReceipt = await c.bzxjs.changeCollateral({
    loanOrderHash: lendOrderHash,
    collateralTokenFilled: artifacts.testToken2.address,
    getObject: false,
    txOpts: { from: traderAddress, gasLimit: utils.gasLimit }
  });
  console.dir(transactionReceipt);
}

module.exports.collateralManagementScenario = collateralManagementScenario;
