const Web3 = require("web3");

const { assetDataUtils, ContractWrappers, generatePseudoRandomSalt, orderHashUtils } = require("0x.js");

const { providers, Contract } = require("ethers");

const artifacts = require("./../../artifacts");

(async function zeroExHashScenario() {
  const zeroAddress = "0x0000000000000000000000000000000000000000";
  const trader1 = "0x06cef8e666768cc40cc78cf93d9611019ddcb628"; // accounts[6]
  const trader2 = "0x4404ac8bd8f9618d27ad2f1485aa1b2cfd82482d"; // accounts[7]
  const ganacheUri = "http://localhost:8545";
  const ganacheNetworkId = 50;

  const httpProvider = new Web3.providers.HttpProvider(ganacheUri);
  const web3 = new Web3(httpProvider);

  const latestBlock = await web3.eth.getBlock("latest");

  const loanToken = artifacts.testToken0;
  const exchangeToken = artifacts.testToken4;

  const contractWrappers = new ContractWrappers(httpProvider, { networkId: ganacheNetworkId });
  const exchangeAddress = contractWrappers.exchange.getContractAddress();

  // setting up order
  const zeroExOrder = {
    senderAddress: zeroAddress,
    makerAddress: trader2,
    takerAddress: zeroAddress,
    makerFee: web3.utils.toWei("0.000", "ether").toString(),
    takerFee: web3.utils.toWei("0.000", "ether").toString(),
    makerAssetAmount: web3.utils.toWei("12", "ether"),
    takerAssetAmount: web3.utils.toWei("12", "ether"),
    makerAssetData: assetDataUtils.encodeERC20AssetData(exchangeToken.address),
    takerAssetData: assetDataUtils.encodeERC20AssetData(loanToken.address),
    salt: generatePseudoRandomSalt().toString(),
    exchangeAddress: exchangeAddress.toLowerCase(),
    feeRecipientAddress: trader1, // here we can point address for relay fees
    expirationTimeSeconds: (latestBlock.timestamp + 86400).toString()
  };

  // creating hash for exchange order with ZeroExV2Helper contract
  const provider = await new providers.Web3Provider(web3.currentProvider);
  const signer = await provider.getSigner(trader2);
  const helper = await new Contract(artifacts.zeroExV2Helper.address, artifacts.zeroExV2Helper.abi, signer);
  const zeroExOrderHash1 = await helper.getOrderHash(zeroExOrder);
  console.dir("[TRACE] zeroExOrderHash (by helper): " + zeroExOrderHash1);

  // creating hash for exchange order with orderHashUtils by 0x.js
  const zeroExOrderHash = orderHashUtils.getOrderHashHex(zeroExOrder);
  console.dir("[TRACE] zeroExOrderHash (by 0x.js): " + zeroExOrderHash);

  // checking exchange order has right format
  const isValidZeroExOrderHash1 = orderHashUtils.isValidOrderHash(zeroExOrderHash1);
  console.dir("[TRACE] isValidZeroExOrderHash (by helper): " + isValidZeroExOrderHash1);

  // checking exchange order has right format
  const isValidZeroExOrderHash = orderHashUtils.isValidOrderHash(zeroExOrderHash);
  console.dir("[TRACE] isValidZeroExOrderHash (by 0x.js): " + isValidZeroExOrderHash);
})();
