
var BZxOracle;
var BZxProxy = artifacts.require("BZxProxy");
var BZxProxySettings = artifacts.require("BZxProxySettings");
var BZxVault = artifacts.require("BZxVault");

var LoanToken = artifacts.require("LoanToken");
var PositionToken = artifacts.require("PositionToken");

//var BZxEther = artifacts.require("BZxEther");

// normally DAI
//var DAI = artifacts.require("TestToken9");

const path = require("path");
var config = require("../protocol-config.js");

module.exports = function(deployer, network, accounts) {

  network = network.replace("-fork", "");
  var weth_token_address;
  if (network == "development" || network == "develop" || network == "testnet" || network == "coverage") {
    network = "development";
    weth_token_address = config["addresses"][network]["ZeroEx"]["WETH9"]; //BZxEther.address;
  } else {
    weth_token_address = config["addresses"][network]["ZeroEx"]["WETH9"];
  }

  if (network == "mainnet" || network == "ropsten") {
    BZxOracle = artifacts.require("BZxOracle");
  } else {
    BZxOracle = artifacts.require("TestNetOracle");
  }

  deployer.then(async function() {
    var loanOrderHash;
    var positionToken;

    var loanToken = await deployer.deploy(
      LoanToken,
      BZxProxy.address,
      BZxVault.address,
      BZxOracle.address,
      weth_token_address,
      weth_token_address, // loan token
      "bZx ETH iToken",
      "iETH"
    );

    let leverageAmount;

    // 1x leverage
    leverageAmount = web3.utils.toWei("1", "ether");
    await loanToken.initLeverage(
      [
        leverageAmount, // 1x leverage
        web3.utils.toWei("100", "ether"), // initialMarginAmount
        web3.utils.toWei("15", "ether") // maintenanceMarginAmount
      ]
    );
    /*loanOrderHash = await loanToken.loanOrderHashes.call(leverageAmount);
    positionToken = await deployer.deploy(
      PositionToken,
      BZxProxy.address,
      BZxVault.address,
      BZxOracle.address,
      weth_token_address,
      weth_token_address, // loan token
      DAI.address, // trade token
      leverageAmount,
      loanOrderHash,
      "bZx ETH pToken 1xShort",
      "pETH1xShort"
    );
    await positionToken.setLoanTokenLender(loanToken.address);
    await loanToken.addPositionToken(
      web3.utils.toWei("1", "ether"),
      positionToken.address);*/


    // 2x leverage
    leverageAmount = web3.utils.toWei("2", "ether");
    await loanToken.initLeverage(
      [
        leverageAmount, // 2x leverage
        web3.utils.toWei("50", "ether"), // initialMarginAmount
        web3.utils.toWei("15", "ether") // maintenanceMarginAmount
      ]
    );
    /*loanOrderHash = await loanToken.loanOrderHashes.call(leverageAmount);
    positionToken = await deployer.deploy(
      PositionToken,
      BZxProxy.address,
      BZxVault.address,
      BZxOracle.address,
      weth_token_address,
      weth_token_address, // loan token
      DAI.address, // trade token
      leverageAmount,
      loanOrderHash,
      "bZx ETH pToken 2xShort",
      "pETH2xShort"
    );
    await positionToken.setLoanTokenLender(loanToken.address);
    await loanToken.addPositionToken(
      web3.utils.toWei("2", "ether"),
      positionToken.address);*/


    // 3x leverage
    leverageAmount = web3.utils.toWei("3", "ether");
    await loanToken.initLeverage(
      [
        leverageAmount, // 3x leverage
        web3.utils.toWei("33.333333333333333333", "ether"), // initialMarginAmount
        web3.utils.toWei("15", "ether") // maintenanceMarginAmount
      ]
    );
    /*loanOrderHash = await loanToken.loanOrderHashes.call(web3.utils.toWei(leverageAmount, "ether"));
    positionToken = await deployer.deploy(
      PositionToken,
      BZxProxy.address,
      BZxVault.address,
      BZxOracle.address,
      weth_token_address,
      weth_token_address, // loan token
      DAI.address, // trade token
      leverageAmount,
      loanOrderHash,
      "bZx ETH pToken 3xShort",
      "pETH3xShort"
    );
    await positionToken.setLoanTokenLender(loanToken.address);
    await loanToken.addPositionToken(
      leverageAmount,
      positionToken.address);*/

    // 4x leverage
    leverageAmount = web3.utils.toWei("4", "ether");
    await loanToken.initLeverage(
      [
        leverageAmount, // 4x leverage
        web3.utils.toWei("25", "ether"), // initialMarginAmount
        web3.utils.toWei("15", "ether") // maintenanceMarginAmount
      ]
    );

    console.log(`   > [${parseInt(path.basename(__filename))}] TokenizedLoans deploy: #done`);
  });
};
