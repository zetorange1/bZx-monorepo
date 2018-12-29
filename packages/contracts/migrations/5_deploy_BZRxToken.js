var BZRxToken = artifacts.require("BZRxToken");
var BZxEther = artifacts.require("BZxEther");

const path = require("path");
const config = require("../protocol-config.js");

module.exports = (deployer, network, accounts) => {
  deployer.then(async () => {
    if (network == "development" || network == "develop" || network == "testnet" || network == "coverage") {
      network = "development";
    } else {
      console.log(`   > [${parseInt(path.basename(__filename))}] BZRxToken deploy: #skiped`);
      return;
    }

    let beth = await deployer.deploy(BZxEther);


    let token = await deployer.deploy(BZRxToken);

    if (network == "development") {
      await token.mint(
        accounts[0],
        web3.utils.toWei("1000000", "ether")
      );

      var WETH = await artifacts.require("WETHInterface");
      var weth = await WETH.at(config["addresses"][network]["ZeroEx"]["WETH9"]);
      await weth.deposit({ value: web3.utils.toWei("10", "ether") });
    }
    
    console.log(`   > [${parseInt(path.basename(__filename))}] BZRxToken deploy: #done`);
  });
};
