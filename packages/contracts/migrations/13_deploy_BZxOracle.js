var BZxOracle;

var TestNetBZRxToken = artifacts.require("TestNetBZRxToken");
var BZxVault = artifacts.require("BZxVault");
var BZxProxy = artifacts.require("BZxProxy");
var OracleRegistry = artifacts.require("OracleRegistry");

var config = require("../protocol-config.js");

const OLD_ORACLE_ADDRESS = "0x8593F6028b5B6c4F7899f9cf2e0bA2750b7f6Ee2";

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
    deployer
      .deploy(
        BZxOracle,
        BZxVault.address,
        config["addresses"][network]["KyberContractAddress"],
        config["addresses"][network]["ZeroEx"]["WETH9"],
        bzrx_token_address,
        { from: accounts[0], value: web3.toWei(1, "ether") }
      )
      .then(async function(oracle) {
        // seeds BZxOracle with 1 Ether

        var bZxProxy = await BZxProxy.deployed();
        await oracle.transferBZxOwnership(BZxProxy.address);
        await bZxProxy.setOracleReference(BZxOracle.address, BZxOracle.address);

        /*if (network != "mainnet" && network != "ropsten" && network != "kovan" && network != "rinkeby") {
				await oracle.setDebugMode(true);
			}*/

        var oracleAddress = BZxOracle.address;
        var oracleRegistry = await OracleRegistry.deployed();

        if (OLD_ORACLE_ADDRESS) {
          //var bZxOracleOld = await BZxOracle.at(OLD_ORACLE_ADDRESS);
          /*await bZxOracleOld.transferEther(
            oracleAddress,
            web3.toWei(10000000, "ether")
          );*/
          //await bZxOracleOld.transferToken(bzrx_token_address, oracleAddress, "75218865740740738");
          await oracleRegistry.removeOracle(OLD_ORACLE_ADDRESS, 0);
          await bZxProxy.setOracleReference(OLD_ORACLE_ADDRESS, oracleAddress);
        }

        await oracleRegistry.addOracle(oracleAddress, "bZxOracle");
      });
  }
};
