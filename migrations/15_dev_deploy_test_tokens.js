
var TokenRegistry = artifacts.require("./TokenRegistry.sol");

var TestToken0 = artifacts.require("./TestToken0.sol");
var TestToken1 = artifacts.require("./TestToken1.sol");
var TestToken2 = artifacts.require("./TestToken2.sol");
var TestToken3 = artifacts.require("./TestToken3.sol");
var TestToken4 = artifacts.require("./TestToken4.sol");
var TestToken5 = artifacts.require("./TestToken5.sol");
var TestToken6 = artifacts.require("./TestToken6.sol");
var TestToken7 = artifacts.require("./TestToken7.sol");
var TestToken8 = artifacts.require("./TestToken8.sol");
var TestToken9 = artifacts.require("./TestToken9.sol");

module.exports = function(deployer, network, accounts) {
	network = network.replace("-fork", "");

	if (network == "develop" || network == "development" || network == "testnet") {
		network = "development";

		tokens = [];
		deployer.deploy(TestToken0).then(async function() {
			tokens.push(TestToken0);
			await deployer.deploy(TestToken1);
			tokens.push(TestToken1);
			await deployer.deploy(TestToken2);
			tokens.push(TestToken2);
			await deployer.deploy(TestToken3);
			tokens.push(TestToken3);
			await deployer.deploy(TestToken4);
			tokens.push(TestToken4);
			await deployer.deploy(TestToken5);
			tokens.push(TestToken5);
			await deployer.deploy(TestToken6);
			tokens.push(TestToken6);
			await deployer.deploy(TestToken7);
			tokens.push(TestToken7);
			await deployer.deploy(TestToken8);
			tokens.push(TestToken8);
			await deployer.deploy(TestToken9);
			tokens.push(TestToken9);

			var registry = await TokenRegistry.deployed();
			
			var token, name, symbol;
			for (var i = 0; i <= 9; ++i) {
				token = await tokens[i].deployed();
				name = await token.name.call();
				symbol = await token.symbol.call();

				await registry.addToken(
					token.address,
					name,
					symbol,
					18,
					"");
			}
		});
	}
}
