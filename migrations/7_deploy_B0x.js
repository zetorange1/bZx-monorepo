
var B0xProxy = artifacts.require("B0xProxy");

var B0xToken = artifacts.require("B0xToken");
var B0xVault = artifacts.require("B0xVault");
var OracleRegistry = artifacts.require("OracleRegistry");
var B0xTo0x = artifacts.require("B0xTo0x");

var config = require('../../config/secrets.js');

const BigNumber = require('bignumber.js');
const MAX_UINT = new BigNumber(2).pow(256).minus(1).toString();

module.exports = function(deployer, network, accounts) {
	network = network.replace("-fork", "");
	if (network == "develop" || network == "testnet")
		network = "development";
	
	deployer.deploy(B0xProxy).then(async function() {
		var b0xProxy = await B0xProxy.deployed();
		
		var b0x_token_address;
		if (network == "ropsten") {
			b0x_token_address = config["protocol"][network]["B0XToken"];
		} else {
			var b0x_token = await B0xToken.deployed();
			b0x_token_address = B0xToken.address;

			await b0xProxy.setDebugMode(true);
		}

		await b0xProxy.setB0xAddresses(b0x_token_address, B0xVault.address, OracleRegistry.address, B0xTo0x.address);

		var vault = await B0xVault.deployed();
		await vault.transferB0xOwnership(b0xProxy.address);

		var b0xTo0x = await B0xTo0x.deployed();
		await b0xTo0x.transferB0xOwnership(b0xProxy.address);

		// TokenTransferProxy needs to have unlimited transfer approval for ZRX from B0xTo0x
		await b0xTo0x.approveFor(
			config["protocol"][network]["ZeroEx"]["ZRXToken"],
			config["protocol"][network]["ZeroEx"]["TokenTransferProxy"],
			MAX_UINT);
	});
}
