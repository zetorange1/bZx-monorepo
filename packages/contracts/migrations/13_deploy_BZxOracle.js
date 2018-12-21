var BZxOracle;

var BZRxToken = artifacts.require("BZRxToken");
var BZxVault = artifacts.require("BZxVault");
var BZxProxy = artifacts.require("BZxProxy");
var BZxProxySettings = artifacts.require("BZxProxySettings");
var OracleRegistry = artifacts.require("OracleRegistry");

var WETH = artifacts.require("WETHInterface");
var EIP20 = artifacts.require("EIP20");

const path = require("path");
const config = require("../protocol-config.js");

const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";

const OLD_ORACLE_ADDRESS = "";

module.exports = (deployer, network, accounts) => {
  if (network == "develop" || network == "testnet" || network == "coverage") {
    network = "development";
  }

  if (network == "mainnet" || network == "ropsten") {
    BZxOracle = artifacts.require("BZxOracle");
  } else {
    BZxOracle = artifacts.require("TestNetOracle");
  }

  var bzrx_token_address;
  if (network == "mainnet" || network == "ropsten" || network == "kovan" || network == "rinkeby") {
    bzrx_token_address = config["addresses"][network]["BZRXToken"];
    //bzrx_token_address = BZRxToken.address;
  } else {
    bzrx_token_address = BZRxToken.address;
  }

  if (bzrx_token_address) {
    // ensure deployed protocol token

    let valueAmount = "0";
    if (!OLD_ORACLE_ADDRESS) {
      valueAmount = web3.utils.toWei("1", "ether");
    }

    deployer
      .deploy(
        BZxOracle,
        BZxVault.address,
        config["addresses"][network]["KyberContractAddress"] || NULL_ADDRESS,
        config["addresses"][network]["ZeroEx"]["WETH9"],
        bzrx_token_address,
        { from: accounts[0] }
      )
      .then(async function() {
        var oracle = await BZxOracle.deployed();

        var wethT = await EIP20.at(config["addresses"][network]["ZeroEx"]["WETH9"]);
        if (!OLD_ORACLE_ADDRESS) {
          var weth = await WETH.at(config["addresses"][network]["ZeroEx"]["WETH9"]);
          await weth.deposit({ value: valueAmount });
          await wethT.transfer(oracle.address, valueAmount);
        }

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

          /*await bZxOracleOld.transferEther(
            oracleAddress,
            web3.utils.toWei(10000000, "ether")
          );*/
          var oldWETHBalance = await wethT.balanceOf(bZxOracleOld.address);
          if (oldWETHBalance.toNumber() !== 0) {
            await bZxOracleOld.transferToken(wethT.address, oracleAddress, oldWETHBalance);
          }

          await oracleRegistry.removeOracle(CURRENT_OLD_ORACLE_ADDRESS, 0);
          await bZxProxy.setOracleReference(OLD_ORACLE_ADDRESS, oracleAddress);
        }

        await oracleRegistry.addOracle(oracleAddress, "bZxOracle");

        console.log(`   > [${parseInt(path.basename(__filename))}] BZxOracle deploy: #done`);
      });
  }
};
