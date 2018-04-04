
var B0xToken = artifacts.require("./B0xToken.sol");

module.exports = function(deployer, network, accounts) {
	deployer.deploy(B0xToken);
}
