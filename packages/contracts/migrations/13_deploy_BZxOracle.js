

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
//const OLD_ORACLE_ADDRESS = "0xc1d91943248bf2e627ca2c52860a04cdb80903a4"; // mainnet

module.exports = (deployer, network, accounts) => {

  let weth_token_address;

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

  let FULCRUM_ORACLE = "";
  if (network == "mainnet") {
    FULCRUM_ORACLE = "0xf257246627f7cb036ae40aa6cfe8d8ce5f0eba63";
  } else if (network == "ropsten") {
    FULCRUM_ORACLE = "0xd5f66f2ac36b6d765a1cfdacbb7a8868c2d91a9d";
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

      const oracle = await BZxOracle.deployed();
      //const oracle = await BZxOracle.at("...");

      const oracleAddress = oracle.address;

      await oracleNotifier.transferBZxOwnership(oracleAddress);

      if (network == "mainnet") {
        let txData = web3.eth.abi.encodeFunctionSignature('registerWallet(address)') +
          web3.eth.abi.encodeParameters(['address'], [oracleAddress]).substr(2);

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
        await weth.transfer(oracleAddress, valueAmount);
      }

      var bZxProxy = await BZxProxySettings.at(BZxProxy.address);
      await oracle.transferBZxOwnership(BZxProxy.address);
      await bZxProxy.setOracleReference(oracleAddress, oracleAddress);

      if (FULCRUM_ORACLE) {
        await bZxProxy.setOracleReference(FULCRUM_ORACLE, oracleAddress);
      }

      /*if (network != "mainnet" && network != "ropsten" && network != "kovan" && network != "rinkeby") {
      await oracle.setDebugMode(true);
    }*/

      var oracleRegistry = await OracleRegistry.deployed();

      if (OLD_ORACLE_ADDRESS) {
        var CURRENT_OLD_ORACLE_ADDRESS = await oracleRegistry.oracleAddresses(0);
        var bZxOracleOld = await BZxOracle.at(CURRENT_OLD_ORACLE_ADDRESS);

        /*await bZxOracleOld.transferEther(
          oracleAddress,
          web3.utils.toWei(10000000, "ether")
        );*/

        let tokenBalance;

        tokenBalance = await weth.balanceOf(bZxOracleOld.address);
        if (tokenBalance.toString() !== "0") {
          await bZxOracleOld.transferToken(weth.address, oracleAddress, tokenBalance);
          console.log("Done with WETH transfer.");
        }

        if (network == "mainnet") {
          let otherToken;

          // KNC Transfer
          otherToken = await BZxEther.at("0xdd974d5c2e2928dea5f71b9825b8b646686bd200");
          tokenBalance = await otherToken.balanceOf(bZxOracleOld.address);
          if (tokenBalance.toString() !== "0") {
            await bZxOracleOld.transferToken(otherToken.address, oracleAddress, tokenBalance);
          }

          // DAI Transfer
          otherToken = await BZxEther.at("0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359");
          tokenBalance = await otherToken.balanceOf(bZxOracleOld.address);
          if (tokenBalance.toString() !== "0") {
            await bZxOracleOld.transferToken(otherToken.address, oracleAddress, tokenBalance);
          }

          // USDC Transfer
          otherToken = await BZxEther.at("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
          tokenBalance = await otherToken.balanceOf(bZxOracleOld.address);
          if (tokenBalance.toString() !== "0") {
            await bZxOracleOld.transferToken(otherToken.address, oracleAddress, tokenBalance);
          }

          console.log("Done with other token transfers.");
        }

        await oracleRegistry.removeOracle(CURRENT_OLD_ORACLE_ADDRESS, 0);

        if (FULCRUM_ORACLE && FULCRUM_ORACLE !== OLD_ORACLE_ADDRESS) {
          await bZxProxy.setOracleReference(OLD_ORACLE_ADDRESS, oracleAddress);
        }

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
          await testNetFaucet.setOracleContractAddress(oracleAddress);
        }
      }

      await oracleRegistry.addOracle(oracleAddress, "bZxOracle");

      console.log(`   > [${parseInt(path.basename(__filename))}] BZxOracle deploy: #done`);
    });
  }
};
