
var BZxProxy = artifacts.require("BZxProxy");
var BZxLoanHealth = artifacts.require("BZxLoanHealth");

module.exports = function(deployer, network, accounts) {
	deployer.deploy(BZxLoanHealth).then(async function() {
		var bZxProxy = await BZxProxy.deployed();
		await bZxProxy.replaceContract(BZxLoanHealth.address);
	});
}
