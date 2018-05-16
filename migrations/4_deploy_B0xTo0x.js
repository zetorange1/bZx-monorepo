
var B0xTo0x = artifacts.require("B0xTo0x");

var config = require('../../config/secrets.js');

module.exports = function(deployer, network, accounts) {
	network = network.replace("-fork", "");
	if (network == "develop" || network == "testnet")
		network = "development";

	deployer.deploy(B0xTo0x, config["protocol"][network]["ZeroEx"]["Exchange"], config["protocol"][network]["ZeroEx"]["ZRXToken"], config["protocol"][network]["ZeroEx"]["TokenTransferProxy"]).then(async function(b0xTo0x) {
		if (network != "mainnet" && network != "ropsten" && network != "kovan" && network != "rinkeby") {
			await b0xTo0x.setDebugMode(true);
		}
	});
}
