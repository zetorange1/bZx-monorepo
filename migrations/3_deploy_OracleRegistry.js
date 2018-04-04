
var OracleRegistry = artifacts.require("./OracleRegistry.sol");

module.exports = function(deployer, network, accounts) {
	deployer.deploy(OracleRegistry);
}
