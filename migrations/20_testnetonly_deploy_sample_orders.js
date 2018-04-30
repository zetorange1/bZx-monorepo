
var B0xProxy = artifacts.require("B0xProxy");
var B0x = artifacts.require("B0x");
var B0xVault = artifacts.require("B0xVault");
var B0xOracle = artifacts.require("TestNetOracle");
var TestNetB0xToken = artifacts.require("TestNetB0xToken");

var fs = require('fs');

const BigNumber = require('bignumber.js');
const BN = require('bn.js');
const ethABI = require('ethereumjs-abi');
const ethUtil = require('ethereumjs-util');
const _ = require('lodash');

//const Web3Utils = require('web3-utils');
const B0xJS = require('b0x.js');

// this migration will complete when the embedded testnet is being setup (network: testnet)

module.exports = function(deployer, network, accounts) {
	network = network.replace("-fork", "");

	if (network == "testnet") {
		network = "development";

		const MAX_UINT = new BigNumber(2).pow(256).minus(1).toString();

		const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";
		const NONNULL_ADDRESS = "0x0000000000000000000000000000000000000001";

		// account roles
		var owner_account = accounts[0]; // owner/contract creator, holder of all tokens
		var lender1_account = accounts[4]; // lender 1
		var trader1_account = accounts[3]; // trader 1
		var lender2_account = accounts[2]; // lender 2
		var trader2_account = accounts[1]; // trader 2
		var makerOf0xOrder_account = accounts[6]; // maker of 0x order
		var relay1_account = accounts[9]; // relay 1

		var test_tokens = [];
		var loanToken1;
		var loanToken2;
		var collateralToken1;
		var collateralToken2;
		var interestToken1;
		var interestToken2;
		var maker0xToken1;

		var OrderParams_b0x_1;
		var OrderHash_b0x_1;
		var ECSignature_raw_1;
		var ECSignature_1;

		async function asyncCall() {
			var b0xProxy = await B0xProxy.deployed();
			var b0x = await B0x.at(b0xProxy.address);

			var vault = await B0xVault.deployed();
			var oracle = await B0xOracle.deployed();
			var b0x_token = await TestNetB0xToken.deployed();

			for (var i = 0; i < 10; i++) {
				test_tokens[i] = await artifacts.require("TestToken"+i).deployed();
				//console.log("Test Token "+i+" retrieved: "+test_tokens[i].address);
			}

			loanToken1 = test_tokens[6];
			loanToken2 = test_tokens[2];
			collateralToken1 = test_tokens[4];
			collateralToken2 = test_tokens[3];
			interestToken1 = test_tokens[1];
			interestToken2 = test_tokens[0];
			maker0xToken1 = test_tokens[5];

			await Promise.all([
				(await b0x_token.transfer(lender1_account, web3.toWei(1000000, "ether"), {from: owner_account})),
				(await b0x_token.transfer(lender2_account, web3.toWei(1000000, "ether"), {from: owner_account})),
				(await b0x_token.transfer(trader1_account, web3.toWei(1000000, "ether"), {from: owner_account})),
				(await b0x_token.transfer(trader2_account, web3.toWei(1000000, "ether"), {from: owner_account})),
				(await b0x_token.approve(vault.address, MAX_UINT, {from: lender1_account})),
				(await b0x_token.approve(vault.address, MAX_UINT, {from: lender2_account})),
				(await b0x_token.approve(vault.address, MAX_UINT, {from: trader1_account})),
				(await b0x_token.approve(vault.address, MAX_UINT, {from: trader2_account})),

				(await loanToken1.transfer(lender1_account, web3.toWei(1000000, "ether"), {from: owner_account})),
				(await loanToken2.transfer(lender2_account, web3.toWei(1000000, "ether"), {from: owner_account})),
				(await loanToken1.approve(vault.address, MAX_UINT, {from: lender1_account})),
				(await loanToken2.approve(vault.address, MAX_UINT, {from: lender2_account})),

				(await collateralToken1.transfer(trader1_account, web3.toWei(1000000, "ether"), {from: owner_account})),
				(await collateralToken2.transfer(trader2_account, web3.toWei(1000000, "ether"), {from: owner_account})),
				(await collateralToken1.approve(vault.address, MAX_UINT, {from: trader1_account})),
				(await collateralToken2.approve(vault.address, MAX_UINT, {from: trader2_account})),

				(await interestToken1.transfer(trader1_account, web3.toWei(1000000, "ether"), {from: owner_account})),
				(await interestToken1.transfer(trader2_account, web3.toWei(1000000, "ether"), {from: owner_account})),
				(await interestToken2.transfer(trader2_account, web3.toWei(1000000, "ether"), {from: owner_account})),
				(await interestToken1.approve(vault.address, MAX_UINT, {from: trader1_account})),
				(await interestToken1.approve(vault.address, MAX_UINT, {from: trader2_account})),
				(await interestToken2.approve(vault.address, MAX_UINT, {from: trader2_account})),

				/*
				(await zrx_token.transfer(trader1_account, web3.toWei(10000, "ether"), {from: owner_account})),
				(await zrx_token.transfer(trader2_account, web3.toWei(10000, "ether"), {from: owner_account})),
				(await zrx_token.approve(b0xTo0x.address, MAX_UINT, {from: trader1_account})),
				(await zrx_token.approve(b0xTo0x.address, MAX_UINT, {from: trader2_account})),

				(await maker0xToken1.transfer(makerOf0xOrder_account, web3.toWei(10000, "ether"), {from: owner_account})),
				(await maker0xToken1.approve(config["protocol"]["development"]["ZeroEx"]["TokenTransferProxy"], MAX_UINT, {from: makerOf0xOrder_account})),
				*/
			]);

			/// should take sample loan order (as trader1)
			OrderParams_b0x_1 = {
				"b0xAddress": b0x.address,
				"makerAddress": lender1_account, // lender
				"loanTokenAddress": loanToken1.address,
				"interestTokenAddress": interestToken1.address,
				"collateralTokenAddress": NULL_ADDRESS,
				"feeRecipientAddress": NULL_ADDRESS,
				"oracleAddress": oracle.address,
				"loanTokenAmount": web3.toWei(10000, "ether").toString(),
				"interestAmount": web3.toWei(2.5, "ether").toString(), // 2 token units per day
				"initialMarginAmount": "50", // 50%
				"maintenanceMarginAmount": "25", // 25%
				"lenderRelayFee": web3.toWei(0.001, "ether").toString(),
				"traderRelayFee": web3.toWei(0.0013, "ether").toString(),
				"expirationUnixTimestampSec": (web3.eth.getBlock("latest").timestamp+86400*365).toString(),
				"makerRole": "0", // 0=lender, 1=trader
				"salt": B0xJS.default.generatePseudoRandomSalt().toString()
			};
			//console.log(OrderParams_b0x_1);
			let OrderHash_b0x_1 = B0xJS.default.getLoanOrderHashHex(OrderParams_b0x_1);

			/// should sign and verify orderHash (as lender1)
			const nodeVersion = web3.version.node;
			//console.log(nodeVersion);
			const isParityNode = _.includes(nodeVersion, 'Parity');
			const isTestRpc = _.includes(nodeVersion, 'TestRPC');

			if (isParityNode || isTestRpc) {
				// Parity and TestRpc nodes add the personalMessage prefix itself
				ECSignature_raw_1 = web3.eth.sign(lender1_account, OrderHash_b0x_1);
			}
			else {
				var orderHashBuff = ethUtil.toBuffer(OrderHash_b0x_1);
				var msgHashBuff = ethUtil.hashPersonalMessage(orderHashBuff);
				var msgHashHex = ethUtil.bufferToHex(msgHashBuff);
				ECSignature_raw_1 = web3.eth.sign(lender1_account, msgHashHex);
			}

			/// should take sample loan order (as trader1)
			b0x.takeLoanOrderAsTrader(
			[
				OrderParams_b0x_1["makerAddress"],
				OrderParams_b0x_1["loanTokenAddress"],
				OrderParams_b0x_1["interestTokenAddress"],
				OrderParams_b0x_1["collateralTokenAddress"],
				OrderParams_b0x_1["feeRecipientAddress"],
				OrderParams_b0x_1["oracleAddress"]
			],
			[
				new BN(OrderParams_b0x_1["loanTokenAmount"]),
				new BN(OrderParams_b0x_1["interestAmount"]),
				new BN(OrderParams_b0x_1["initialMarginAmount"]),
				new BN(OrderParams_b0x_1["maintenanceMarginAmount"]),
				new BN(OrderParams_b0x_1["lenderRelayFee"]),
				new BN(OrderParams_b0x_1["traderRelayFee"]),
				new BN(OrderParams_b0x_1["expirationUnixTimestampSec"]),
				new BN(OrderParams_b0x_1["makerRole"]),
				new BN(OrderParams_b0x_1["salt"])
			],
			collateralToken1.address,
			web3.toWei(12.3, "ether"),
			ECSignature_raw_1,
			{from: trader1_account, gas: 1000000, gasPrice: web3.toWei(30, "gwei")}).then(function(tx) {
				console.log(tx);
			});

			/// should take sample loan order (as trader2)
			b0x.takeLoanOrderAsTrader(
				[
					OrderParams_b0x_1["makerAddress"],
					OrderParams_b0x_1["loanTokenAddress"],
					OrderParams_b0x_1["interestTokenAddress"],
					OrderParams_b0x_1["collateralTokenAddress"],
					OrderParams_b0x_1["feeRecipientAddress"],
					OrderParams_b0x_1["oracleAddress"]
				],
				[
					new BN(OrderParams_b0x_1["loanTokenAmount"]),
					new BN(OrderParams_b0x_1["interestAmount"]),
					new BN(OrderParams_b0x_1["initialMarginAmount"]),
					new BN(OrderParams_b0x_1["maintenanceMarginAmount"]),
					new BN(OrderParams_b0x_1["lenderRelayFee"]),
					new BN(OrderParams_b0x_1["traderRelayFee"]),
					new BN(OrderParams_b0x_1["expirationUnixTimestampSec"]),
					new BN(OrderParams_b0x_1["makerRole"]),
					new BN(OrderParams_b0x_1["salt"])
				],
				collateralToken2.address,
				web3.toWei(20, "ether"),
				ECSignature_raw_1,
				{from: trader2_account, gas: 1000000, gasPrice: web3.toWei(20, "gwei")}).then(function(tx) {
					console.log(tx);
				});
		}

		asyncCall();
	}
}
