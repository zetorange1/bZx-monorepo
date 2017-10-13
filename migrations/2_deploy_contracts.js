var RESTToken = artifacts.require("./RESTToken.sol");
var Broker0xVault = artifacts.require("./Broker0xVault.sol");
var BrokerTokenPrices = artifacts.require("./BrokerTokenPrices.sol");
var Broker0x = artifacts.require("./Broker0x.sol");

/*var Taker0x = artifacts.require("./Taker0x.sol");
var INTToken = artifacts.require("./INTToken.sol");
var POCToken = artifacts.require("./POCToken.sol");
*/
module.exports = function(deployer) {

	deployer.deploy(RESTToken).then(function() {
		return deployer.deploy(Broker0xVault).then(function() {
			return deployer.deploy(BrokerTokenPrices).then(function() {
				return deployer.deploy(Broker0x, RESTToken.address, Broker0xVault.address, BrokerTokenPrices.address);
			});
		});
	});


	/*deployer.deploy(Taker0x).then(function() {
		deployer.deploy(POCToken, Taker0x.address);
		//deployer.deploy(INTToken);
	}).then(function() {
		deployer.deploy(INTToken, Taker0x.address);
	});*/
};
