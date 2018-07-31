
var BZxTo0x = artifacts.require("BZxTo0x");

var config = require('../protocol-config.js');

module.exports = function(deployer, network, accounts) {
	network = network.replace("-fork", "");
	if (network == "develop" || network == "testnet" || network == "coverage")
		network = "development";

	deployer.deploy(BZxTo0x, config["addresses"][network]["ZeroEx"]["Exchange"], config["addresses"][network]["ZeroEx"]["ZRXToken"], config["addresses"][network]["ZeroEx"]["TokenTransferProxy"]).then(async function(bZxTo0x) {
		/*if (network != "mainnet" && network != "ropsten" && network != "kovan" && network != "rinkeby") {
			await bZxTo0x.setDebugMode(true);
		}*/
	});
}
