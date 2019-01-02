var TestNetFaucet = artifacts.require("TestNetFaucet");
var TestNetOracle = artifacts.require("TestNetOracle");
var WETHInterface = artifacts.require("WETHInterface");
var ERC20 = artifacts.require("ERC20");

//const DEPOSIT_BZRX = false;
//var BZRxToken = artifacts.require("BZRxToken");
//var TestNetBZRxToken = artifacts.require("TestNetBZRxToken");

const path = require("path");
const config = require("../protocol-config.js");

module.exports = (deployer, network, accounts) => {
  if (network == "ropsten" || network == "mainnet") {
    return;
  }

  if (network == "develop" || network == "development" || network == "testnet" || network == "coverage") {
    network = "development";
  } else {
    // comment out if we need to deploy to other networks
    return;
  }

  deployer.then(async () => {
    let testNetFaucet = await deployer.deploy(TestNetFaucet);

    var oracle = await TestNetOracle.deployed();
    await oracle.setFaucetContractAddress(testNetFaucet.address);
    await testNetFaucet.setOracleContractAddress(oracle.address);

    var weth = await WETHInterface.at(config["addresses"][network]["ZeroEx"]["WETH9"]);
    var weth_token = await ERC20.at(config["addresses"][network]["ZeroEx"]["WETH9"]);
    await weth.deposit({ from: accounts[9], value: web3.utils.toWei("90", "ether") }),
    await weth_token.transfer(testNetFaucet.address, web3.utils.toWei("90", "ether"), { from: accounts[9] });

    /*if (DEPOSIT_BZRX) {
      var bzrx_token;
      if (network == "ropsten" || network == "kovan" || network == "rinkeby") {
        bzrx_token = await BZRxToken.at(
          config["addresses"][network]["BZRXToken"]
        );
      } else {
        bzrx_token = await TestNetBZRxToken.deployed();
      }

      await bzrx_token.transfer(
        testNetFaucet.address,
        web3.utils.toWei(100000000000000000, "ether")
      );
    }*/

    console.log(`   > [${parseInt(path.basename(__filename))}] TestNetFaucet deploy: #done`);
  });
};
