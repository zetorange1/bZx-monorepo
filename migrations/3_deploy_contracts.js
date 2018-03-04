
const BigNumber = require('bignumber.js');
const MAX_UINT = new BigNumber(2).pow(256).minus(1);

var B0xToken = artifacts.require("./B0xToken.sol")
var b0xTokenAddress;

// owned by msg.sender (Ownable)
var B0x = artifacts.require("./B0x.sol");

// owned by B0x (B0xOwnable)
var B0xVault = artifacts.require("./B0xVault.sol");
var B0xTo0x = artifacts.require("./B0xTo0x.sol");
var B0xOracle = artifacts.require("./B0xOracle.sol");
var OracleRegistry = artifacts.require("./OracleRegistry.sol");

var config = require('../../config/secrets.js');

module.exports = function(deployer, network, accounts) {
	network = network.replace("-fork", "");
	if (network == "develop")
		network = "development";

	/*web3.eth.getBalance(accounts[0], function(error, balance) {
		console.log("migrations :: before balance: "+balance);
	});*/

	var b0xTokenAddress = "";
	switch(network) {
		case "ropsten":
		case "mainnet":
			b0xTokenAddress = config["protocol"][network]["b0xTokenAddress"];
			break;
		default:
			B0xToken.deployed().then(function(instance) {
				b0xTokenAddress = instance.address;
			});	
	}

	return deployer.deploy(B0xVault).then(function() {
		return deployer.deploy(B0xTo0x, config["protocol"][network]["ZeroEx"]["Exchange"], config["protocol"][network]["ZeroEx"]["ZRXToken"], config["protocol"][network]["ZeroEx"]["TokenTransferProxy"]).then(function() {
			return deployer.deploy(OracleRegistry).then(function() {
				return deployer.deploy(B0x, b0xTokenAddress, B0xVault.address, OracleRegistry.address, B0xTo0x.address).then(function() {

					B0xVault.deployed().then(function(instance) {
						instance.transferB0xOwnership(B0x.address);
					});

					B0xTo0x.deployed().then(function(instance) {
						instance.transferB0xOwnership(B0x.address).then(function() {
							instance.approveFor(
								config["protocol"][network]["ZeroEx"]["ZRXToken"],
								config["protocol"][network]["ZeroEx"]["TokenTransferProxy"],
								MAX_UINT);
						});
					});
				
					return deployer.deploy(B0xOracle, B0xVault.address, config["protocol"][network]["KyberContractAddress"]
						,{from: accounts[0], value: web3.toWei(1, "ether")}).then(function() { // seeds B0xOracle with 1 Ether
						
							OracleRegistry.deployed().then(function(instance) {
								instance.addOracle(B0xOracle.address,"b0xOracle");
								
								return;
							});

							B0xOracle.deployed().then(function(instance) {
								instance.transferB0xOwnership(B0x.address);
								
								web3.eth.getBalance(accounts[0], function(error, balance) {
									console.log("migrations :: after balance: "+balance);
								});
								
								console.log("B0xVault: "+B0xVault.address);
								console.log("B0xTo0x: "+B0xTo0x.address);
								console.log("B0x: "+B0x.address);
								console.log("B0xOracle: "+B0xOracle.address);

								return;
							});
					});
				});
			});
		});
	});
}
