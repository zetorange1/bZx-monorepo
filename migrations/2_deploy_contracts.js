var Broker0x = artifacts.require("./Broker0x.sol");
var RESTToken = artifacts.require("./RESTToken.sol");

var Taker0x = artifacts.require("./Taker0x.sol");
var INTToken = artifacts.require("./INTToken.sol");
var POCToken = artifacts.require("./POCToken.sol");

module.exports = function(deployer) {

	deployer.deploy(Broker0x).then(function() {
		deployer.deploy(RESTToken, Broker0x.address);
	});

	deployer.deploy(Taker0x).then(function() {
		deployer.deploy(POCToken, Taker0x.address);
		//deployer.deploy(INTToken);
	}).then(function() {
		deployer.deploy(INTToken, Taker0x.address);
	});
};

function Broker0x(address _restToken, address _tokenTransferProxy, address _vault, address _tokenPrices) {