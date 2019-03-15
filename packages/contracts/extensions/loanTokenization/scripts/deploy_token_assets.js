
// This script should be called with: truffle exec ./deploy_token_assets.js --network ropsten

let argv = require("minimist")(process.argv.slice(2));
let network = argv["network"];
if (network === undefined) {
  network = "development";
}

const secrets = require("../../../../../../config/secrets.js");
const fs = require("fs");
if (!secrets["assets_path"] || !fs.existsSync(secrets["assets_path"])) {
  console.log(secrets["assets_path"]+" not found");
  process.exit();
}

const BN = require("bn.js");
const mkdirp = require("mkdirp");
const rimraf = require("rimraf");
const web3utils = require("web3-utils");
const config = require("../../../protocol-config.js");

const LoanToken = artifacts.require("LoanToken");
const PositionToken = artifacts.require("PositionToken");

const BZxProxy = artifacts.require("BZxProxy");
const BZxVault = artifacts.require("BZxVault");

const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";

let BZxOracle;
if (network == "mainnet" || network == "ropsten" || network == "kovan") {
  BZxOracle = artifacts.require("BZxOracle");
} else {
  BZxOracle = artifacts.require("TestNetOracle");
}

let dai_token_address, kyber_address;
if (network == "development") {
  dai_token_address = artifacts.require("TestToken9").address;
  kyber_address = NULL_ADDRESS;
} else {
  dai_token_address = config["addresses"][network]["DAITokenAddress"];
  kyber_address = config["addresses"][network]["KyberContractAddress"];
}

let weth_token_address = config["addresses"][network]["ZeroEx"]["WETH9"];



module.exports = async function(callback) {

  if (false) {
    console.log("Script disabled!");
    process.exit();
  }

  if (!secrets["assets_path"] || !fs.existsSync(secrets["assets_path"])) {
    console.log(secrets["assets_path"]+" not found");
    process.exit();
  }
  
  try {
    await rimraf(secrets["assets_path"]+network);
  } catch (e) {}
  await mkdirp.sync(secrets["assets_path"]+network);

  let accounts = await web3.eth.getAccounts();

  let iTokenETH, iTokenDAI; 
  let pToken, tokenName, tokenSymbol, leverageAmount, loanOrderHash;

  // iETH token
  tokenName = "bZx ETH iToken";
  tokenSymbol = "iETH";
  console.log("Deploying "+tokenName+" ("+tokenSymbol+").");
  iTokenETH = await LoanToken.new(
    BZxProxy.address,
    BZxVault.address,
    BZxOracle.address,
    weth_token_address,
    weth_token_address, // loan token
    tokenName,
    tokenSymbol
  );
  await processArtifacts(iTokenETH, tokenSymbol);

  // iDAI token
  tokenName = "bZx DAI iToken";
  tokenSymbol = "iDAI";
  console.log("Deploying "+tokenName+" ("+tokenSymbol+").");
  iTokenDAI = await LoanToken.new(
    BZxProxy.address,
    BZxVault.address,
    BZxOracle.address,
    weth_token_address,
    weth_token_address, // loan token
    tokenName,
    tokenSymbol
  );
  await processArtifacts(iTokenDAI, tokenSymbol);

  // 1x leverage short on ETH
  leverageAmount = toWei("1", "ether");
  await iTokenETH.initLeverage(
    [
      leverageAmount, // 1x leverage
      toWei("100", "ether"), // initialMarginAmount
      toWei("15", "ether") // maintenanceMarginAmount
    ]
  );
  loanOrderHash = await iTokenETH.loanOrderHashes.call(leverageAmount);
  
  tokenName = "Perpetual Short ETH";
  tokenSymbol = "psETH";
  console.log("Deploying "+tokenName+" ("+tokenSymbol+").");
  pToken = await PositionToken.new(
    BZxProxy.address,
    BZxVault.address,
    BZxOracle.address,
    weth_token_address,
    weth_token_address, // loan token
    dai_token_address, // trade token
    kyber_address,
    leverageAmount,
    loanOrderHash,
    tokenName,
    tokenSymbol
  );
  await processArtifacts(pToken, tokenSymbol);
  await pToken.setLoanTokenLender(iTokenETH.address);

  // 2x leverage short on ETH
  leverageAmount = toWei("2", "ether");
  await iTokenETH.initLeverage(
    [
      leverageAmount, // 2x leverage
      toWei("50", "ether"), // initialMarginAmount
      toWei("15", "ether") // maintenanceMarginAmount
    ]
  );
  loanOrderHash = await iTokenETH.loanOrderHashes.call(leverageAmount);

  tokenName = "Perpetual Short ETH 2x";
  tokenSymbol = "psETH2x";
  console.log("Deploying "+tokenName+" ("+tokenSymbol+").");
  pToken = await PositionToken.new(
    BZxProxy.address,
    BZxVault.address,
    BZxOracle.address,
    weth_token_address,
    weth_token_address, // loan token
    dai_token_address, // trade token
    kyber_address,
    leverageAmount,
    loanOrderHash,
    tokenName,
    tokenSymbol
  );
  await processArtifacts(pToken, tokenSymbol);

  await pToken.setLoanTokenLender(iTokenETH.address);


  // 2x leverage long on ETH
  leverageAmount = toWei("2", "ether");
  await iTokenDAI.initLeverage(
    [
      leverageAmount, // 2x leverage
      toWei("50", "ether"), // initialMarginAmount
      toWei("15", "ether") // maintenanceMarginAmount
    ]
  );
  loanOrderHash = await iTokenDAI.loanOrderHashes.call(leverageAmount);

  tokenName = "Perpetual Long ETH 2x";
  tokenSymbol = "plETH2x";
  console.log("Deploying "+tokenName+" ("+tokenSymbol+").");
  pToken = await PositionToken.new(
    BZxProxy.address,
    BZxVault.address,
    BZxOracle.address,
    weth_token_address,
    weth_token_address, // loan token
    dai_token_address, // trade token
    kyber_address,
    leverageAmount,
    loanOrderHash,
    tokenName,
    tokenSymbol
  );
  await processArtifacts(pToken, tokenSymbol);

  await pToken.setLoanTokenLender(iTokenDAI.address);
};

function processArtifacts(contract, tokenSymbol) {
  try {
    // sort ABI by name field
    let abi = contract.abi;
    abi.sort(function(a, b) {
      return a.name > b.name ? 1 : b.name > a.name ? -1 : 0;
    });

    let jsonAsset = {
      name: tokenSymbol,
      address: web3utils.toChecksumAddress(contract.address),
      abi: abi
    };

    fs.writeFileSync(
      secrets["assets_path"]+network+"/" + tokenSymbol + ".json",
      JSON.stringify(jsonAsset),
      function(err) {
        if (err) {
          console.log(tokenSymbol + ".json Error: " + err);
        }
      }
    );
  } catch (err) {
    console.log(tokenSymbol + ".json Error: " + err);
  }
}

function toWei(number, unit) {
  if (web3utils.isBN(number)) {
    return web3utils.toWei(number, unit);
  } else {
    return web3utils.toBN(web3utils.toWei(number.toString(), unit));
  }
}
