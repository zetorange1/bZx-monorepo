
var B0x = artifacts.require("./B0x.sol");

var B0xToken = artifacts.require("./B0xToken.sol");
var B0xVault = artifacts.require("./B0xVault.sol");
var OracleRegistry = artifacts.require("./OracleRegistry.sol");
var B0xTo0x = artifacts.require("./B0xTo0x.sol");

var config = require('../../config/secrets.js');

const BigNumber = require('bignumber.js');
const MAX_UINT = new BigNumber(2).pow(256).minus(1).toString();

module.exports = function(deployer, network, accounts) {
	network = network.replace("-fork", "");
	if (network == "develop" || network == "testnet")
		network = "development";

	deployer.deploy(B0x, B0xToken.address, B0xVault.address, OracleRegistry.address, B0xTo0x.address).then(async function() {
		var vault = await B0xVault.deployed();
		await vault.transferB0xOwnership(B0x.address);

		var b0xTo0x = await B0xTo0x.deployed();
		await b0xTo0x.transferB0xOwnership(B0x.address);

		// TokenTransferProxy needs to have unlimited transfer approval for ZRX from B0xTo0x
		await b0xTo0x.approveFor(
			config["protocol"][network]["ZeroEx"]["ZRXToken"],
			config["protocol"][network]["ZeroEx"]["TokenTransferProxy"],
			MAX_UINT);
	});
}
