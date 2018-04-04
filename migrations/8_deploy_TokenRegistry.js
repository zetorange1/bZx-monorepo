
var TokenRegistry = artifacts.require("./TokenRegistry.sol");

var B0xToken = artifacts.require("./B0xToken.sol");
var B0x = artifacts.require("./B0x.sol");
var OracleRegistry = artifacts.require("./OracleRegistry.sol");

var config = require('../../config/secrets.js');

module.exports = function(deployer, network, accounts) {
	network = network.replace("-fork", "");
	if (network == "develop" || network == "testnet")
		network = "development";

	deployer.deploy(TokenRegistry).then(async function() {
		var registry = await TokenRegistry.deployed();
		
		var b0x_token = await B0xToken.deployed();
		var b0x_token_name = await b0x_token.name.call();
		var b0x_token_symbol = await b0x_token.symbol.call();
		await registry.addToken(
			B0xToken.address,
			b0x_token_name,
			b0x_token_symbol,
			18,
			"http://url");
		
		await registry.addToken(
			config["protocol"][network]["ZeroEx"]["ZRXToken"],
			"0x Protocol Token",
			"ZRX",
			18,
			"http://url");
	
		await registry.addToken(
			config["protocol"][network]["ZeroEx"]["EtherToken"],
			"Ether Token",
			"WETH",
			18,
			"http://url");

		if (config["protocol"][network]["ZeroEx"]["WETH9"] != "") {
			await registry.addToken(
				config["protocol"][network]["ZeroEx"]["WETH9"],
				"Wrapped Ether",
				"WETH9",
				18,
				"http://url");
		}

		web3.eth.getBalance(accounts[0], function(error, balance) {
			console.log("migrations :: final balance: "+balance);
		});
	});
}
