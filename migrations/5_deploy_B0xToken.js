
var TestNetB0xToken = artifacts.require("TestNetB0xToken");

module.exports = function(deployer, network, accounts) {
	network = network.replace("-fork", "");

	if (network == "develop" || network == "development" || network == "testnet") {
		network = "development";

		deployer.deploy(TestNetB0xToken);
	}
}
