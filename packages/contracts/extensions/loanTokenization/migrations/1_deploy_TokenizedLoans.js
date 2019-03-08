
const contract = require("truffle-contract");

let BZxOracle;

let BZxProxy = contract(require("../../../build/contracts/BZxProxy.json"));
BZxProxy.setNetwork(50);

let BZxVault = contract(require("../../../build/contracts/BZxVault.json"));
BZxVault.setNetwork(50);

var LoanToken = artifacts.require("LoanToken");
var PositionToken = artifacts.require("PositionToken");


const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";

const path = require("path");
var config = require("../../../protocol-config.js");

module.exports = function(deployer, network, accounts) {

  network = network.replace("-fork", "");
  var weth_token_address;
  if (network == "development" || network == "develop" || network == "testnet" || network == "coverage") {
    network = "development";
    weth_token_address = config["addresses"][network]["ZeroEx"]["WETH9"]; //BZxEther.address;
  } else {
    return;
    weth_token_address = config["addresses"][network]["ZeroEx"]["WETH9"];
  }

  if (network == "mainnet" || network == "ropsten" || network == "kovan") {
    BZxOracle = contract(require("../../../build/contracts/BZxOracle.json"));
  } else {
    BZxOracle = contract(require("../../../build/contracts/TestNetOracle.json"));
  }
  BZxOracle.setNetwork(50);

  let tradeTokenAddress;
  if (network == "kovan") {
    tradeTokenAddress = "0xb2f3dd487708ca7794f633d9df57fdb9347a7aff"; // KNC (no DAI on Kovan Kyber)
  } else {
    let t = contract(require("../../../build/contracts/TestToken9.json"));
    t.setNetwork(50);
    tradeTokenAddress = t.address;
  }

  deployer.then(async function() {
    var loanOrderHash;
    var positionToken;

    await deployer.deploy(
      LoanToken,
      BZxProxy.address,
      BZxVault.address,
      BZxOracle.address,
      weth_token_address,
      weth_token_address, // loan token
      "bZx ETH iToken",
      "iETH"
    );

    let loanToken = await LoanToken.deployed();

    if (network == "development") {
      await loanToken.mintWithEther({value: web3.utils.toWei("10", "ether")});
    }

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
      tradeTokenAddress, // trade token
      leverageAmount,
      loanOrderHash,
      "bZx Perpetual Short ETH",
      "psETH"
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
    loanOrderHash = await loanToken.loanOrderHashes.call(leverageAmount);
    positionToken = await deployer.deploy(
      PositionToken,
      BZxProxy.address,
      BZxVault.address,
      BZxOracle.address,
      weth_token_address,
      weth_token_address, // loan token
      tradeTokenAddress, // trade token
      config["addresses"][network]["KyberContractAddress"] || NULL_ADDRESS,
      leverageAmount,
      loanOrderHash,
      "Perpetual Short ETH 2x",
      "psETH2x"
    );
    await positionToken.setLoanTokenLender(loanToken.address);
    /*await loanToken.addPositionToken(
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
      tradeTokenAddress, // trade token
      leverageAmount,
      loanOrderHash,
      "Perpetual Short ETH 3x",
      "psETH3x"
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
    /*loanOrderHash = await loanToken.loanOrderHashes.call(web3.utils.toWei(leverageAmount, "ether"));
    positionToken = await deployer.deploy(
      PositionToken,
      BZxProxy.address,
      BZxVault.address,
      BZxOracle.address,
      weth_token_address,
      weth_token_address, // loan token
      tradeTokenAddress, // trade token
      leverageAmount,
      loanOrderHash,
      "Perpetual Short ETH 4x",
      "psETH4x"
    );
    await positionToken.setLoanTokenLender(loanToken.address);
    await loanToken.addPositionToken(
      leverageAmount,
      positionToken.address);*/


    /*
    // 2x leverage (Long ETH)
    //TODO: deploy another loanToken for DAI (iDAI) for this
    leverageAmount = web3.utils.toWei("2", "ether");
    await loanToken.initLeverage(
      [
        leverageAmount, // 2x leverage
        web3.utils.toWei("50", "ether"), // initialMarginAmount
        web3.utils.toWei("15", "ether") // maintenanceMarginAmount
      ]
    );
    loanOrderHash = await loanToken.loanOrderHashes.call(leverageAmount);
    positionToken = await deployer.deploy(
      PositionToken,
      BZxProxy.address,
      BZxVault.address,
      BZxOracle.address,
      weth_token_address,
      tradeTokenAddress, // loan token
      weth_token_address, // trade token
      config["addresses"][network]["KyberContractAddress"] || NULL_ADDRESS,
      leverageAmount,
      loanOrderHash,
      "Perpetual Long ETH 2x",
      "plETH2x"
    );
    await positionToken.setLoanTokenLender(loanToken.address);
    */


    console.log(`   > [${parseInt(path.basename(__filename))}] TokenizedLoans deploy: #done`);
  });
};
