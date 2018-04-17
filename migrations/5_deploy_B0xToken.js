
var B0xToken = artifacts.require("B0xToken");

module.exports = function(deployer, network, accounts) {
	network = network.replace("-fork", "");

	if (network == "develop" || network == "development" || network == "testnet") {
		network = "development";
		
		deployer.deploy(B0xToken);
	}
}
