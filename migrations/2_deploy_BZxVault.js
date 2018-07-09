
var BZxVault = artifacts.require("BZxVault");

module.exports = function(deployer, network, accounts) {
	deployer.deploy(BZxVault);
}
