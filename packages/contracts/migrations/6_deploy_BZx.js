var BZxProxy = artifacts.require("BZxProxy");
var BZxProxySettings = artifacts.require("BZxProxySettings");
var BZRxToken = artifacts.require("BZRxToken");
var BZxVault = artifacts.require("BZxVault");
var OracleRegistry = artifacts.require("OracleRegistry");
var BZxTo0x = artifacts.require("BZxTo0x");
var BZxTo0xV2 = artifacts.require("BZxTo0xV2");
var BZxEther = artifacts.require("BZxEther");

const config = require("../protocol-config.js");
const path = require("path");

module.exports = (deployer, network, accounts) => {
  if (network == "develop" || network == "testnet" || network == "coverage") {
    network = "development";
  }

  deployer.then(async () => {
    await deployer.deploy(BZxProxySettings);

    await deployer.deploy(BZxProxy, BZxProxySettings.address);

    var bZxProxy = await BZxProxySettings.at(BZxProxy.address);

    var bZRxToken, bZxEther, bzrx_token_address, bzrx_ether_address;

    if (network == "mainnet" || network == "ropsten" || network == "kovan" || network == "rinkeby") {
      bzrx_token_address = config["addresses"][network]["BZRXToken"];
      bzrx_ether_address = config["addresses"][network]["BZxEther"];
    } else {
      bZRxToken = await BZRxToken.deployed();
      bzrx_token_address = bZRxToken.address;

      bZxEther = await BZxEther.deployed();
      bzrx_ether_address = bZxEther.address;

      await bZxProxy.setDebugMode(true);
    }

    await bZxProxy.setBZxAddresses(
      bzrx_token_address,
      bzrx_ether_address,
      config["addresses"][network]["ZeroEx"]["WETH9"],
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

    console.log(`   > [${parseInt(path.basename(__filename))}] BZx deploy/setup: #done`);
  });
};
