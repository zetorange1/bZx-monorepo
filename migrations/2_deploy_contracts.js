var LOANToken = artifacts.require("./LOANToken.sol");
var TomToken = artifacts.require("./TomToken.sol");
var BeanToken = artifacts.require("./BeanToken.sol");
var B0xVault = artifacts.require("./B0xVault.sol");
var B0xPrices = artifacts.require("./B0xPrices.sol");
//var B0xPool = artifacts.require("./B0xPool.sol");
var B0x = artifacts.require("./B0x.sol");

//var DexA = artifacts.require("./DexA.sol");
//var DexB = artifacts.require("./DexB.sol");
//var DexC = artifacts.require("./DexC.sol");

const Web3 = require('web3');
let web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"))

/*var Taker0x = artifacts.require("./Taker0x.sol");
var INTToken = artifacts.require("./INTToken.sol");
var POCToken = artifacts.require("./POCToken.sol");
*/

/*let testWallets = [
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
];*/
// Mnemonic: concert load couple harbor equip island argue ramp clarify fence smart topic

var testWallets = web3.eth.accounts;
module.exports = async function(deployer) {
	
	await Promise.all([
		deployer.deploy(LOANToken),
		deployer.deploy(B0xVault),
		deployer.deploy(B0xPrices),
		deployer.deploy(TomToken),
		deployer.deploy(BeanToken)
	]);

	await Promise.all([
		deployer.deploy(B0x, LOANToken.address, B0xVault.address, B0xPrices.address),
		TomToken.deployed().then(function(instance) {
			instance.transfer(testWallets[1], web3.toWei(2000000, "ether"));
		}),
		BeanToken.deployed().then(function(instance) {
			instance.transfer(testWallets[2], web3.toWei(2000000, "ether"));
		}),
	]);

	await Promise.all([
		B0xVault.deployed().then(function(instance) {
			instance.addAuthorizedAddress(B0x.address);
		}),
		B0xPrices.deployed().then(function(instance) {
			instance.addAuthorizedAddress(B0x.address);
		})
	]);

};
