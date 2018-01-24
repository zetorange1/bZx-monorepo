
var Exchange0x = artifacts.require("./0xProject/Exchange.sol");
var TokenTransferProxy = artifacts.require("./0xProject/TokenTransferProxy.sol");

let contracts0x = {
	"ZRXToken": "0x25B8Fe1DE9dAf8BA351890744FF28cf7dFa8f5e3",
	"EtherToken": "0x48BaCB9266a570d521063EF5dD96e61686DbE788",
	"Exchange": "0xB69e673309512a9D726F87304C6984054f87a93b",
	"TokenRegistry": "0x0B1ba0af832d7C05fD64161E0Db78E85978E8082",
	"TokenTransferProxy": "0x871DD7C2B4b25E1Aa18728e9D5f2Af4C4e431f5c"
};

module.exports = function(deployer, network, accounts) {
	return deployer.deploy(TokenTransferProxy).then(function() {
		return deployer.deploy(Exchange0x, contracts0x["ZRXToken"], TokenTransferProxy.address).then(function() {
			return TokenTransferProxy.deployed().then(function(instance) {
				instance.addAuthorizedAddress(Exchange0x.address);
			});
		});
	});
}
