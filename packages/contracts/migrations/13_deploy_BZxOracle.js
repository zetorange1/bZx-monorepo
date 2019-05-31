

const deployNotifier = false;

var BZxOracle;
var BZRxToken = artifacts.require("BZRxToken");
var BZxVault = artifacts.require("BZxVault");
var BZxProxy = artifacts.require("BZxProxy");
var BZxProxySettings = artifacts.require("BZxProxySettings");
var OracleRegistry = artifacts.require("OracleRegistry");
var OracleNotifier = artifacts.require("OracleNotifier");

//var WETH = artifacts.require("WETHInterface");
var BZxEther = artifacts.require("BZxEther");

const path = require("path");
const config = require("../protocol-config.js");

const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";

const OLD_ORACLE_ADDRESS = "";

module.exports = (deployer, network, accounts) => {

  var weth_token_address;

  if (network == "development" || network == "develop" || network == "testnet" || network == "coverage") {
    network = "development";
    weth_token_address = config["addresses"][network]["ZeroEx"]["WETH9"];
  } else {
    weth_token_address = config["addresses"][network]["ZeroEx"]["WETH9"];
  }

  if (network == "mainnet" || network == "ropsten" || network == "kovan") {
    BZxOracle = artifacts.require("BZxOracle");
  } else {
    BZxOracle = artifacts.require("TestNetOracle");
  }

  var bzrx_token_address;
  if (network == "mainnet" || network == "ropsten" || network == "kovan" || network == "rinkeby") {
    bzrx_token_address = config["addresses"][network]["BZRXToken"];
  } else {
    bzrx_token_address = BZRxToken.address;
  }

  if (bzrx_token_address) {
    // ensure deployed protocol token

    let valueAmount = "0";
    if (!OLD_ORACLE_ADDRESS) {
      valueAmount = web3.utils.toWei("1", "ether");
    }

    deployer.then(async function() {

      var oracleNotifier;
      if (network == "development" || deployNotifier) {
        oracleNotifier = await deployer.deploy(OracleNotifier);
      } else {
        if (!config["addresses"][network]["OracleNotifier"]) {
          console.log("OracleNotifier address not found in config!");
          process.exit();
        }
        oracleNotifier = await OracleNotifier.at(config["addresses"][network]["OracleNotifier"]);
      }

      await deployer.deploy(
        BZxOracle,
        BZxVault.address,
        config["addresses"][network]["KyberContractAddress"] || NULL_ADDRESS,
        weth_token_address,
        bzrx_token_address,
        oracleNotifier.address,
        { from: accounts[0] }
      );

      var oracle = await BZxOracle.deployed();

      await oracleNotifier.transferBZxOwnership(oracle.address);

      if (network == "mainnet") {
        let txData = web3.eth.abi.encodeFunctionSignature('registerWallet(address)') +
          web3.eth.abi.encodeParameters(['address'], [oracle.address]).substr(2);

        await web3.eth.sendTransaction({
          from: accounts[0],
          to: config["addresses"][network]["KyberRegisterWallet"],
          data: txData,
          gasPrice: 10000000000
        });
      }

      var weth = await BZxEther.at(weth_token_address);
      if (!OLD_ORACLE_ADDRESS) {
        await weth.deposit({ value: valueAmount });
        await weth.transfer(oracle.address, valueAmount);
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
        var oldWETHBalance = await weth.balanceOf(bZxOracleOld.address);
        if (oldWETHBalance.toString() !== "0") {
          await bZxOracleOld.transferToken(weth.address, oracleAddress, oldWETHBalance);

          /*await bZxOracleOld.transferToken("0xdd974d5c2e2928dea5f71b9825b8b646686bd200", oracleAddress, "0");
          await bZxOracleOld.transferToken("0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359", oracleAddress, "0");
          console.log("Done with transfers");*/
        }

        await oracleRegistry.removeOracle(CURRENT_OLD_ORACLE_ADDRESS, 0);

        await bZxProxy.setOracleReference(OLD_ORACLE_ADDRESS, oracleAddress);

        /*if (CURRENT_OLD_ORACLE_ADDRESS.toLowerCase() != OLD_ORACLE_ADDRESS.toLowerCase()) {
          await bZxProxy.setOracleReference(CURRENT_OLD_ORACLE_ADDRESS, oracleAddress);
        }*/

        if (network == "development") {
          for(let i=0; i <= 9; i++) {
            let t = await artifacts.require("TestToken"+i);

            let rate = (await bZxOracleOld.getTradeData(
              t.address,
              weth_token_address,
              "0"
            )).sourceToDestRate;
            await oracle.setRates(
              t.address,
              weth_token_address,
              rate.toString()
            );
          }

          let TestNetFaucet = artifacts.require("TestNetFaucet");
          let testNetFaucet = await TestNetFaucet.deployed();
          await oracle.setFaucetContractAddress(testNetFaucet.address);
          await testNetFaucet.setOracleContractAddress(oracle.address);
        }
      }

      await oracleRegistry.addOracle(oracleAddress, "bZxOracle");

      console.log(`   > [${parseInt(path.basename(__filename))}] BZxOracle deploy: #done`);
    });
  }
};
