
const path = require("path");
let TokenizedRegistry = artifacts.require("TokenizedRegistry");

module.exports = function(deployer, network, accounts) {
  network = network.replace("-fork", "");
  if (network == "development" || network == "develop" || network == "testnet" || network == "coverage") {
    network = "development";
  } else {
    return;
  }

  deployer.then(async function() {

    // Deploy TokenizedRegistry
    await deployer.deploy(
      TokenizedRegistry
    );

    console.log(`   > [${parseInt(path.basename(__filename))}] TokenizedRegistry deploy: #done`);
  });
};
