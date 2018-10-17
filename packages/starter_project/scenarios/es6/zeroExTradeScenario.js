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

const { providers, Contract } = require("ethers");

const artifacts = require("./../../artifacts");
const utils = require("./../../utils");

const { BZxJS } = require("bzx.js");

async function zeroExTradeScenario(l, c, lenderAddress, trader, maker, tokens, oracles) {

  console.dir("lenderAddress: " + lenderAddress);
  console.dir("maker: " + maker);
  console.dir("trader: " + trader);

  const latestBlock = await c.web3.eth.getBlock("latest");

  const loanToken = artifacts.testToken0;
  const interestToken = artifacts.testToken1;
  const collateralToken = artifacts.testToken2;
  const exchangeToken = artifacts.testToken4;

  await c.bzxjs.setAllowance({
    tokenAddress: exchangeToken.address,
    ownerAddress: maker,
    spenderAddress: "0x1dc4c1cefef38a777b15aa20260a54e584b16c48".toLowerCase(),
    amountInBaseUnits: c.web3.utils.toWei("1000", "ether"),
    getObject: false,
    txOpts: { from: maker, gasLimit: utils.gasLimit }
  });

  let balance, allowance;

  // 1st checkpoint: make sure that accounts have required balance
  balance = await c.bzxjs.getBalance({tokenAddress: loanToken.address.toLowerCase(),ownerAddress: lenderAddress.toLowerCase()});
  console.dir("loanToken.balanceOf(lenderAddress): " + balance.toString());

  balance = await c.bzxjs.getBalance({tokenAddress: collateralToken.address.toLowerCase(),ownerAddress: trader.toLowerCase()});
  console.dir("collateralToken.balanceOf(trader): " + balance.toString());

  balance = await c.bzxjs.getBalance({tokenAddress: interestToken.address.toLowerCase(),ownerAddress: trader.toLowerCase()});
  console.dir("interestToken.balanceOf(trader): " + balance.toString());

  balance = await c.bzxjs.getBalance({tokenAddress: exchangeToken.address.toLowerCase(),ownerAddress: maker.toLowerCase()});
  console.dir("exchangeToken.balanceOf(maker): " + balance.toString());

  // 2nd checkpoint: make sure that accounts have required approve

  // await loanToken.approve(vault.address, MAX_UINT, { from: lenderAddress });            
  // await collateralToken.approve(vault.address, MAX_UINT, {from: trader});      
  // await interestToken.approve(vault.address, MAX_UINT, { from: trader });            
  // await exchangeToken.approve(config["addresses"]["development"]["ZeroEx"]["ERC20Proxy"],MAX_UINT,{ from: maker });

  allowance = await c.bzxjs.getAllowance(
      {
        tokenAddress: loanToken.address, 
        ownerAddress: lenderAddress,
        spenderAddress: artifacts.bZxVault.address,
        getObject: true,
        txOpts: { from: lenderAddress, gasLimit: utils.gasLimit }
      });

  console.dir("loanToken.allowance(bZxVault, lenderAddress): " + allowance.toString());
  
  allowance = await c.bzxjs.getAllowance(
    {
      tokenAddress: collateralToken.address, 
      ownerAddress: trader,
      spenderAddress: artifacts.bZxVault.address,
      getObject: true,
      txOpts: { from: trader, gasLimit: utils.gasLimit }
    });

  console.dir("collateralToken.allowance(bZxVault, trader): " + allowance.toString());

  allowance = await c.bzxjs.getAllowance(
    {
      tokenAddress: interestToken.address, 
      ownerAddress: trader,
      spenderAddress: artifacts.bZxVault.address,
      getObject: true,
      txOpts: { from: trader, gasLimit: utils.gasLimit }
    });

  console.dir("interestToken.allowance(bZxVault, trader): " + allowance.toString());

  allowance = await c.bzxjs.getAllowance(
    {
      tokenAddress: exchangeToken.address, 
      ownerAddress: maker,
      spenderAddress: "0x1dc4c1cefef38a777b15aa20260a54e584b16c48".toLowerCase(),
      getObject: true,
      txOpts: { from: maker, gasLimit: utils.gasLimit }
    });

  console.dir("exchangeToken.allowance(ERC20Proxy, maker): " + allowance.toString());

  // creating lend order (loan order created by lender, lend proposal)
  const lendOrder = {
    bZxAddress: artifacts.bZx.address.toLowerCase(),
    makerAddress: lenderAddress.toLowerCase(),
    loanTokenAddress: loanToken.address.toLowerCase(),
    interestTokenAddress: interestToken.address.toLowerCase(),
    collateralTokenAddress: utils.zeroAddress.toLowerCase(),
    feeRecipientAddress: utils.zeroAddress.toLowerCase(),
    oracleAddress: oracles[0].address.toLowerCase(),
    loanTokenAmount: c.web3.utils.toWei("100000", "ether"),
    interestAmount: c.web3.utils.toWei("2", "ether"),
    initialMarginAmount: "50",
    maintenanceMarginAmount: "5",
    lenderRelayFee: c.web3.utils.toWei("0.00", "ether"),
    traderRelayFee: c.web3.utils.toWei("0.00", "ether"),
    maxDurationUnixTimestampSec: "2419200",
    expirationUnixTimestampSec: (2539702949 + 86400).toString(),
    makerRole: "0", // 0=lender, 1=trader
    salt: BZxJS.generatePseudoRandomSalt().toString()
  };

  // creating hash of lend order (on-chain mode)
  const lendOrderHash = await c.bzxjs.getLoanOrderHashAsync(lendOrder);

  // creating signature of lend order
  const lendOrderSignature = await c.bzxjs.signOrderHashAsync(lendOrderHash, lenderAddress);


  // validating signature of lend order
  const isValidLendOrderSignature = await c.bzxjs.isValidSignatureAsync({
    account: lenderAddress,
    orderHash: lendOrderHash,
    signature: lendOrderSignature
  });
  console.dir(isValidLendOrderSignature);

  // signing lend order
  const signedLendOrder = { ...lendOrder, signature: lendOrderSignature };


  // taking lend order by trader and pushing it to bzx contract
  await c.bzxjs.takeLoanOrderAsTrader({
                    order: signedLendOrder,
                    collateralTokenAddress: collateralToken.address,
                    loanTokenAmountFilled: c.web3.utils.toWei("0.1", "ether"),
                    getObject: false,
                    txOpts: { from: trader, gasLimit: utils.gasLimit }});

  // // calculate required collateral
  // const initialCollateralRequired = 
  //           await c.bzxjs.getInitialCollateralRequired(
  //                           loanToken.address.toLowerCase(),
  //                           collateralToken.address.toLowerCase(),
  //                           oracles[0].address.toLowerCase(),
  //                           "50",
  //                           "25");

  // // increase collateral for specified order
  // await c.bzxjs.depositCollateral({
  //                 loanOrderHash: lendOrderHash,
  //                 collateralTokenFilled: collateralToken.address,
  //                 depositAmount: initialCollateralRequired * 1000,
  //                 getObject: false,
  //                 txOpts: { from: trader, gasLimit: utils.gasLimit }});
  
  const contractWrappers = new ContractWrappers(c.provider, { networkId: utils.ganacheNetworkId });
  const exchangeAddress = contractWrappers.exchange.getContractAddress();

  // await contractWrappers.erc20Token.setUnlimitedProxyAllowanceAsync(exchangeToken.address, trader);
  // await contractWrappers.erc20Token.setUnlimitedProxyAllowanceAsync(loanToken.address, exchangeOrderTaker);
  // await contractWrappers.erc20Token.setUnlimitedProxyAllowanceAsync(loanToken.address, exchangeOrderMaker);

console.log("Exchange address: " + exchangeAddress.toLowerCase());

  const zeroExOrder = {    
    senderAddress: utils.zeroAddress,
    makerAddress: maker,
    takerAddress: utils.zeroAddress,
    makerFee: c.web3.utils.toWei("0.00000", "ether").toString(),
    takerFee: c.web3.utils.toWei("0.000", "ether").toString(),
    makerAssetAmount: c.web3.utils.toWei("12", "ether"),
    takerAssetAmount: c.web3.utils.toWei("12", "ether"),
    makerAssetData: assetDataUtils.encodeERC20AssetData(exchangeToken.address),
    takerAssetData: assetDataUtils.encodeERC20AssetData(loanToken.address),
    salt: generatePseudoRandomSalt().toString(),
    exchangeAddress: exchangeAddress.toLowerCase(),
    feeRecipientAddress: trader, // here we can point address for relay fees
    expirationTimeSeconds: "" + (latestBlock.timestamp + 86400),
  };

  //
  // 0xcdd06bb6098833408e28df886423485995ca7a02

  const provider = await new providers.Web3Provider(c.web3.currentProvider);
  const signer = await provider.getSigner(maker);
  const helper = await new Contract(artifacts.zeroExV2Helper.address, artifacts.zeroExV2Helper.abi, signer);
  const zeroExOrderHash1 = await helper.getOrderHash(zeroExOrder);
  console.dir("[TRACE] zeroExOrderHash1: " + zeroExOrderHash1);

  // creating hash for exchange order
  const zeroExOrderHash = orderHashUtils.getOrderHashHex(zeroExOrder);
  console.dir("[TRACE] zeroExOrderHash: " + zeroExOrderHash);

  // checking exchange order has right
  const isValidZeroExOrderHash = orderHashUtils.isValidOrderHash(zeroExOrderHash1);
  console.dir("[TRACE] isValidZeroExOrderHash: " + isValidZeroExOrderHash);

  // signing exchange order
  const zeroExOrderSignature = await signatureUtils.ecSignOrderHashAsync(
    c.provider,
    zeroExOrderHash1,
    maker,
   "DEFAULT"
  );

  console.dir("zeroExOrderSignature: " + zeroExOrderSignature);
  
  // validating signature of lend order
  var is0xValidLendOrderSignature = await c.bzxjs.isValidSignatureAsync({
    account: maker,
    orderHash: zeroExOrderHash1,
    signature: zeroExOrderSignature
  });
  console.dir("0x is0xValidLendOrderSignature: " + is0xValidLendOrderSignature);

  const zeroExOrderSigned = { ...zeroExOrder, signature: zeroExOrderSignature };

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
    txOpts: { from: trader, gasLimit: utils.gasLimit }
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
