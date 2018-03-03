
var TokenRegistry = artifacts.require("./TokenRegistry.sol");
var B0xToken = artifacts.require("./B0xToken.sol");
var BaseToken = artifacts.require("./BaseToken.sol");

var fs = require('fs');

var config = require('../../config/secrets.js');

module.exports = async function(deployer, network, accounts) {
	network = network.replace("-fork", "");
	if (network == "develop")
		network = "development";

	web3.eth.getBalance(accounts[0], function(error, balance) {
		console.log("migrations :: before balance: "+balance);
	});


	if (network == "development") {
		await deployer.deploy(B0xToken).then(function() {
			return deployer.deploy(TokenRegistry);
		});
		
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
			config["protocol"]["development"]["ZeroEx"]["ZRXToken"],
			"0x Protocol Token",
			"ZRX",
			18,
			"http://url");

		await registry.addToken(
			config["protocol"]["development"]["ZeroEx"]["EtherToken"],
			"Ether Token",
			"WETH",
			18,
			"http://url");

		for (var i = 0; i < 10; ++i) {
			if (!fs.existsSync("./build/contracts/TestToken"+i+".json")) {
				var token = await deployer.new(
					BaseToken,
					10000000000000000000000000,
					"TestToken"+i, 
					18, 
					"TEST"+i);
				var token_name = await token.name.call();
				var token_symbol = await token.symbol.call();

				fs.writeFileSync("./build/contracts/"+token_name+".json", 
					JSON.stringify(
					{
						"contractName": token_name,
						"abi": token.abi,
						"tokenAddress": token.address,
						"tokenName": token_name,
						"tokenSymbol": token_symbol,
						"networks": {
							"50": {
								"events": {},
								"links": {},
								"address": token.address
							},
							"4447": {
								"events": {},
								"links": {},
								"address": token.address
							},
						}
					}), function(err) {
					if(err) {
						return console.log(err);
					}
				});
			}

			var jsonFile = fs.readFileSync("./build/contracts/TestToken"+i+".json");
			var jsonContent = JSON.parse(jsonFile);

			await registry.addToken(
				jsonContent["tokenAddress"],
				jsonContent["tokenName"],
				jsonContent["tokenSymbol"],
				18,
				"http://url");
		}
	}
}
