
var BZxProxy = artifacts.require("BZxProxy");
var BZxTradePlacing = artifacts.require("BZxTradePlacing");

module.exports = function(deployer, network, accounts) {
	deployer.deploy(BZxTradePlacing).then(async function() {
		var bZxProxy = await BZxProxy.deployed();
		await bZxProxy.replaceContract(BZxTradePlacing.address);
	});
}
