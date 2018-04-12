
var B0xProxy = artifacts.require("B0xProxy");
var B0xLoanHealth = artifacts.require("B0xLoanHealth");

module.exports = function(deployer, network, accounts) {
	deployer.deploy(B0xLoanHealth).then(async function() {
		var b0xProxy = await B0xProxy.deployed();
		await b0xProxy.replaceContract(B0xLoanHealth.address);
	});
}
