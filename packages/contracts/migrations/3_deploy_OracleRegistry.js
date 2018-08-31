var OracleRegistry = artifacts.require("OracleRegistry");

module.exports = function(deployer, network, accounts) {
  deployer.deploy(OracleRegistry);
};
