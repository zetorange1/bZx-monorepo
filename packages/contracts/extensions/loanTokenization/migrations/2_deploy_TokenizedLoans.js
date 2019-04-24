
const contract = require("truffle-contract");
const fs = require('fs').promises;

const networkIds = {
  mainnet: 1,
  ropsten: 3,
  rinkeby: 4,
  kovan: 42,
  development: 50,
};

let BZxOracle;

let BZxProxy = contract(require("../../../build/contracts/BZxProxy.json"));
let BZxVault = contract(require("../../../build/contracts/BZxVault.json"));
let LoanToken = artifacts.require("LoanToken");
let PositionToken = artifacts.require("PositionToken");
let LoanTokenLogic = artifacts.require("LoanTokenLogic");
let EtherLoanTokenLogic = artifacts.require("EtherLoanTokenLogic");
let PositionTokenLogic = artifacts.require("PositionTokenLogic");
let TokenizedRegistry = artifacts.require("TokenizedRegistry");

let etherLoanTokenLogic, loanTokenLogic, positionTokenLogic;

const path = require("path");
let config = require("../../../protocol-config.js");

module.exports = function(deployer, network, accounts) {

  network = network.replace("-fork", "");
  let weth_token_address;
  if (network == "development" || network == "develop" || network == "testnet" || network == "coverage") {
    network = "development";
    weth_token_address = config["addresses"][network]["ZeroEx"]["WETH9"]; //BZxEther.address;
  } else {
    weth_token_address = config["addresses"][network]["ZeroEx"]["WETH9"];
  }

  if (network == "mainnet" || network == "ropsten" || network == "kovan") {
    BZxOracle = contract(require("../../../build/contracts/BZxOracle.json"));
  } else {
    BZxOracle = contract(require("../../../build/contracts/TestNetOracle.json"));
  }

  BZxProxy.setNetwork(networkIds[network]);
  BZxVault.setNetwork(networkIds[network]);
  BZxOracle.setNetwork(networkIds[network]);

  var dai_token_address;
  if (network == "mainnet" || network == "ropsten" || network == "kovan" || network == "rinkeby") {
    dai_token_address = config["addresses"][network]["DAITokenAddress"];
  } else {
    let t = contract(require("../../../build/contracts/TestToken9.json"));
    t.setNetwork(networkIds[network]);
    dai_token_address = t.address;
  }

  deployer.then(async function() {

    await fs.appendFile("TokenizedLoans_"+network+".log", "-------\n");

    let iDAI = await deployIToken(
      "Fulcrum DAI iToken",
      "iDAI",
      dai_token_address
    );
    // let iDAI = LoanTokenLogic.at(idai_token_address);

    let iETH = await deployIToken(
      "Fulcrum ETH iToken",
      "iETH",
      weth_token_address
    );
    // let iETH = LoanTokenLogic.at(ieth_token_address);

    for (let leverageAmount=2; leverageAmount <= 2; leverageAmount++) {
    //for (let leverageAmount=1; leverageAmount <= 4; leverageAmount++) {
      await deployPToken(
        leverageAmount,      
        "ETH",
        "short",
        weth_token_address, // baseTokenAddress
        dai_token_address, // unitOfAccountTokenAddress
        iETH // loanTokenDeployed
      );

      await deployPToken(
        leverageAmount,      
        "ETH",
        "long",
        weth_token_address, // baseTokenAddress
        dai_token_address, // unitOfAccountTokenAddress
        iDAI // loanTokenDeployed
      );
    }

    async function deployIToken(
      name,
      symbol,
      loanTokenAddress
    ) 
    {
      let logicContract;
      if (symbol == "iETH") {
        if (!etherLoanTokenLogic) {
          etherLoanTokenLogic = await deployer.deploy(
            EtherLoanTokenLogic
          );
        }
        logicContract = etherLoanTokenLogic;
      } else {
        if (!loanTokenLogic) {
          loanTokenLogic = await deployer.deploy(
            LoanTokenLogic
          );
        }
        logicContract = loanTokenLogic;
      }

      let loanTokenProxy = await deployer.deploy(
        LoanToken,
        logicContract.address
      );
      let loanToken = await EtherLoanTokenLogic.at(loanTokenProxy.address);
      await loanToken.initialize(
        BZxProxy.address,
        BZxVault.address,
        BZxOracle.address,
        loanTokenAddress,
        TokenizedRegistry.address,
        name,
        symbol
      );

      for (let leverageAmount=1; leverageAmount <= 4; leverageAmount++) {
          let initialMarginAmount, maintenanceMarginAmount;
          if (leverageAmount == 1) {
            initialMarginAmount = web3.utils.toWei("100", "ether");
            maintenanceMarginAmount = web3.utils.toWei("15", "ether");
          } else if (leverageAmount == 2) {
            initialMarginAmount = web3.utils.toWei("50", "ether");
            maintenanceMarginAmount = web3.utils.toWei("15", "ether");
          } else if (leverageAmount == 3) {
            initialMarginAmount = web3.utils.toWei("33.333333333333333333", "ether");
            maintenanceMarginAmount = web3.utils.toWei("15", "ether");
          } else if (leverageAmount == 4) {
            initialMarginAmount = web3.utils.toWei("25", "ether");
            maintenanceMarginAmount = web3.utils.toWei("15", "ether");
          } else {
            console.log("Leverage unsupported!");
            process.exit();
          }                
        
        await loanToken.initLeverage(
          [
            web3.utils.toWei(leverageAmount.toString(), "ether"),
            initialMarginAmount,
            maintenanceMarginAmount
          ]
        );
      }

      await fs.appendFile("TokenizedLoans_"+network+".log", "LoanToken\t"+loanToken.address+"\t"+loanTokenAddress+"\t"+name+"\t"+symbol+"\n");

      if (network == "development" && symbol == "iETH") {
        await loanToken.mintWithEther(accounts[0], {value: web3.utils.toWei("10", "ether")});
      }

      return loanToken;
    }

    async function deployPToken(
      leverageAmount,
      assetSymbol,
      type,
      baseTokenAddress,
      unitOfAccountTokenAddress,
      loanTokenDeployed
    ) 
    {
      // 100/15, 50/15, 33.333333333333333333/15, 25/15
      let name, symbol;

      if (type == "long") {
        if (leverageAmount == 1) {
          return;
        } else {
          name = "Fulcrum Perpetual Long "+assetSymbol+" "+leverageAmount+"x";
          symbol = "pl"+assetSymbol+leverageAmount+"x";
        }
      } else { // type == "short"
        if (leverageAmount == 1) {
          name = "Fulcrum Perpetual Short "+assetSymbol;
          symbol = "ps"+assetSymbol;
        } else {
          name = "Fulcrum Perpetual Short "+assetSymbol+" "+leverageAmount+"x";
          symbol = "ps"+assetSymbol+leverageAmount+"x";
        }
      }

      let leverageAmountWei = web3.utils.toWei(leverageAmount.toString(), "ether");
      let loanOrderHash = await loanTokenDeployed.loanOrderHashes.call(leverageAmountWei);
      if (!positionTokenLogic) {
        positionTokenLogic = await deployer.deploy(
          PositionTokenLogic
        );
      }
      let positionTokenProxy = await deployer.deploy(
        PositionToken,
        positionTokenLogic.address
      );
      let positionToken = await PositionTokenLogic.at(positionTokenProxy.address);
      await positionToken.initialize(
        BZxProxy.address,
        BZxVault.address,
        BZxOracle.address,
        weth_token_address,
        type == "short" ? baseTokenAddress : unitOfAccountTokenAddress, // loan token
        type == "short" ? unitOfAccountTokenAddress : baseTokenAddress, // trade token
        leverageAmountWei,
        loanOrderHash,
        name,
        symbol
      );
      await positionToken.setLoanTokenLender(loanTokenDeployed.address);
    
      await fs.appendFile("TokenizedLoans_"+network+".log", "PositionToken\t"+positionToken.address+"\t"
        + (type == "short" ? unitOfAccountTokenAddress : baseTokenAddress)
        + "\t"+name+"\t"+symbol+"\n");

      return positionToken;
    }

    console.log(`   > [${parseInt(path.basename(__filename))}] TokenizedLoans deploy: #done`);
  });
};

