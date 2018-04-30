
const DEPOSIT_B0X = true;

var TestNetFaucet = artifacts.require("TestNetFaucet");
var TestNetOracle = artifacts.require("TestNetOracle");

var B0xToken = artifacts.require("B0xToken");
var TestNetB0xToken = artifacts.require("TestNetB0xToken");

var config = require('../../config/secrets.js');

module.exports = function(deployer, network, accounts) {
	network = network.replace("-fork", "");
	if (network == "mainnet")
		return;

	if (network == "develop" || network == "testnet")
		network = "development";

	deployer.deploy(TestNetFaucet).then(async function() {
		var testNetFaucet = await TestNetFaucet.deployed();

		if (network != "ropsten") {
			var oracle = await TestNetOracle.deployed();
			await oracle.setFaucetContractAddress(testNetFaucet.address);
			await testNetFaucet.setOracleContractAddress(oracle.address);
		}

		if (DEPOSIT_B0X) {
			var b0x_token;
			if (network == "ropsten" || network == "kovan" || network == "rinkeby") {
				b0x_token = await B0xToken.at(config["protocol"][network]["B0XToken"]);
			} else {
				b0x_token = await TestNetB0xToken.deployed();
			}

			await b0x_token.transfer(testNetFaucet.address, web3.toWei(100000000000000000, "ether"));
		}
	});
}
