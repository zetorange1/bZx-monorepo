var BZRxToken = artifacts.require("BZRxToken");

var config = require("../protocol-config.js");

module.exports = function(deployer, network, accounts) {
  network = network.replace("-fork", "");

  if (
    network == "develop" ||
    network == "development" ||
    network == "testnet" ||
    network == "coverage" || 
    network == "kovan" || 
    network == "ropsten"
  ) {
    if (network != "kovan")
      network = "development";

    deployer.deploy(BZRxToken);
  }
};
