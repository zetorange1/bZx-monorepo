
var B0xOracle;

var TestNetB0xToken = artifacts.require("TestNetB0xToken");
var B0xVault = artifacts.require("B0xVault");
var B0xProxy = artifacts.require("B0xProxy");
var OracleRegistry = artifacts.require("OracleRegistry");

var config = require('../../config/secrets.js');

module.exports = function(deployer, network, accounts) {
	network = network.replace("-fork", "");
	if (network == "develop" || network == "testnet")
		network = "development";

	if (network == "mainnet" || network == "ropsten") {
		B0xOracle = artifacts.require("B0xOracle");
	} else {
		B0xOracle = artifacts.require("TestNetOracle");
	}

	var b0x_token_address;
	if (network == "mainnet" || network == "ropsten" || network == "kovan" || network == "rinkeby") {
		b0x_token_address = config["protocol"][network]["B0XToken"];
	} else {
		b0x_token_address = TestNetB0xToken.address;
	}

	if (b0x_token_address) { // ensure deployed protocol token
		deployer.deploy(B0xOracle, B0xVault.address, config["protocol"][network]["KyberContractAddress"], config["protocol"][network]["ZeroEx"]["WETH9"], b0x_token_address
			,{from: accounts[0], value: web3.toWei(1, "ether")}).then(async function(oracle) { // seeds B0xOracle with 1 Ether

			var b0xProxy = await B0xProxy.deployed();
			await oracle.transferB0xOwnership(B0xProxy.address);

			if (network != "mainnet" && network != "ropsten" && network != "kovan" && network != "rinkeby") {
				await oracle.setDebugMode(true);
			}

			var registry = await OracleRegistry.deployed();
			await registry.addOracle(B0xOracle.address,"b0xOracle");
		});
	}
}
