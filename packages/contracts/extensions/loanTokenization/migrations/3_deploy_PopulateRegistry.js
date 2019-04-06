

const doDeploy = true;

const fs = require('fs').promises;
const path = require("path");

let TokenizedRegistry = artifacts.require("TokenizedRegistry");

module.exports = function(deployer, network, accounts) {

  if (!doDeploy)
    return;

  network = network.replace("-fork", "");
  if (network == "development" || network == "develop" || network == "testnet" || network == "coverage") {
    network = "development";
  }

  deployer.then(async function() {

    let types = [];
    let tokens = [];
    let assets = [];
    let names = [];
    let symbols = [];

    const file = await fs.readFile("TokenizedLoans_"+network+".log");
    let lines = file.toString().split("\n");
    for(i in lines) {
      let items = lines[i].replace(/\r?\n|\r/g,"").split("\t");

      if (items.length < 5) {
        continue;
      }
      
      if (items[0] == "LoanToken") {
        types.push("1");
      }
      else if (items[0] == "PositionToken") {
        types.push("2");
      }
      else {
        types.push("0");
      }

      tokens.push(items[1]);
      assets.push(items[2]);
      names.push(items[3]);
      symbols.push(items[4]);
    }

    let tokenizedRegistry = await TokenizedRegistry.deployed();
    await tokenizedRegistry.addTokens(
      tokens,
      assets,
      names,
      symbols,
      types
    );

    console.log(`   > [${parseInt(path.basename(__filename))}] TokenizedLoans deploy: #done`);
  });
};

