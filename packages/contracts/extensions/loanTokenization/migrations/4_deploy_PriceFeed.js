

const doDeploy = false;
const useFakeData = false;

const contract = require("truffle-contract");
const fs = require('fs').promises;
const path = require("path");

const networkIds = {
  mainnet: 1,
  ropsten: 3,
  rinkeby: 4,
  kovan: 42,
  development: 50,
};

let config = require("../../../protocol-config.js");

let ReferencePriceFeed = artifacts.require("ReferencePriceFeed");

module.exports = function(deployer, network, accounts) {

  if (!doDeploy)
    return;

  network = network.replace("-fork", "");
  if (network == "development" || network == "develop" || network == "testnet" || network == "coverage") {
    network = "development";
  }

  let dai_token_address, kyber_contract_address;
  if (network == "mainnet" || network == "ropsten" || network == "kovan" || network == "rinkeby") {
    dai_token_address = config["addresses"][network]["DAITokenAddress"];
    kyber_contract_address = config["addresses"][network]["KyberContractAddress"];
  } else {
    let t = contract(require("../../../build/contracts/TestToken9.json"));
    t.setNetwork(networkIds[network]);
    dai_token_address = t.address;

    kyber_contract_address = "0x0000000000000000000000000000000000000000";
  }

  let weth_token_address = config["addresses"][network]["ZeroEx"]["WETH9"];

  deployer.then(async function() {

    let priceFeed = await deployer.deploy(
      ReferencePriceFeed,
      kyber_contract_address,
      dai_token_address
    );

    if (useFakeData) {
      const count = 36;
      const minPeriod = 3600;
      const start = Math.floor(Math.floor(Date.now()/1000) / minPeriod) * minPeriod;
      let rates = [];
      let timestamps = [];
      let j=0;
      for(let i=start; i >= 0; i-=minPeriod) {
        if (j >= count)
          break;

        rates.push(web3.utils.toWei(getRandomIntInclusive(1,20).toString(), "ether"));
        timestamps.push(i);

        j++;
      }

      //console.log(rates);
      //console.log(timestamps);
      
      await priceFeed.setAssetPriceManually(
        weth_token_address,
        rates,
        timestamps
      );
    }

    console.log(`   > [${parseInt(path.basename(__filename))}] TokenizedLoans deploy: #done`);
  });
};

function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}