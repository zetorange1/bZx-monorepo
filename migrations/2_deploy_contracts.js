var RESTToken = artifacts.require("./RESTToken.sol");
var TomToken = artifacts.require("./TomToken.sol");
var BeanToken = artifacts.require("./BeanToken.sol");
var B0xVault = artifacts.require("./B0xVault.sol");
var B0xPrices = artifacts.require("./B0xPrices.sol");
var B0x = artifacts.require("./B0x.sol");

/*var Taker0x = artifacts.require("./Taker0x.sol");
var INTToken = artifacts.require("./INTToken.sol");
var POCToken = artifacts.require("./POCToken.sol");
*/

let testWallets = [
    "0x5409ED021D9299bf6814279A6A1411A7e866A631",
	"0x6Ecbe1DB9EF729CBe972C83Fb886247691Fb6beb",
	"0xE36Ea790bc9d7AB70C55260C66D52b1eca985f84",
	"0xE834EC434DABA538cd1b9Fe1582052B880BD7e63",
	"0x78dc5D2D739606d31509C31d654056A45185ECb6",
	"0xA8dDa8d7F5310E4A9E24F8eBA77E091Ac264f872",
	"0x06cEf8E666768cC40Cc78CF93d9611019dDcB628",
	"0x4404ac8bd8F9618D27Ad2f1485AA1B2cFD82482D",
	"0x7457d5E02197480Db681D3fdF256c7acA21bDc12",
	"0x91c987bf62D25945dB517BDAa840A6c661374402"
];
// Mnemonic: concert load couple harbor equip island argue ramp clarify fence smart topic


module.exports = function(deployer) {

	deployer.deploy(RESTToken).then(function() {
		return deployer.deploy(B0xVault).then(function() {
			return deployer.deploy(B0xPrices).then(function() {
				return deployer.deploy(B0x, RESTToken.address, B0xVault.address, B0xPrices.address).then(function() {
					postDepoloymentSetup();
					return;
				});
			});
		});
	});

	deployer.deploy(TomToken, testWallets[1]);
	deployer.deploy(BeanToken, testWallets[2]);

	postDepoloymentSetup = function () {
		B0xVault.deployed().then(function(instance) {
			return instance.addAuthorizedAddress(B0x.address);
		});
		
		B0xPrices.deployed().then(function(instance) {
			return instance.addAuthorizedAddress(B0x.address);
		});
	};
};
