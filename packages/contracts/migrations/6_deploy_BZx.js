var BZxProxy = artifacts.require("BZxProxy");
var BZxProxySettings = artifacts.require("BZxProxySettings");

var BZRxToken = artifacts.require("BZRxToken");
var BZxVault = artifacts.require("BZxVault");
var OracleRegistry = artifacts.require("OracleRegistry");
var BZxTo0x = artifacts.require("BZxTo0x");
var BZxTo0xV2 = artifacts.require("BZxTo0xV2");

var config = require("../protocol-config.js");

module.exports = function(deployer, network, accounts) {
  network = network.replace("-fork", "");
  if (network == "develop" || network == "testnet" || network == "coverage")
    network = "development";

  deployer.deploy(BZxProxySettings).then(async function() {

    await deployer.deploy(BZxProxy, BZxProxySettings.address);
    var bZxProxy = await BZxProxySettings.at(BZxProxy.address);
     
    var bZRxToken;
    var bzrx_token_address;
    if (
      network == "mainnet" ||
      network == "ropsten" ||
      network == "kovan" ||
      network == "rinkeby"
    ) {
      bzrx_token_address = config["addresses"][network]["BZRXToken"];
    } else {
      bZRxToken = await BZRxToken.deployed();
      bzrx_token_address = bZRxToken.address;

      await bZxProxy.setDebugMode(true);
    }

    await bZxProxy.setBZxAddresses(
      bzrx_token_address,
      BZxVault.address,
      OracleRegistry.address,
      BZxTo0x.address,
      BZxTo0xV2.address
    );

    var vault = await BZxVault.deployed();
    await vault.transferBZxOwnership(bZxProxy.address);

    var bZxTo0x = await BZxTo0x.deployed();
    await bZxTo0x.transferBZxOwnership(bZxProxy.address);

    var bZxTo0xV2 = await BZxTo0xV2.deployed();
    await bZxTo0xV2.transferBZxOwnership(bZxProxy.address);
  });
};
