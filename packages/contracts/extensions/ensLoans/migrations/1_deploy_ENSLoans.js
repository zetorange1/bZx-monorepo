
const path = require("path");

module.exports = function(deployer, network, accounts) {

  network = network.replace("-fork", "");
  if (network == "development" || network == "develop" || network == "testnet" || network == "coverage") {
    network = "development";
  } else {
    return;
  }

  deployer.then(async function() {
  });
};
