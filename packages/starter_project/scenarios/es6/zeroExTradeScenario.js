const {
  assetDataUtils,
  ContractWrappers,
  generatePseudoRandomSalt,
  orderHashUtils,
  signatureUtils,
  SignerType
} = require("0x.js");

const { providers, Contract } = require("ethers");

const artifacts = require("./../../artifacts");
const utils = require("./../../utils");

const { BZxJS } = require("bzx.js");

async function zeroExTradeScenario(l, c, lenderAddress, trader1Address, trader2Address, tokens, oracles) {
  const latestBlock = await c.web3.eth.getBlock("latest");

  const loanToken = artifacts.testToken0;
  const interestToken = artifacts.testToken1;
  const collateralToken = artifacts.testToken2;
  const exchangeToken = artifacts.testToken4;

  let transactionReceipt, transactionHash;

  // initializing zerExV2 contracts wrappers
  const contractWrappers = new ContractWrappers(c.provider, { networkId: utils.ganacheNetworkId });
  const zeroExExchangeAddress = contractWrappers.exchange.getContractAddress();

  // setting unlimited allowance from trader2 for exchangeToken for zeroExERC20Proxy contract
  transactionHash = await contractWrappers.erc20Token.setUnlimitedProxyAllowanceAsync(
    exchangeToken.address,
    trader2Address
  );
  console.dir(transactionHash);

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

  const zeroExOrder = {
    senderAddress: utils.zeroAddress,
    makerAddress: trader2Address,
    takerAddress: utils.zeroAddress,
    makerFee: c.web3.utils.toWei("0.000", "ether").toString(),
    takerFee: c.web3.utils.toWei("0.000", "ether").toString(),
    makerAssetAmount: c.web3.utils.toWei("12", "ether"),
    takerAssetAmount: c.web3.utils.toWei("12", "ether"),
    makerAssetData: assetDataUtils.encodeERC20AssetData(exchangeToken.address),
    takerAssetData: assetDataUtils.encodeERC20AssetData(loanToken.address),
    salt: generatePseudoRandomSalt().toString(),
    exchangeAddress: zeroExExchangeAddress.toLowerCase(),
    feeRecipientAddress: trader1Address, // here we can point address for relay fees
    expirationTimeSeconds: (latestBlock.timestamp + 86400).toString()
  };

  // calculating exchange order (zeroExOrder) hash
  // !!!important: orderHashUtils.getOrderHashHex doesn't work for now)
  const provider = await new providers.Web3Provider(c.web3.currentProvider);
  const signer = await provider.getSigner(trader2Address);
  const helper = await new Contract(artifacts.zeroExV2Helper.address, artifacts.zeroExV2Helper.abi, signer);
  const zeroExOrderHash = await helper.getOrderHash(zeroExOrder);

  // checking exchange order (zeroExOrder) has right format
  const isValidZeroExOrderHash = orderHashUtils.isValidOrderHash(zeroExOrderHash);
  console.dir(isValidZeroExOrderHash);

  // creating signature for exchange order (zeroExOrder)
  const zeroExOrderSignature = await signatureUtils.ecSignOrderHashAsync(
    c.provider,
    zeroExOrderHash,
    trader2Address,
    SignerType.Default
  );
  console.dir(zeroExOrderSignature);

  // validating signature of exchange order (zeroExOrder)
  let is0xValidLendOrderSignature = await c.bzxjs.isValidSignatureAsync({
    account: trader2Address,
    orderHash: zeroExOrderHash,
    signature: zeroExOrderSignature
  });
  console.dir(is0xValidLendOrderSignature);

  // signing exchange order (zeroExOrder) by adding signature
  const zeroExOrderSigned = { ...zeroExOrder, signature: zeroExOrderSignature };

  // trading position
  transactionReceipt = await c.bzxjs.tradePositionWith0xV2({
    order0x: {
      signedOrder: zeroExOrderSigned,
      metadata: {
        makerToken: null,
        takerToken: null
      }
    },
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
