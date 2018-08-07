
var BZxProxy = artifacts.require("BZxProxy");
var BZxTo0x = artifacts.require("BZxTo0x");
var BZx = artifacts.require("BZx");
var BZxVault = artifacts.require("BZxVault");
var BZxOracle = artifacts.require("TestNetOracle");
var TestNetBZRxToken = artifacts.require("TestNetBZRxToken");
var ERC20 = artifacts.require("ERC20"); // for testing with any ERC20 token

var fs = require('fs');

const BigNumber = require('bignumber.js');
const BN = require('bn.js');
const ethABI = require('ethereumjs-abi');
const ethUtil = require('ethereumjs-util');
const _ = require('lodash');

const Web3Utils = require('web3-utils');
const BZxJS = require('b0x.js');
const ZeroEx = require('0x.js');

const config = require('../protocol-config.js');

const currentGasPrice = 20000000000; // 20 gwei
const currentEthPrice = 1000; // USD

const SignatureType = Object.freeze({
    "Illegal": 0,
    "Invalid": 1,
    "EIP712": 2,
    "EthSign": 3,
    "Caller": 4,
    "Wallet": 5,
    "Validator": 6,
    "PreSigned": 7,
    "Trezor": 8,
});

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

		var OrderParams_bZx_1;
		var OrderHash_bZx_1;
		var ECSignature_raw_1;
		var ECSignature_1;

		async function asyncCall() {
			var bZxProxy = await BZxProxy.deployed();
			var bZx = await BZx.at(bZxProxy.address);

			var vault = await BZxVault.deployed();
			var oracle = await BZxOracle.deployed();
			var bzrx_token = await TestNetBZRxToken.deployed();

			var bZxTo0x = await BZxTo0x.deployed();
			var zrx_token = await ERC20.at(config["addresses"]["development"]["ZeroEx"]["ZRXToken"]);

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
				(await bzrx_token.transfer(lender1_account, web3.toWei(1000000, "ether"), {from: owner_account})),
				(await bzrx_token.transfer(lender2_account, web3.toWei(1000000, "ether"), {from: owner_account})),
				(await bzrx_token.transfer(trader1_account, web3.toWei(1000000, "ether"), {from: owner_account})),
				(await bzrx_token.transfer(trader2_account, web3.toWei(1000000, "ether"), {from: owner_account})),
				(await bzrx_token.approve(vault.address, MAX_UINT, {from: lender1_account})),
				(await bzrx_token.approve(vault.address, MAX_UINT, {from: lender2_account})),
				(await bzrx_token.approve(vault.address, MAX_UINT, {from: trader1_account})),
				(await bzrx_token.approve(vault.address, MAX_UINT, {from: trader2_account})),

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

				(await zrx_token.transfer(trader1_account, web3.toWei(10000, "ether"), {from: owner_account})),
				(await zrx_token.transfer(trader2_account, web3.toWei(10000, "ether"), {from: owner_account})),
				(await zrx_token.approve(bZxTo0x.address, MAX_UINT, {from: trader1_account})),
				(await zrx_token.approve(bZxTo0x.address, MAX_UINT, {from: trader2_account})),

				(await maker0xToken1.transfer(makerOf0xOrder_account, web3.toWei(10000, "ether"), {from: owner_account})),
				(await maker0xToken1.approve(config["addresses"]["development"]["ZeroEx"]["TokenTransferProxy"], MAX_UINT, {from: makerOf0xOrder_account})),
			]);

			/// should take sample loan order (as trader1)
			OrderParams_bZx_1 = {
				"b0xAddress": bZx.address,
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
				"salt": BZxJS.default.generatePseudoRandomSalt().toString()
			};
			//console.log(OrderParams_bZx_1);
			let OrderHash_bZx_1 = BZxJS.default.getLoanOrderHashHex(OrderParams_bZx_1);

			/// should sign and verify orderHash (as lender1)
			const nodeVersion = web3.version.node;
			//console.log(nodeVersion);
			const isParityNode = _.includes(nodeVersion, 'Parity');
			const isTestRpc = _.includes(nodeVersion, 'TestRPC');

			if (isParityNode || isTestRpc) {
				// Parity and TestRpc nodes add the personalMessage prefix itself
				ECSignature_raw_1 = web3.eth.sign(lender1_account, OrderHash_bZx_1);
			}
			else {
				var orderHashBuff = ethUtil.toBuffer(OrderHash_bZx_1);
				var msgHashBuff = ethUtil.hashPersonalMessage(orderHashBuff);
				var msgHashHex = ethUtil.bufferToHex(msgHashBuff);
				ECSignature_raw_1 = web3.eth.sign(lender1_account, msgHashHex);
			}

			// add signature type to end
			ECSignature_raw_1 = ECSignature_raw_1 + toHex(SignatureType.EthSign);

			/// should take sample loan order (as trader1)
			console.log(await bZx.takeLoanOrderAsTrader(
			[
				OrderParams_bZx_1["makerAddress"],
				OrderParams_bZx_1["loanTokenAddress"],
				OrderParams_bZx_1["interestTokenAddress"],
				OrderParams_bZx_1["collateralTokenAddress"],
				OrderParams_bZx_1["feeRecipientAddress"],
				OrderParams_bZx_1["oracleAddress"]
			],
			[
				new BN(OrderParams_bZx_1["loanTokenAmount"]),
				new BN(OrderParams_bZx_1["interestAmount"]),
				new BN(OrderParams_bZx_1["initialMarginAmount"]),
				new BN(OrderParams_bZx_1["maintenanceMarginAmount"]),
				new BN(OrderParams_bZx_1["lenderRelayFee"]),
				new BN(OrderParams_bZx_1["traderRelayFee"]),
				new BN(OrderParams_bZx_1["expirationUnixTimestampSec"]),
				new BN(OrderParams_bZx_1["makerRole"]),
				new BN(OrderParams_bZx_1["salt"])
			],
			collateralToken1.address,
			web3.toWei(12.3, "ether"),
			ECSignature_raw_1,
			{from: trader1_account, gas: 1000000, gasPrice: web3.toWei(30, "gwei")}));

			/// should take sample loan order (as trader2)
			console.log(await bZx.takeLoanOrderAsTrader(
				[
					OrderParams_bZx_1["makerAddress"],
					OrderParams_bZx_1["loanTokenAddress"],
					OrderParams_bZx_1["interestTokenAddress"],
					OrderParams_bZx_1["collateralTokenAddress"],
					OrderParams_bZx_1["feeRecipientAddress"],
					OrderParams_bZx_1["oracleAddress"]
				],
				[
					new BN(OrderParams_bZx_1["loanTokenAmount"]),
					new BN(OrderParams_bZx_1["interestAmount"]),
					new BN(OrderParams_bZx_1["initialMarginAmount"]),
					new BN(OrderParams_bZx_1["maintenanceMarginAmount"]),
					new BN(OrderParams_bZx_1["lenderRelayFee"]),
					new BN(OrderParams_bZx_1["traderRelayFee"]),
					new BN(OrderParams_bZx_1["expirationUnixTimestampSec"]),
					new BN(OrderParams_bZx_1["makerRole"]),
					new BN(OrderParams_bZx_1["salt"])
				],
				collateralToken2.address,
				web3.toWei(20, "ether"),
				ECSignature_raw_1,
				{from: trader2_account, gas: 1000000, gasPrice: web3.toWei(20, "gwei")}));

				OrderParams_0x = {
					"exchangeContractAddress": config["addresses"]["development"]["ZeroEx"]["ExchangeV1"],
					"expirationUnixTimestampSec": (web3.eth.getBlock("latest").timestamp+86400).toString(),
					"feeRecipient": NULL_ADDRESS, //"0x1230000000000000000000000000000000000000",
					"maker": makerOf0xOrder_account,
					"makerFee": web3.toWei(0.002, "ether").toString(),
					"makerTokenAddress": maker0xToken1.address,
					"makerTokenAmount": web3.toWei(100, "ether").toString(),
					"salt": BZxJS.default.generatePseudoRandomSalt().toString(),
					"taker": NULL_ADDRESS,
					"takerFee": web3.toWei(0.0013, "ether").toString(),
					"takerTokenAddress": loanToken1.address,
					"takerTokenAmount": web3.toWei(66, "ether").toString(),
				};
				console.log(OrderParams_0x);

				OrderHash_0x = ZeroEx.ZeroEx.getOrderHashHex(OrderParams_0x);

				if (isParityNode || isTestRpc) {
					// Parity and TestRpc nodes add the personalMessage prefix itself
					ECSignature_0x_raw = web3.eth.sign(makerOf0xOrder_account, OrderHash_0x);
				}
				else {
					var orderHashBuff = ethUtil.toBuffer(OrderHash_0x);
					var msgHashBuff = ethUtil.hashPersonalMessage(orderHashBuff);
					var msgHashHex = ethUtil.bufferToHex(msgHashBuff);
					ECSignature_0x_raw = web3.eth.sign(makerOf0xOrder_account, msgHashHex);
				}

				ECSignature_0x = {
					"v": parseInt(ECSignature_0x_raw.substring(130,132))+27,
					"r": "0x"+ECSignature_0x_raw.substring(2,66),
					"s": "0x"+ECSignature_0x_raw.substring(66,130)
				};

				var types = ['bytes32','bytes32','bytes32','bytes32','bytes32','bytes32','bytes32','bytes32','bytes32','bytes32','bytes32'];
				var values = [
					Web3Utils.padLeft(OrderParams_0x["maker"], 64),
					Web3Utils.padLeft(OrderParams_0x["taker"], 64),
					Web3Utils.padLeft(OrderParams_0x["makerTokenAddress"], 64),
					Web3Utils.padLeft(OrderParams_0x["takerTokenAddress"], 64),
					Web3Utils.padLeft(OrderParams_0x["feeRecipient"], 64),
					'0x'+Web3Utils.padLeft(new BN(OrderParams_0x["makerTokenAmount"]), 64),
					'0x'+Web3Utils.padLeft(new BN(OrderParams_0x["takerTokenAmount"]), 64),
					'0x'+Web3Utils.padLeft(new BN(OrderParams_0x["makerFee"]), 64),
					'0x'+Web3Utils.padLeft(new BN(OrderParams_0x["takerFee"]), 64),
					'0x'+Web3Utils.padLeft(new BN(OrderParams_0x["expirationUnixTimestampSec"]), 64),
					'0x'+Web3Utils.padLeft(new BN(OrderParams_0x["salt"]), 64)
				];

				//console.log(values);
				var hashBuff = ethABI.solidityPack(types, values)
				//console.log(hashBuff);
				var sample_order_tightlypacked = ethUtil.bufferToHex(hashBuff);
				//console.log(sample_order_tightlypacked);
				//console.log(ECSignature_0x_raw);

				console.log("Before profit:");
				console.log(await bZx.getProfitOrLoss.call(
				  OrderHash_bZx_1,
				  trader1_account,
				  {from: lender2_account}));

				console.log(txPrettyPrint(await bZx.tradePositionWith0x(
					OrderHash_bZx_1,
					sample_order_tightlypacked,
					ECSignature_0x_raw,
					{from: trader1_account})),"");
				console.log("After profit:");
				console.log(await bZx.getProfitOrLoss.call(
					OrderHash_bZx_1,
					trader1_account,
					{from: lender2_account}));
		}

		asyncCall();
	}

	function txLogsPrint(logs) {
		var ret = "";
		if (logs === undefined) {
			logs = [];
		}
		if (logs.length > 0) {
			logs = logs.sort(function(a,b) {return (a.blockNumber > b.blockNumber) ? 1 : ((b.blockNumber > a.blockNumber) ? -1 : 0);} );
			ret = ret + "\n  LOGS --> "+"\n";
			for (var i=0; i < logs.length; i++) {
			var log = logs[i];
			//console.log(log);
			ret = ret + "  "+i+": "+log.event+" "+JSON.stringify(log.args);
			if (log.event == "GasRefund") {
				ret = ret + " -> Refund: "+(log.args.refundAmount/1e18*currentEthPrice).toFixed(2)+"USD @ "+currentEthPrice+"USD/ETH)";
			}
			ret = ret + " " + log.transactionHash + " " + log.blockNumber + "\n\n";
			}
		}
		return ret;
	}

	function txPrettyPrint(tx, desc) {
		var ret = desc + "\n";
		if (tx.tx === undefined) {
			ret = ret + JSON.stringify(tx);
		} else {
			ret = ret + "  tx: "+tx.tx+"\n";
			if (tx.receipt !== undefined) {
			ret = ret + "  blockNumber: "+tx.receipt.blockNumber+"\n";
			ret = ret + "  gasUsed: "+tx.receipt.gasUsed+" -> x"+currentGasPrice+" = "+(tx.receipt.gasUsed*currentGasPrice)+" ("+(tx.receipt.gasUsed*currentGasPrice/1e18*currentEthPrice).toFixed(2)+"USD @ "+currentEthPrice+"USD/ETH)\n";
			ret = ret + "  cumulativeGasUsed: "+tx.receipt.cumulativeGasUsed+" -> x"+currentGasPrice+" = "+(tx.receipt.cumulativeGasUsed*currentGasPrice)+" ("+(tx.receipt.cumulativeGasUsed*currentGasPrice/1e18*currentEthPrice).toFixed(2)+"USD @ "+currentEthPrice+"USD/ETH)\n";
			ret = ret + "  status: "+tx.receipt.status+"\n";
			}

			if (tx.logs === undefined) {
			tx.logs = [];
			}
			//tx.logs = tx.logs.concat(events);
			ret = ret + txLogsPrint(tx.logs);
		}
		return ret;
	}

	function toHex(d) {
		return  ("0"+(Number(d).toString(16))).slice(-2).toUpperCase()
	}
}
