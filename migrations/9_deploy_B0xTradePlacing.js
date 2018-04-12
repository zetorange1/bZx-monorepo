
var B0xProxy = artifacts.require("B0xProxy");
var B0xTradePlacing = artifacts.require("B0xTradePlacing");

module.exports = function(deployer, network, accounts) {
	deployer.deploy(B0xTradePlacing).then(async function() {
		var b0xProxy = await B0xProxy.deployed();
		await b0xProxy.replaceContract(B0xTradePlacing.address);
	});
}
