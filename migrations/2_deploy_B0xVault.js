
var B0xVault = artifacts.require("B0xVault");

module.exports = function(deployer, network, accounts) {
	deployer.deploy(B0xVault);
}
