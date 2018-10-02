#!/usr/bin/env node

// const BigNumber =  require("bignumber.js");
// const BN =  require("bn.js");

const { BZxJS } = require("bzx.js");
const artifacts = require("./../../artifacts");
const { initConnectivity } = require("./../../connectivity");
const { initLogger } = require("./../../logging");
const utils = require("./../../utils");

// constants from ganache-cli address 0 and 1
const lenderAddress = "0x5409ed021d9299bf6814279a6a1411a7e866a631";
const traderAddress = "0x6ecbe1db9ef729cbe972c83fb886247691fb6beb";

(async () => {
  const l = initLogger();
  const c = await initConnectivity();

  // reading tokens info
  const tokens = await c.bzxjs.getTokenList();
  console.dir(tokens);

  // reading oracles info
  const oracles = await c.bzxjs.getOracleList();
  console.dir(oracles);

  const isTradeSupported = await c.bzxjs.isTradeSupported({
    sourceTokenAddress: tokens.find(e => e.symbol === "WETH").address.toLowerCase(),
    destTokenAddress: tokens.find(e => e.symbol === "BZRX").address.toLowerCase(),
    sourceTokenAmount: c.web3.utils.toWei("0.5", "ether"),
    oracleAddress: oracles[0].address.toLowerCase()
  });
  console.dir(isTradeSupported);

  const conversionData = await c.bzxjs.getConversionData(
    tokens.find(e => e.symbol === "WETH").address.toLowerCase(),
    tokens.find(e => e.symbol === "BZRX").address.toLowerCase(),
    c.web3.utils.toWei("0.5", "ether"),
    oracles[0].address.toLowerCase()
  );
  console.dir(conversionData);

  // wrapping eth to weth for trading as tokens
  const wrapReceipt = await c.bzxjs.wrapEth({
    amount: c.web3.utils.toWei("0.2", "ether"),
    getObject: false,
    txOpts: { from: lenderAddress, gasLimit: utils.gasLimit }
  });
  console.dir(wrapReceipt);

  // partially unwrapping weth to eth
  const unwrapReceipt = await c.bzxjs.unwrapEth({
    amount: c.web3.utils.toWei("0.1", "ether"),
    getObject: false,
    txOpts: { from: lenderAddress, gasLimit: utils.gasLimit }
  });
  console.dir(unwrapReceipt);

  // getting balance of weth
  let balance = await c.bzxjs.getBalance({ tokenAddress: artifacts.weth.address.toLowerCase(), ownerAddress: lenderAddress.toLowerCase() });
  console.dir(balance.toString());

  // resetting allowance
  let allowance = await c.bzxjs.resetAllowance({
    tokenAddress: artifacts.testToken0.address,
    ownerAddress: lenderAddress,
    getObject: false,
    txOpts: { from: lenderAddress, gasLimit: utils.gasLimit }
  });
  console.dir(allowance);

  // setting unlimited allowance
  allowance = await c.bzxjs.setAllowanceUnlimited({
    tokenAddress: artifacts.testToken0.address,
    ownerAddress: lenderAddress,
    getObject: false,
    txOpts: { from: lenderAddress, gasLimit: utils.gasLimit }
  });
  console.dir(allowance);

  // setting limited allowance
  allowance = await c.bzxjs.setAllowance({
    tokenAddress: artifacts.testToken0.address,
    ownerAddress: lenderAddress,
    amountInBaseUnits: c.web3.utils.toWei("1000", "ether"),
    getObject: false,
    txOpts: { from: lenderAddress, gasLimit: utils.gasLimit }
  });
  console.dir(allowance);

  // getting limited allowance
  allowance = await c.bzxjs.getAllowance({
    tokenAddress: artifacts.testToken0.address,
    ownerAddress: lenderAddress,
    getObject: false,
    txOpts: { from: lenderAddress, gasLimit: utils.gasLimit }
  });
  console.dir(allowance.toString());

  // creating loan order by lender
  const latestBlock = await c.web3.eth.getBlock("latest");
  const loanOrder = {
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
  console.dir(loanOrder);

  // creating hash of loan order
  const loanOrderHash = await c.bzxjs.getLoanOrderHashAsync(loanOrder);
  console.dir(loanOrderHash);

  const loanOrderHashHex = BZxJS.getLoanOrderHashHex(loanOrder);
  console.dir(loanOrderHashHex);

  // creating signature of loan order
  const loanOrderSignature = await c.bzxjs.signOrderHashAsync(loanOrderHash, lenderAddress);
  console.dir(loanOrderSignature);

  // validating signature of loan order
  const isValidSignature = await c.bzxjs.isValidSignatureAsync({
    account: lenderAddress,
    orderHash: loanOrderHash,
    signature: loanOrderSignature
  });
  console.dir(isValidSignature);

  // signing loan order
  const signedLoanOrder = { ...loanOrder, signature: loanOrderSignature };
  console.dir(signedLoanOrder);

  // taking loan order as trader and pushing it to bzx contract
  const r = await c.bzxjs.takeLoanOrderAsTrader({
    order: signedLoanOrder,
    collateralTokenAddress: artifacts.testToken1.address,
    loanTokenAmountFilled: c.web3.utils.toWei("0.123", "ether"),
    getObject: false,
    txOpts: { from: traderAddress, gasLimit: utils.gasLimit }
  });
  console.dir(r);
})();
