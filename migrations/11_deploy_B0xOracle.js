
var B0xOracle = artifacts.require("B0xOracle");

var B0xVault = artifacts.require("B0xVault");
var B0xProxy = artifacts.require("B0xProxy");
var OracleRegistry = artifacts.require("OracleRegistry");

var config = require('../../config/secrets.js');

module.exports = function(deployer, network, accounts) {
	network = network.replace("-fork", "");
	if (network == "develop" || network == "testnet")
		network = "development";

	deployer.deploy(B0xOracle, B0xVault.address, config["protocol"][network]["KyberContractAddress"], config["protocol"][network]["ZeroEx"]["WETH9"]
		,{from: accounts[0], value: web3.toWei(1, "ether")}).then(async function() { // seeds B0xOracle with 1 Ether
		
		var b0xProxy = await B0xProxy.deployed();

		var oracle = await B0xOracle.deployed();
		await oracle.transferB0xOwnership(B0xProxy.address);

		var registry = await OracleRegistry.deployed();
		await registry.addOracle(B0xOracle.address,"b0xOracle");
	});
}
