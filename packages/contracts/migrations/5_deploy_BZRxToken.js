
var TestNetBZRxToken = artifacts.require("TestNetBZRxToken");

module.exports = function(deployer, network, accounts) {
	network = network.replace("-fork", "");

	if (network == "develop" || network == "development" || network == "testnet" || network == "coverage") {
		network = "development";

		deployer.deploy(TestNetBZRxToken);
	}
}
