
var B0xToken = artifacts.require("./B0xToken.sol");

var BaseToken = artifacts.require("./BaseToken.sol");

var fs = require('fs');


module.exports = function(deployer, network, accounts) {
	network = network.replace("-fork", "");
	if (network == "develop")
		network = "development";

	web3.eth.getBalance(accounts[0], function(error, balance) {
		console.log("migrations :: before balance: "+balance);
	});

	if (network == "development") {
		deployer.deploy(B0xToken).then(function() {
			/*B0xToken.deployed().then(function(instance) {
				instance.transfer(accounts[1], web3.toWei(100000, "ether"));
				instance.transfer(accounts[2], web3.toWei(100000, "ether"));
			});*/
		})

		for (var i = 0; i < 10; ++i) {
			if (!fs.existsSync("./build/contracts/TestToken"+i+".json")) {
				deployer.new(
					BaseToken,
					10000000000000000000000000,
					"TestToken"+i, 
					18, 
					"TEST"+i).then(function(instance) {
						return instance.name.call().then(function(name) {
							//console.log(name + " created: "+instance.address);
							fs.writeFile("./build/contracts/"+name+".json", 
								JSON.stringify(
								{
									"contractName": name,
									"abi": instance.abi,
									"networks": {
										"50": {
											"events": {},
											"links": {},
											"address": instance.address
										},
										"4447": {
											"events": {},
											"links": {},
											"address": instance.address
										},
									}
								}), function(err) {
								if(err) {
									return console.log(err);
								}
							});
						});
				});
			}
		}
	}
}
