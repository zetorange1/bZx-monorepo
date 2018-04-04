
var B0xVault = artifacts.require("./B0xVault.sol");

module.exports = function(deployer, network, accounts) {
	deployer.deploy(B0xVault);
}
