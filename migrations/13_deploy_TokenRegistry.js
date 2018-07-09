
var TokenRegistry = artifacts.require("TokenRegistry");

var BZRxToken = artifacts.require("BZRxToken");
var TestNetBZRxToken = artifacts.require("TestNetBZRxToken");

var config = require('../protocol-config.js');

module.exports = function(deployer, network, accounts) {
	network = network.replace("-fork", "");
	if (network == "develop" || network == "development" || network == "testnet")
		network = "development";
	else {
		// comment out if we need to deploy to other networks
		web3.eth.getBalance(accounts[0], function(error, balance) {
			console.log("migrations :: final balance: "+balance);
		});
		return;
	}

	deployer.deploy(TokenRegistry).then(async function(registry) {

		var bzrx_token;
		if (network == "mainnet" || network == "ropsten" || network == "kovan" || network == "rinkeby") {
			bzrx_token = await BZRxToken.at(config["addresses"][network]["BZRXToken"]);
		} else {
			bzrx_token = await TestNetBZRxToken.deployed();
		}
		var bzrx_token_name = await bzrx_token.name.call();
		var bzrx_token_symbol = await bzrx_token.symbol.call();

		await registry.addToken(
			bzrx_token.address,
			bzrx_token_name,
			bzrx_token_symbol,
			18,
			"data:image/jpeg;base64,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");

		await registry.addToken(
			config["addresses"][network]["ZeroEx"]["ZRXToken"],
			"0x Protocol Token",
			"ZRX",
			18,
			"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAAXNSR0IArs4c6QAAAW5QTFRFAAAAVVVVSUlJNTU1My0tMiwsMi8vMS0tMiwsMSwsMCwsMS0tMC0tMC0tMSwsMCwsMCwsMC0t////MCwsNDAw5OPj7e3tMi4uOTU1RUJCR0NDaWZmgH19lpSUtLKy5+fn6urq7Ovr/v7+/Pz8REBARUFBODU14N/f6enp4+Li5eTkm5qauri41NPT7ezsgX5+goCAsK6uUU1Nr62tOjY27u7u8vHxioeH8vLy9fX19vX19vb2NzMzm5mZMy8vPTo6Y2Bg4eHhZGFhsbCwsrGxZWJi5ubmZmNj6ejonJqatbS0trW1uLe3SEREurm5vLu7vry8wcDAtbOz5eXlxMPDaGVlPzs7a2hoTEhITktLT0xMOzc3Uk5OUk9PVlNTXVpaPDg4PDk5RkNDgX9/MS0tSUVF1dTU1tXV3d3d3t3dSUZGSkdH8PDwUE1NQDw8lJKSycjIlZOT9/f3+Pj4+vr6+/v7QT4+/f39Qz8/ODQ0oHre+wAAABJ0Uk5TAAYHGC0uR4KVlr/H2ePx8vP009oDlQAAAbRJREFUeF6Fk1Wz20AMhZ2kje0k9zY5sh1mZrrMUGZmZmb897XsnW086Yy/F50Za1fyWUn5RyCsRWLxeCyihQPKPCF9kSSLekjxElQT5CGhBj3HozRHdOaSowv0HxaOyPPiu3Hr0PxebZ7NbYmMkKgv7l99D8Hgvqji9qES8/EKBCjuUTpDjOoUcPp/UYQAF3cpu2xecP6Fi+jE1C0AJwfARo6SZypA3+AM3fbP8ecdZSsYL91tvbxDZBRgk3ccCyhhjo3yI+oWbJE2iJkCWHvCKqxoHIYo3kwaJEldA5BjpSkRDj3gOs3wtgXgMquIEuPQAfCJJDUTNq9ZxpQ4h3UA1RMy4d4+bL6yjLsJm7Ap12TGw2/cJatjbokmbEq3STICYDol3CYvAbA+0AxXgZ7bpMYhxzamSGIkG28wYqW5Rj1eATAm5icXOr5ND04vOUYJq/OwKRhEB6XSJDVF5QbVXKvFYxl9oNJNPs//Aiy20aoTo8vnzrStLP3+DAHaT8Vzy4HJ1OlUGQK8ShOjekZusgzBypcdMXLeof0zPGdWf3TOP0vJofUbe//F8V89/+X1Xf+/rJVSubRUnPUAAAAASUVORK5CYII=");

		var WETH = config["addresses"][network]["ZeroEx"]["WETH9"];
		if (WETH == "") {
			WETH = config["addresses"][network]["ZeroEx"]["EtherToken"];
		}
		await registry.addToken(
			WETH,
			"Wrapped Ether",
			"WETH",
			18,
			"data:image/jpeg;base64,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");

		web3.eth.getBalance(accounts[0], function(error, balance) {
			console.log("migrations :: final balance: "+balance);
		});
	});
}
