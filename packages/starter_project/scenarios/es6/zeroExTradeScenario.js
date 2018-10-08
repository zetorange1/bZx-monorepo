// important BigNumber was imported from "0x.js"!
const {
  assetDataUtils,
  BigNumber,
  ContractWrappers,
  generatePseudoRandomSalt,
  orderHashUtils,
  signatureUtils,
  SignerType
} = require("0x.js");

const artifacts = require("./../../artifacts");
const utils = require("./../../utils");

const { BZxJS } = require("bzx.js");

async function zeroExTradeScenario(l, c, lenderAddress, trader1Address, trader2Address, tokens, oracles) {
  const latestBlock = await c.web3.eth.getBlock("latest");

  const loanToken = artifacts.testToken0;
  const interestToken = artifacts.testToken1;
  const collateral1Token = artifacts.testToken2;
  const collateral2Token = artifacts.testToken3;
  const exchangeToken = artifacts.testToken4;

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
    txOpts: { from: trader1Address, gasLimit: utils.gasLimit }
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
    depositAmount: initialCollateralRequired,
    getObject: false,
    txOpts: { from: trader1Address, gasLimit: utils.gasLimit }
  });
  console.dir(transactionReceipt);

  const contractWrappers = new ContractWrappers(c.provider, { networkId: utils.ganacheNetworkId });
  const exchangeAddress = contractWrappers.exchange.getContractAddress();

  let exchangeOrderMaker = trader1Address;
  let exchangeOrderTaker = trader2Address;

  await contractWrappers.erc20Token.setUnlimitedProxyAllowanceAsync(loanToken.address, exchangeOrderMaker);
  await contractWrappers.erc20Token.setUnlimitedProxyAllowanceAsync(loanToken.address, exchangeOrderTaker);
  await contractWrappers.erc20Token.setUnlimitedProxyAllowanceAsync(exchangeToken.address, exchangeOrderTaker);

  // filling exchange order for zeroEx (0x)
  const zeroExOrder = {
    senderAddress: utils.zeroAddress,
    makerAddress: exchangeOrderMaker,
    takerAddress: utils.zeroAddress,
    makerFee: new BigNumber("0"),
    takerFee: new BigNumber("0"),
    makerAssetAmount: new BigNumber(c.web3.utils.toWei("5", "ether")),
    takerAssetAmount: new BigNumber(c.web3.utils.toWei("1", "ether")),
    makerAssetData: assetDataUtils.encodeERC20AssetData(loanToken.address),
    takerAssetData: assetDataUtils.encodeERC20AssetData(exchangeToken.address),
    salt: generatePseudoRandomSalt(),
    exchangeAddress: exchangeAddress.toLowerCase(),
    feeRecipientAddress: utils.zeroAddress, // here we can point address for relay fees
    expirationTimeSeconds: new BigNumber(latestBlock.timestamp + 86400)
  };
  console.dir(zeroExOrder);

  // creating hash for exchange order
  const zeroExOrderHash = orderHashUtils.getOrderHashHex(zeroExOrder);
  console.dir(zeroExOrderHash);

  // checking exchange order has right
  const isValidZeroExOrderHash = orderHashUtils.isValidOrderHash(zeroExOrderHash);
  console.dir(isValidZeroExOrderHash);

  // signing exchange order
  const zeroExOrderSignature = await signatureUtils.ecSignOrderHashAsync(
    c.provider,
    zeroExOrderHash,
    trader1Address,
    SignerType.Default
  );
  const zeroExOrderSigned = { ...zeroExOrder, signature: zeroExOrderSignature };

  transactionReceipt = c.bzxjs.tradePositionWith0xV2({
    order0x: zeroExOrderSigned,
    orderHashBZx: lendOrderHash,
    getObject: false,
    txOpts: { from: trader1Address, gasLimit: utils.gasLimit }
  });
  console.log(transactionReceipt);

  // // checking exchange order funds availability
  // await contractWrappers.exchange.validateFillOrderThrowIfInvalidAsync(
  //   zeroExOrderSigned,
  //   new BigNumber(c.web3.utils.toWei("1", "ether")),
  //   exchangeOrderTaker
  // );
  //
  // txHash = await contractWrappers.exchange.fillOrderAsync(
  //   zeroExOrderSigned,
  //   new BigNumber(c.web3.utils.toWei("1", "ether")),
  //   exchangeOrderTaker,
  //   {
  //     from: exchangeOrderTaker,
  //     gasLimit: utils.gasLimit
  //   }
  // );

  console.dir(zeroExOrder);
}

module.exports.zeroExTradeScenario = zeroExTradeScenario;
