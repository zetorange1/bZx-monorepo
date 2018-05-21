
var B0xProxy = artifacts.require("B0xProxy");
var B0xLoanMaintenance = artifacts.require("B0xLoanMaintenance");

module.exports = function(deployer, network, accounts) {
	deployer.deploy(B0xLoanMaintenance).then(async function() {
		var b0xProxy = await B0xProxy.deployed();
		await b0xProxy.replaceContract(B0xLoanMaintenance.address);
	});
}
