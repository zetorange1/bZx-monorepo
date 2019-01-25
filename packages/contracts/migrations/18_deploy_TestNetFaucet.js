const BigNumber = require("bignumber.js");

var TestNetFaucet = artifacts.require("TestNetFaucet");
var TestNetOracle = artifacts.require("TestNetOracle");
var WETHInterface = artifacts.require("WETHInterface");
var BZxEther = artifacts.require("BZxEther");
var ERC20 = artifacts.require("ERC20");


//const DEPOSIT_BZRX = false;
//var BZRxToken = artifacts.require("BZRxToken");
//var TestNetBZRxToken = artifacts.require("TestNetBZRxToken");

const path = require("path");
const config = require("../protocol-config.js");

module.exports = (deployer, network, accounts) => {
  if (network == "mainnet" || network == "ropsten" || network == "kovan") {
    // never deploy to these networks
    return;
  }

  var weth_token_address;

  if (network == "development" || network == "develop" || network == "testnet" || network == "coverage") {
    network = "development";
    weth_token_address = BZxEther.address; // config["addresses"][network]["ZeroEx"]["WETH9"];
  } else {
    // comment out if we need to deploy to other networks
    return;
  }

  deployer.then(async () => {
    let testNetFaucet = await deployer.deploy(TestNetFaucet);

    var oracle = await TestNetOracle.deployed();
    await oracle.setFaucetContractAddress(testNetFaucet.address);
    await testNetFaucet.setOracleContractAddress(oracle.address);

    var weth = await BZxEther.deployed();
    var weth = await WETHInterface.at(weth_token_address);
    var weth_token = await ERC20.at(weth_token_address);
    const ethBalance = BigNumber(await web3.eth.getBalance(accounts[9]));
    if (ethBalance.gt(web3.utils.toWei("2", "ether"))) {
      let ethAmount = BigNumber(web3.utils.toWei("90", "ether"));
      if (ethBalance.lt(ethAmount))
        ethAmount = ethBalance;
      ethAmount = ethAmount.minus(web3.utils.toWei("1", "ether"));
      await weth.deposit({ from: accounts[9], value: ethAmount.toString(), gas: 200000 }),
      await weth_token.transfer(testNetFaucet.address, ethAmount.toString(), { from: accounts[9] });
    }

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
