var BZRxToken = artifacts.require("BZRxToken");

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

    let token = await deployer.deploy(BZRxToken);

    if (network == "development") {
      await token.mint(
        accounts[0],
        web3.utils.toWei("1000000", "ether")
      );

      var BZxEther = artifacts.require("BZxEther");
      let beth = await deployer.deploy(BZxEther);
      await beth.deposit({ value: web3.utils.toWei("10", "ether") });
    }

    console.log(`   > [${parseInt(path.basename(__filename))}] BZRxToken deploy: #done`);
  });
};
