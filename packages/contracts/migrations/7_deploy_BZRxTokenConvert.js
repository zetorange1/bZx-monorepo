var BZRxTokenConvert = artifacts.require("BZRxTokenConvert");
var BZRxToken = artifacts.require("BZRxToken");
var BZRxTransferProxy = artifacts.require("BZRxTransferProxy");

var BZxProxy = artifacts.require("BZxProxy");
var BZxProxySettings = artifacts.require("BZxProxySettings");
var BZxVault = artifacts.require("BZxVault");
var BZxEther = artifacts.require("BZxEther");

var config = require("../protocol-config.js");
const path = require("path");

module.exports = (deployer, network, accounts) => {

  var bzrx_token_address, weth_token_address;

  if (network == "development" || network == "develop" || network == "testnet" || network == "coverage") {
    network = "development";
    bzrx_token_address = BZRxToken.address
    weth_token_address = config["addresses"]["development"]["ZeroEx"]["WETH9"]; //BZxEther.address;
  } else {
    bzrx_token_address = config["addresses"][network]["BZRXToken"];
    weth_token_address = config["addresses"][network]["ZeroEx"]["WETH9"];
  }

  deployer.then(async () => {

    await deployer.deploy(
      BZRxTokenConvert,
      bzrx_token_address,
      BZxVault.address,
      weth_token_address,
      "0"
    );

    var bZRxToken = await BZRxToken.at(bzrx_token_address);
    /*if (network == "development") {

      await deployer.deploy(
        BZRxTransferProxy,
        bzrx_token_address
      );

      await bZRxToken.addMinter(BZRxTransferProxy.address);
    }*/

    await bZRxToken.addMinter(BZRxTokenConvert.address);
    //await bZRxToken.addMinter(BZxVault.address);

    // bZx Proxy uses BZRxTokenConvert contract as BZRX token until the tokensale ends
    var bZxProxy = await BZxProxySettings.at(BZxProxy.address);
    await bZxProxy.setBZRxToken(BZRxTokenConvert.address);

    console.log(`   > [${parseInt(path.basename(__filename))}] BZx deploy/setup: #done`);
  });
};
