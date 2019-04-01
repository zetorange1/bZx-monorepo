
const contract = require("truffle-contract");

let BZxOracle;

let BZxProxy = contract(require("../../../build/contracts/BZxProxy.json"));
BZxProxy.setNetwork(50);

let BZxVault = contract(require("../../../build/contracts/BZxVault.json"));
BZxVault.setNetwork(50);

var LoanToken = artifacts.require("LoanToken");
var PositionToken = artifacts.require("PositionToken");

var LoanTokenLogic = artifacts.require("LoanTokenLogic");
var EtherLoanTokenLogic = artifacts.require("EtherLoanTokenLogic");
var PositionTokenLogic = artifacts.require("PositionTokenLogic");

var ERC20 = artifacts.require("ERC20");

const BN = require("bn.js");
const MAX_UINT = (new BN(2)).pow(new BN(256)).sub(new BN(1));

const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";

const path = require("path");
var config = require("../../../protocol-config.js");

let pTokenListAddresses = [];
let pTokenListTradeTokens = [];
let pTokenListToggles = [];

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
    let loanOrderHash;
    let loanToken, positionToken;
    let loanTokenLogic, loanTokenProxy, positionTokenLogic, positionTokenProxy;

    // Deploy iETH
    loanTokenLogic = await deployer.deploy(
      EtherLoanTokenLogic
    );
    loanTokenProxy = await deployer.deploy(
      LoanToken,
      loanTokenLogic.address
    );
    loanToken = await EtherLoanTokenLogic.at(loanTokenProxy.address);
    await loanToken.initialize(
      BZxProxy.address,
      BZxVault.address,
      BZxOracle.address,
      weth_token_address, // loan token
      "bZx ETH iToken",
      "iETH"
    );

    if (network == "development") {
      await loanToken.mintWithEther(accounts[0], {value: web3.utils.toWei("10", "ether")});
    }

    let leverageAmount;

    // 100/15, 50/15, 33.333333333333333333/15, 25/15

    // 2x leverage (ETH Short)
    leverageAmount = web3.utils.toWei("2", "ether");
    await loanToken.initLeverage(
      [
        leverageAmount, // 2x leverage
        web3.utils.toWei("50", "ether"), // initialMarginAmount
        web3.utils.toWei("15", "ether") // maintenanceMarginAmount
      ]
    );
    loanOrderHash = await loanToken.loanOrderHashes.call(leverageAmount);
    positionTokenLogic = await deployer.deploy(
      PositionTokenLogic
    );
    positionTokenProxy = await deployer.deploy(
      PositionToken,
      positionTokenLogic.address
    );
    positionToken = await PositionTokenLogic.at(positionTokenProxy.address);
    await positionToken.initialize(
      BZxProxy.address,
      BZxVault.address,
      BZxOracle.address,
      weth_token_address,
      weth_token_address, // loan token
      tradeTokenAddress, // trade token
      leverageAmount,
      loanOrderHash,
      "bZx Perpetual Short ETH 2x",
      "psETH2x"
    );
    addPToken(positionToken.address, tradeTokenAddress);
    await positionToken.setLoanTokenLender(loanToken.address);

    await loanToken.setPositionTokens(pTokenListAddresses, pTokenListTradeTokens, pTokenListToggles);

/*
    // Deploy iDAI
    
    loanTokenLogic = await deployer.deploy(
      LoanTokenLogic
    );
    loanTokenProxy = await deployer.deploy(
      LoanToken,
      loanTokenLogic.address
    );
    loanToken = await LoanTokenLogic.at(loanTokenProxy.address);
    await loanToken.initialize(
      BZxProxy.address,
      BZxVault.address,
      BZxOracle.address,
      tradeTokenAddress, // loan token
      "bZx DAI iToken",
      "iDAI"
    );

    if (network == "development") {
      await (await ERC20.at(tradeTokenAddress)).approve(loanToken.address, MAX_UINT);
      await loanToken.mint(accounts[0], web3.utils.toWei("10", "ether"));
    }

    // 2x leverage (Long ETH)
    leverageAmount = web3.utils.toWei("2", "ether");
    await loanToken.initLeverage(
      [
        leverageAmount, // 2x leverage
        web3.utils.toWei("50", "ether"), // initialMarginAmount
        web3.utils.toWei("15", "ether") // maintenanceMarginAmount
      ]
    );
    loanOrderHash = await loanToken.loanOrderHashes.call(leverageAmount);
    positionTokenLogic = await deployer.deploy(
      PositionTokenLogic
    );
    positionTokenProxy = await deployer.deploy(
      PositionToken,
      positionTokenLogic.address
    );
    positionToken = await PositionTokenLogic.at(positionTokenProxy.address);
    await positionToken.initialize(
      BZxProxy.address,
      BZxVault.address,
      BZxOracle.address,
      weth_token_address,
      tradeTokenAddress, // loan token
      weth_token_address, // trade token
      leverageAmount,
      loanOrderHash,
      "Perpetual Long ETH 2x",
      "plETH2x"
    );
    addPToken(positionToken.address, tradeTokenAddress);
    await positionToken.setLoanTokenLender(loanToken.address);

    //await loanToken.setPositionTokens(pTokenListAddresses, pTokenListTradeTokens, pTokenListToggles);
*/

    console.log(`   > [${parseInt(path.basename(__filename))}] TokenizedLoans deploy: #done`);
  });
};

function addPToken(address, loanToken)
{
  pTokenListAddresses.push(address);
  pTokenListTradeTokens.push(loanToken);
  pTokenListToggles.push(true);
}
