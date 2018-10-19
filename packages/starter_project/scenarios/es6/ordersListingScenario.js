const artifacts = require("./../../artifacts");
const utils = require("./../../utils");

const { BZxJS } = require("bzx.js");

async function ordersListingScenario(l, c, lenderAddress, trader1Address, trader2Address, tokens, oracles) {
  const latestBlock = await c.web3.eth.getBlock("latest");

  const loanToken = artifacts.testToken0;
  const interestToken = artifacts.testToken1;
  const collateralToken = artifacts.testToken2;

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

  let loanOrdersFillable, loanOrder;

  // getting specific loan order (lendOrder)
  loanOrder = await c.bzxjs.getSingleOrder({ loanOrderHash: lendOrderHash });
  console.dir(loanOrder);

  // getting loan orders available for taking (fillable)
  loanOrdersFillable = await c.bzxjs.getOrdersFillable({ start: 0, count: 1000});
  console.dir(loanOrdersFillable);

  // lendOrder should present as it's taken only partially (0.1 ether)
  loanOrder = loanOrdersFillable.filter(loanOrder => loanOrder.loanOrderHash === lendOrderHash)[0];
  console.dir(loanOrder);

  // getting all loan orders where lenderAddress is one of parties
  loanOrdersFillable = await c.bzxjs.getOrdersForUser({ loanPartyAddress: lenderAddress, start: 0, count: 1000});
  console.dir(loanOrdersFillable);

  // lendOrder should present as it's lender is lenderAddress
  loanOrder = loanOrdersFillable.filter(loanOrder => loanOrder.loanOrderHash === lendOrderHash)[0];
  console.dir(loanOrder);

  let loans, loan;

  // getting specific loan position where loan order identified by lendOrderHash and trader is trader1
  loan = await c.bzxjs.getSingleLoan({ loanOrderHash: lendOrderHash, trader: trader1Address });
  console.dir(loan);

  // getting all active loan positions where lender is lenderAddress
  loans = await c.bzxjs.getLoansForLender({ address: lenderAddress, count: 1000, activeOnly: true });
  console.dir(loans);

  // loan created with lend order should present as lender is lenderAddress
  loan = loans.filter(loanOrder => loanOrder.loanOrderHash === lendOrderHash)[0];
  console.dir(loan);

  // getting all active loan positions where trader is trader1
  loans = await c.bzxjs.getLoansForTrader({ address: trader1Address, count: 1000, activeOnly: true });
  console.dir(loans);

  // loan created with lend order should present as trader is trader1
  loan = loans.filter(loanOrder => loanOrder.loanOrderHash === lendOrderHash)[0];
  console.dir(loan);
}

module.exports.ordersListingScenario = ordersListingScenario;
