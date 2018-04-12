
var B0xProxy = artifacts.require("B0xProxy");
var B0xOrderTaking = artifacts.require("B0xOrderTaking");

module.exports = function(deployer, network, accounts) {
	deployer.deploy(B0xOrderTaking).then(async function() {
		var b0xProxy = await B0xProxy.deployed();
		await b0xProxy.replaceContract(B0xOrderTaking.address);
	});
}
