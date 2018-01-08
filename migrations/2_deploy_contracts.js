var LOANToken = artifacts.require("./LOANToken.sol");
var TOMToken = artifacts.require("./TOMToken.sol");
var BEANToken = artifacts.require("./BEANToken.sol");
var B0xVault = artifacts.require("./B0xVault.sol");
var KyberWrapper = artifacts.require("./KyberWrapper.sol");
//var B0xPool = artifacts.require("./B0xPool.sol");
var B0x = artifacts.require("./B0x.sol");

//const Web3 = require('web3');
//let web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:9545")) // :8545

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

let contracts0x = {
	"ZRXToken": "0x25B8Fe1DE9dAf8BA351890744FF28cf7dFa8f5e3",
	"EtherToken": "0x48BaCB9266a570d521063EF5dD96e61686DbE788",
	"Exchange": "0xB69e673309512a9D726F87304C6984054f87a93b",
	"TokenRegistry": "0x0B1ba0af832d7C05fD64161E0Db78E85978E8082",
	"TokenTransferProxy": "0x871DD7C2B4b25E1Aa18728e9D5f2Af4C4e431f5c"
};

module.exports = async function(deployer, network, accounts) {
	await Promise.all([
		deployer.deploy(LOANToken),
		deployer.deploy(B0xVault),
		deployer.deploy(KyberWrapper),
		deployer.deploy(TOMToken),
		deployer.deploy(BEANToken)
	]);
	
	await Promise.all([
		deployer.deploy(B0x, LOANToken.address, B0xVault.address, KyberWrapper.address, contracts0x["Exchange"], contracts0x["ZRXToken"]),
		TOMToken.deployed().then(function(instance) {
			instance.transfer(accounts[1], web3.toWei(2000000, "ether"));
		}),
		BEANToken.deployed().then(function(instance) {
			instance.transfer(accounts[2], web3.toWei(2000000, "ether"));
		}),
		LOANToken.deployed().then(function(instance) {
			instance.transfer(accounts[1], web3.toWei(100000, "ether"));
		}),
		LOANToken.deployed().then(function(instance) {
			instance.transfer(accounts[2], web3.toWei(100000, "ether"));
		}),						
	]);

	await Promise.all([
		B0xVault.deployed().then(function(instance) {
			instance.addAuthorizedAddress(B0x.address);
		}),
		KyberWrapper.deployed().then(function(instance) {
			instance.addAuthorizedAddress(B0x.address);
		})
	]);
};
