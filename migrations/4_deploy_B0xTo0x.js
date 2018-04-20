
var B0xTo0x = artifacts.require("B0xTo0x");

var config = require('../../config/secrets.js');

module.exports = function(deployer, network, accounts) {
	network = network.replace("-fork", "");
	if (network == "develop" || network == "testnet")
		network = "development";

	deployer.deploy(B0xTo0x, config["protocol"][network]["ZeroEx"]["Exchange"], config["protocol"][network]["ZeroEx"]["ZRXToken"], config["protocol"][network]["ZeroEx"]["TokenTransferProxy"]).then(async function() {
		if (network != "mainnet" && network != "ropsten" && network != "kovan" && network != "rinkeby") {
			var b0xTo0x = await B0xTo0x.deployed();
			await b0xTo0x.setDebugMode(true);
		}
	});
}
