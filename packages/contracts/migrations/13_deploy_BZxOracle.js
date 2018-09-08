var BZxOracle;

var TestNetBZRxToken = artifacts.require("TestNetBZRxToken");
var BZxVault = artifacts.require("BZxVault");
var BZxProxy = artifacts.require("BZxProxy");
var BZxProxySettings = artifacts.require("BZxProxySettings");
var OracleRegistry = artifacts.require("OracleRegistry");

var config = require("../protocol-config.js");

const OLD_ORACLE_ADDRESS = "";

module.exports = function(deployer, network, accounts) {
  network = network.replace("-fork", "");
  if (network == "develop" || network == "testnet" || network == "coverage")
    network = "development";

  if (network == "mainnet" || network == "ropsten") {
    BZxOracle = artifacts.require("BZxOracle");
  } else {
    BZxOracle = artifacts.require("TestNetOracle");
  }

  var bzrx_token_address;
  if (
    network == "mainnet" ||
    network == "ropsten" ||
    network == "kovan" ||
    network == "rinkeby"
  ) {
    bzrx_token_address = config["addresses"][network]["BZRXToken"];
  } else {
    bzrx_token_address = TestNetBZRxToken.address;
  }

  if (bzrx_token_address) {
    // ensure deployed protocol token
    
    let valueAmount = "0";
    if (!OLD_ORACLE_ADDRESS) {
      valueAmount = web3.toWei(1, "ether");
    }

    deployer
      .deploy(
        BZxOracle,
        BZxVault.address,
        config["addresses"][network]["KyberContractAddress"],
        config["addresses"][network]["ZeroEx"]["WETH9"],
        bzrx_token_address,
        { from: accounts[0], value: valueAmount }
      )
      .then(async function() {
        var oracle = await BZxOracle.deployed();
        // seeds BZxOracle with 1 Ether

        var bZxProxy = await BZxProxySettings.at(BZxProxy.address);
        await oracle.transferBZxOwnership(BZxProxy.address);
        await bZxProxy.setOracleReference(BZxOracle.address, BZxOracle.address);

        /*if (network != "mainnet" && network != "ropsten" && network != "kovan" && network != "rinkeby") {
				await oracle.setDebugMode(true);
			}*/

        var oracleAddress = BZxOracle.address;
        var oracleRegistry = await OracleRegistry.deployed();

        if (OLD_ORACLE_ADDRESS) {
          var CURRENT_OLD_ORACLE_ADDRESS = await oracleRegistry.oracleAddresses(0);
          var bZxOracleOld = await BZxOracle.at(CURRENT_OLD_ORACLE_ADDRESS);
          await bZxOracleOld.transferEther(
            oracleAddress,
            web3.toWei(10000000, "ether")
          );
          //await bZxOracleOld.transferToken(bzrx_token_address, oracleAddress, "75218865740740738");
          await oracleRegistry.removeOracle(CURRENT_OLD_ORACLE_ADDRESS, 0);
          await bZxProxy.setOracleReference(OLD_ORACLE_ADDRESS, oracleAddress);
        }

        await oracleRegistry.addOracle(oracleAddress, "bZxOracle");
      });
  }
};
