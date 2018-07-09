
var BZxProxy = artifacts.require("BZxProxy");

var TestNetBZRxToken = artifacts.require("TestNetBZRxToken");
var BZxVault = artifacts.require("BZxVault");
var OracleRegistry = artifacts.require("OracleRegistry");
var BZxTo0x = artifacts.require("BZxTo0x");

var config = require('../protocol-config.js');

const BigNumber = require('bignumber.js');
const MAX_UINT = new BigNumber(2).pow(256).minus(1).toString();

module.exports = function(deployer, network, accounts) {
	network = network.replace("-fork", "");
	if (network == "develop" || network == "testnet")
		network = "development";

	deployer.deploy(BZxProxy).then(async function(bZxProxy) {

		var bzrx_token_address;
		if (network == "mainnet" || network == "ropsten" || network == "kovan" || network == "rinkeby") {
			bzrx_token_address = config["addresses"][network]["BZRXToken"];
		} else {
			var bzrx_token = await TestNetBZRxToken.deployed();
			bzrx_token_address = TestNetBZRxToken.address;

			await bZxProxy.setDebugMode(true);
		}

		await bZxProxy.setBZxAddresses(bzrx_token_address, BZxVault.address, OracleRegistry.address, BZxTo0x.address);

		var vault = await BZxVault.deployed();
		await vault.transferBZxOwnership(bZxProxy.address);

		var bZxTo0x = await BZxTo0x.deployed();
		await bZxTo0x.transferBZxOwnership(bZxProxy.address);

		// TokenTransferProxy needs to have unlimited transfer approval for ZRX from BZxTo0x
		await bZxTo0x.approveFor(
			config["addresses"][network]["ZeroEx"]["ZRXToken"],
			config["addresses"][network]["ZeroEx"]["TokenTransferProxy"],
			MAX_UINT);
	});
}
