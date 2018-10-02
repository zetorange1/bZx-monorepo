const { BZxJS } = require("bzx.js");

const artifacts = require("./../../artifacts");
const utils = require("./../../utils");

async function borrowOrderScenario(l, c, lenderAddress, traderAddress, oracles) {
  const latestBlock = await c.web3.eth.getBlock("latest");

  // creating borrow order (loan order created by borrower, borrow proposal)
  const borrowOrder = {
    bZxAddress: artifacts.bZx.address.toLowerCase(),
    makerAddress: traderAddress.toLowerCase(),
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
    makerRole: "1", // 0=borrower, 1=trader
    salt: BZxJS.generatePseudoRandomSalt().toString()
  };
  console.dir(borrowOrder);

  // creating hash of borrow order (on-chain mode)
  const borrowOrderHash = await c.bzxjs.getLoanOrderHashAsync(borrowOrder);
  console.dir(borrowOrderHash);

  // creating hash of borrow order (off-chain mode)
  const borrowOrderHashHex = BZxJS.getLoanOrderHashHex(borrowOrder);
  console.dir(borrowOrderHashHex);

  // creating signature of borrow order
  const borrowOrderSignature = await c.bzxjs.signOrderHashAsync(borrowOrderHash, traderAddress);
  console.dir(borrowOrderSignature);

  // validating signature of borrow order
  const isValidBorrowOrderSignature = await c.bzxjs.isValidSignatureAsync({
    account: traderAddress,
    orderHash: borrowOrderHash,
    signature: borrowOrderSignature
  });
  console.dir(isValidBorrowOrderSignature);

  // signing borrow order
  const signedBorrowOrder = { ...borrowOrder, signature: borrowOrderSignature };
  console.dir(signedBorrowOrder);

  // taking borrow order by trader and pushing it to bzx contract
  let transactionReceipt = await c.bzxjs.takeLoanOrderAsLender({
    order: signedBorrowOrder,
    getObject: false,
    txOpts: { from: lenderAddress, gasLimit: utils.gasLimit }
  });
  console.dir(transactionReceipt);

  // closes loan using borrow order hash
  transactionReceipt = await c.bzxjs.closeLoan({
    loanOrderHash: borrowOrderHash,
    getObject: false,
    txOpts: { from: traderAddress, gasLimit: utils.gasLimit }
  });
  console.dir(transactionReceipt);
}

async function borrowOrderOnChainScenario(l, c, lenderAddress, traderAddress, oracles) {
  const latestBlock = await c.web3.eth.getBlock("latest");

  // creating borrow order (loan order created by borrower, borrow proposal)
  const borrowOrder = {
    bZxAddress: artifacts.bZx.address.toLowerCase(),
    makerAddress: traderAddress.toLowerCase(),
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
    makerRole: "1", // 0=borrower, 1=trader
    salt: BZxJS.generatePseudoRandomSalt().toString()
  };
  console.dir(borrowOrder);

  // creating hash of borrow order (on-chain mode)
  const borrowOrderHash = await c.bzxjs.getLoanOrderHashAsync(borrowOrder);
  console.dir(borrowOrderHash);

  // creating hash of borrow order (off-chain mode)
  const borrowOrderHashHex = BZxJS.getLoanOrderHashHex(borrowOrder);
  console.dir(borrowOrderHashHex);

  // creating signature of borrow order
  const borrowOrderSignature = await c.bzxjs.signOrderHashAsync(borrowOrderHash, traderAddress);
  console.dir(borrowOrderSignature);

  // validating signature of borrow order
  const isValidBorrowOrderSignature = await c.bzxjs.isValidSignatureAsync({
    account: traderAddress,
    orderHash: borrowOrderHash,
    signature: borrowOrderSignature
  });
  console.dir(isValidBorrowOrderSignature);

  // signing borrow order
  const signedBorrowOrder = { ...borrowOrder, signature: borrowOrderSignature };
  console.dir(signedBorrowOrder);

  // pushing lend order on-chain. this provides 'centralized' way of handing loan orders.
  let transactionReceipt = await c.bzxjs.pushLoanOrderOnChain({
    order: signedBorrowOrder,
    getObject: false,
    txOpts: { from: traderAddress, gasLimit: utils.gasLimit }
  });
  console.dir(transactionReceipt);

  // taking borrow order located on chain by lender
  transactionReceipt = await c.bzxjs.takeLoanOrderOnChainAsLender({
    loanOrderHash: borrowOrderHash,
    getObject: false,
    txOpts: { from: lenderAddress, gasLimit: utils.gasLimit }
  });
  console.dir(transactionReceipt);

  // closes loan using borrow order hash
  transactionReceipt = await c.bzxjs.closeLoan({
    loanOrderHash: borrowOrderHash,
    getObject: false,
    txOpts: { from: traderAddress, gasLimit: utils.gasLimit }
  });
  console.dir(transactionReceipt);
}

module.exports.borrowOrderScenario = borrowOrderScenario;
module.exports.borrowOrderOnChainScenario = borrowOrderOnChainScenario;
