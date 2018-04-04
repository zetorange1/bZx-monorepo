
var B0xOracle = artifacts.require("./B0xOracle.sol");

var B0xVault = artifacts.require("./B0xVault.sol");
var B0x = artifacts.require("./B0x.sol");
var OracleRegistry = artifacts.require("./OracleRegistry.sol");

var config = require('../../config/secrets.js');

module.exports = function(deployer, network, accounts) {
	network = network.replace("-fork", "");
	if (network == "develop" || network == "testnet")
		network = "development";

	deployer.deploy(B0xOracle, B0xVault.address, config["protocol"][network]["KyberContractAddress"]
		,{from: accounts[0], value: web3.toWei(1, "ether")}).then(async function() { // seeds B0xOracle with 1 Ether
		
		var oracle = await B0xOracle.deployed();
		await oracle.transferB0xOwnership(B0x.address);

		var registry = await OracleRegistry.deployed();
		await registry.addOracle(B0xOracle.address,"b0xOracle");
	});
}
