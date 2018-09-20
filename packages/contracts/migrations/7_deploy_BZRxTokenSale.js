
var BZRxTokenSale = artifacts.require("BZRxTokenSale");
var BZRxToken = artifacts.require("BZRxToken");
var TestNetPriceFeed = artifacts.require("TestNetPriceFeed");

var BZxProxy = artifacts.require("BZxProxy");
var BZxProxySettings = artifacts.require("BZxProxySettings");
var BZxVault = artifacts.require("BZxVault");

var config = require("../protocol-config.js");

module.exports = function(deployer, network, accounts) {
  network = network.replace("-fork", "");
  if (network == "develop" || network == "testnet" || network == "coverage")
    network = "development";
  
  const currentBonus = 110; // 10% bonus

  let priceContractAddress;

  deployer.then(async function() {

    if (network == "mainnet") {
      priceContractAddress = "0x729D19f657BD0614b4985Cf1D82531c67569197B";
    }
    else if (network == "kovan") {
      priceContractAddress = "0xa5aA4e07F5255E14F02B385b1f04b35cC50bdb66";
    }
    else if (network == "ropsten" || network == "development") {
      await deployer.deploy(TestNetPriceFeed);
      priceContractAddress = TestNetPriceFeed.address;
    }
    else {
      return;
    }

    var tokensale = await deployer.deploy(
      BZRxTokenSale, 
      BZRxToken.address, 
      BZxVault.address, 
      config["addresses"][network]["ZeroEx"]["WETH9"], 
      priceContractAddress,
      currentBonus);

    var bZRxToken = await BZRxToken.deployed();
    await bZRxToken.addMinter(BZRxTokenSale.address);

    // bZx Proxy uses BZRxTokenSale contract as BZRX token until the tokensale ends
    var bZxProxy = await BZxProxySettings.at(BZxProxy.address);
    await bZxProxy.setBZRxToken(BZRxTokenSale.address);
  });
};
