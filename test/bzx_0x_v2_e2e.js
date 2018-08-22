const BZx = artifacts.require("BZx");
const BZxProxy = artifacts.require("BZxProxy");
const BZxVault = artifacts.require("BZxVault");
const BZxOracle = artifacts.require("TestNetOracle");
const ERC20 = artifacts.require("ERC20");

const BZxTo0xV2 = artifacts.require("BZxTo0xV2");
const Exchange0xV2 = artifacts.require("ExchangeV2InterfaceWithEvents");
const ZeroExV2Helper = artifacts.require("ZeroExV2Helper");

const BigNumber = require('bignumber.js');
const BN = require('bn.js');
const {Interface,providers,Contract} = require('ethers');

import Web3Utils from 'web3-utils';
import {ZeroEx as ZeroExV2} from '0xV2.js';

var config = require('../protocol-config.js');

const Reverter = require('./utils/reverter');
const utils = require('./utils/utils.js');

let zeroExV2 = new ZeroExV2(web3.currentProvider, {
    blockPollingIntervalMs: undefined,
    erc20ProxyContractAddress: undefined,
    erc721ProxyContractAddress: undefined,
    exchangeContractAddress: undefined,
    gasPrice: BigNumber(8000000000),
    networkId: 50,
    zrxContractAddress: undefined,
});

const MAX_UINT = new BigNumber(2).pow(256).minus(1).toString();

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

contract('BZxTest', function(accounts) {
    let reverter = new Reverter(web3);

    var bZx;
    var vault;
    var oracle;
    var bZxTo0xV2;

    var bZxEvents;
    var vaultEvents;
    var oracleEvents;
    var bZxTo0xV2Events;
    var zeroExV2Events;

    var test_tokens = [];

    var zrx_token;
    var exchange_0xV2;
    var zeroExV2Helper;

    var OrderParams_bZx_1, OrderParams_bZx_2;
    var OrderHash_bZx_1, OrderHash_bZx_2;
    var ECSignature_raw_1, ECSignature_raw_2;
    var ECSignature_1, ECSignature_2;

    var OrderParams_0x_1, OrderParams_0x_2;
    var OrderHash_0x_1, OrderHash_0x_2;
    var ECSignature_0x_raw_1, ECSignature_0x_raw_2;
    var ECSignature_0x_1, ECSignature_0x_2;

    var OrderParams_0xV2_1, OrderParams_0xV2_2;
    var OrderHash_0xV2_1, OrderHash_0xV2_2, OrderHash_0xV2_1_onchain, OrderHash_0xV2_2_onchain;
    var ECSignature_0xV2_raw_1, ECSignature_0xV2_raw_2;
    var ECSignature_0xV2_1, ECSignature_0xV2_2;

    var OrderParams_0xV2_1_prepped, OrderParams_0xV2_2_prepped;

    // account roles
    var owner = accounts[0]; // owner/contract creator, holder of all tokens
    var lender1 = accounts[1]; // lender 1
    var trader1 = accounts[2]; // trader 1
    var lender2 = accounts[3]; // lender 2
    var trader2 = accounts[4]; // trader 2
    var makerOf0xOrder1_account = accounts[7]; // maker of 0x order
    var maker2 = accounts[8]; // maker of 0x order

    var loanToken1;
    var loanToken2;
    var collateralToken1;
    var collateralToken2;
    var interestToken1;
    var interestToken2;
    var maker0xV2Token1;


    var stranger = accounts[6];

    before('Init: retrieve all deployed contracts', async () => {
        vault = await BZxVault.deployed();
        bZxTo0xV2 = await BZxTo0xV2.deployed();
        oracle = await BZxOracle.deployed();

        bZx = await BZx.at((await BZxProxy.deployed()).address);

        exchange_0xV2 = await Exchange0xV2.at(config["addresses"]["development"]["ZeroEx"]["ExchangeV2"]);
        zeroExV2Helper = await ZeroExV2Helper.deployed();

        zrx_token = await ERC20.at(config["addresses"]["development"]["ZeroEx"]["ZRXToken"]);
    });

    before('Init: retrieve all deployed test tokens and handle token transfers and approvals', async () => {
        for (var i = 0; i < 10; i++) {
            test_tokens[i] = await artifacts.require("TestToken" + i).deployed();
            console.log(i, test_tokens[i].address);
        }

        loanToken1 = test_tokens[0];
        loanToken2 = test_tokens[1];
        collateralToken1 = test_tokens[2];
        collateralToken2 = test_tokens[3];
        interestToken1 = test_tokens[4];
        interestToken2 = test_tokens[5];
        maker0xV2Token1 = test_tokens[7];

        await loanToken1.transfer(lender1, web3.toWei(1000000, "ether"))
        await loanToken2.transfer(lender2, web3.toWei(1000000, "ether"))
        await loanToken1.approve(vault.address, MAX_UINT, {from: lender1})
        await loanToken2.approve(vault.address, MAX_UINT, {from: lender2})
        await collateralToken1.transfer(trader1, web3.toWei(1000000, "ether"))
        await collateralToken1.transfer(trader2, web3.toWei(1000000, "ether"))
        await collateralToken2.transfer(trader2, web3.toWei(1000000, "ether"))
        await collateralToken1.approve(vault.address, MAX_UINT, {from: trader1})
        await collateralToken1.approve(vault.address, MAX_UINT, {from: trader2})
        await collateralToken2.approve(vault.address, MAX_UINT, {from: trader2})
        await interestToken1.transfer(trader1, web3.toWei(1000000, "ether"))
        await interestToken1.transfer(trader2, web3.toWei(1000000, "ether"))
        await interestToken2.transfer(trader2, web3.toWei(1000000, "ether"))
        await interestToken1.approve(vault.address, MAX_UINT, {from: trader1})
        await interestToken1.approve(vault.address, MAX_UINT, {from: trader2})
        await interestToken2.approve(vault.address, MAX_UINT, {from: trader2})
        await maker0xV2Token1.transfer(makerOf0xOrder1_account, web3.toWei(10000, "ether"))
        await maker0xV2Token1.transfer(maker2, web3.toWei(10000, "ether"))
        await maker0xV2Token1.approve(config["addresses"]["development"]["ZeroEx"]["ERC20Proxy"], MAX_UINT, {from: makerOf0xOrder1_account})
        await maker0xV2Token1.approve(config["addresses"]["development"]["ZeroEx"]["ERC20Proxy"], MAX_UINT, {from: maker2})
        await zrx_token.transfer(trader1, web3.toWei(10000, "ether"))
        await zrx_token.transfer(trader2, web3.toWei(10000, "ether"))
        await zrx_token.approve(bZxTo0xV2.address, MAX_UINT, {from: trader1})
        await zrx_token.approve(bZxTo0xV2.address, MAX_UINT, {from: trader2})
        await zrx_token.transfer(makerOf0xOrder1_account, web3.toWei(10000, "ether"))
        await zrx_token.transfer(maker2, web3.toWei(10000, "ether"))
        await zrx_token.approve(config["addresses"]["development"]["ZeroEx"]["TokenTransferProxy"], MAX_UINT, {from: makerOf0xOrder1_account})
        await zrx_token.approve(config["addresses"]["development"]["ZeroEx"]["TokenTransferProxy"], MAX_UINT, {from: maker2})
        await zrx_token.approve(config["addresses"]["development"]["ZeroEx"]["ERC20Proxy"], MAX_UINT, {from: makerOf0xOrder1_account})
        await zrx_token.approve(config["addresses"]["development"]["ZeroEx"]["ERC20Proxy"], MAX_UINT, {from: maker2})
    });

    before('watch events', function() {
        bZxEvents = bZx.allEvents({
            fromBlock: web3.eth.blockNumber,
            toBlock: 'latest'
        });
        vaultEvents = vault.allEvents({
            fromBlock: web3.eth.blockNumber,
            toBlock: 'latest'
        });
        oracleEvents = oracle.allEvents({
            fromBlock: web3.eth.blockNumber,
            toBlock: 'latest'
        });
        bZxTo0xV2Events = bZxTo0xV2.allEvents({
            fromBlock: web3.eth.blockNumber,
            toBlock: 'latest'
        });
        zeroExV2Events = exchange_0xV2.allEvents({
            fromBlock: web3.eth.blockNumber,
            toBlock: 'latest'
        });
    });

    after(async function() {
        var logs = [];
        logs = logs.concat(await bZxEvents.get());
        logs = logs.concat(await vaultEvents.get());
        logs = logs.concat(await oracleEvents.get());
        logs = logs.concat(await bZxTo0xV2Events.get());
        logs = logs.concat(await zeroExV2Events.get());

        bZxEvents.stopWatching();
        vaultEvents.stopWatching();
        oracleEvents.stopWatching();
        bZxTo0xV2Events.stopWatching();
        zeroExV2Events.stopWatching();
    });

    it("should verify approval", async () => {
        var balance = await loanToken1.balanceOf.call(lender1);
        console.log("loanToken1 lender1: " + balance);

        var allowance = await loanToken1.allowance.call(lender1, vault.address);
        console.log("loanToken1 allowance: " + allowance);


        balance = await collateralToken1.balanceOf.call(trader1);
        console.log("collateralToken1 trader1: " + balance);

        allowance = await collateralToken1.allowance.call(trader1, vault.address);
        console.log("collateralToken1 allowance: " + allowance);


        balance = await interestToken1.balanceOf.call(trader1);
        console.log("interestToken1 trader1: " + balance);

        allowance = await interestToken1.allowance.call(trader1, vault.address);
        console.log("interestToken1 allowance: " + allowance);

        assert.isOk(true);
    });


    it("should generate loanOrderHash (as lender1)", async () => {

        OrderParams_bZx_1 = {
            "bZxAddress": bZx.address,
            "makerAddress": lender1, // lender
            "loanTokenAddress": loanToken1.address,
            "interestTokenAddress": interestToken1.address,
            "collateralTokenAddress": utils.zeroAddress,
            "feeRecipientAddress": utils.zeroAddress,
            "oracleAddress": oracle.address,
            "loanTokenAmount": web3.toWei(100000, "ether").toString(),
            "interestAmount": web3.toWei(2, "ether").toString(), // 2 token units per day
            "initialMarginAmount": "50", // 50%
            "maintenanceMarginAmount": "5", // 25%
            "lenderRelayFee": web3.toWei(0.001, "ether").toString(),
            "traderRelayFee": web3.toWei(0.0015, "ether").toString(),
            "expirationUnixTimestampSec": (web3.eth.getBlock("latest").timestamp + 86400).toString(),
            "makerRole": "0", // 0=lender, 1=trader
            "salt": ZeroExV2.generatePseudoRandomSalt().toString()
        };

        OrderHash_bZx_1 = await bZx.getLoanOrderHash.call(
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
            ]);
    });

    it("should sign and verify orderHash (as lender1)", async () => {
        ECSignature_raw_1 = web3.eth.sign(lender1, OrderHash_bZx_1);
        // add signature type to end
        ECSignature_raw_1 = ECSignature_raw_1 + toHex(SignatureType.EthSign);
        assert.isOk(await bZx.isValidSignature.call(lender1, OrderHash_bZx_1, ECSignature_raw_1));
    });

    it("should push sample loan order on chain", async () => {
        await bZx.pushLoanOrderOnChain(
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
            ECSignature_raw_1, {
                from: maker2
            });
    })

    it("should take sample loan order (as lender1/trader1)", async () => {
        await bZx.takeLoanOrderAsTrader(
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
            ECSignature_raw_1, {
                from: trader1
            });
    });

    it("should take sample loan order (as lender1/trader2) on chain", async () => {
        await bZx.takeLoanOrderOnChainAsTrader(OrderHash_bZx_1, collateralToken1.address, web3.toWei(20, "ether"), {
            from: trader2
        });
    });


    it("should generate loanOrderHash (as trader2)", async () => {

        OrderParams_bZx_2 = {
            "bZxAddress": bZx.address,
            "makerAddress": trader2, // lender
            "loanTokenAddress": loanToken2.address,
            "interestTokenAddress": interestToken2.address,
            "collateralTokenAddress": collateralToken2.address,
            "feeRecipientAddress": utils.zeroAddress,
            "oracleAddress": oracle.address,
            "loanTokenAmount": web3.toWei(100000, "ether").toString(),
            "interestAmount": web3.toWei(2, "ether").toString(), // 2 token units per day
            "initialMarginAmount": "50", // 50%
            "maintenanceMarginAmount": "25", // 25%
            "lenderRelayFee": web3.toWei(0.001, "ether").toString(),
            "traderRelayFee": web3.toWei(0.0015, "ether").toString(),
            "expirationUnixTimestampSec": (web3.eth.getBlock("latest").timestamp + 86400).toString(),
            "makerRole": "1", // 0=lender, 1=trader
            "salt": ZeroExV2.generatePseudoRandomSalt().toString()
        };


        OrderHash_bZx_2 = await bZx.getLoanOrderHash.call(
            [
                OrderParams_bZx_2["makerAddress"],
                OrderParams_bZx_2["loanTokenAddress"],
                OrderParams_bZx_2["interestTokenAddress"],
                OrderParams_bZx_2["collateralTokenAddress"],
                OrderParams_bZx_2["feeRecipientAddress"],
                OrderParams_bZx_2["oracleAddress"]
            ],
            [
                new BN(OrderParams_bZx_2["loanTokenAmount"]),
                new BN(OrderParams_bZx_2["interestAmount"]),
                new BN(OrderParams_bZx_2["initialMarginAmount"]),
                new BN(OrderParams_bZx_2["maintenanceMarginAmount"]),
                new BN(OrderParams_bZx_2["lenderRelayFee"]),
                new BN(OrderParams_bZx_2["traderRelayFee"]),
                new BN(OrderParams_bZx_2["expirationUnixTimestampSec"]),
                new BN(OrderParams_bZx_2["makerRole"]),
                new BN(OrderParams_bZx_2["salt"])
            ])
    });

    it("should sign and verify orderHash (as trader2)", async () => {
        ECSignature_raw_2 = web3.eth.sign(trader2, OrderHash_bZx_2);
        // add signature type to end
        ECSignature_raw_2 = ECSignature_raw_2 + toHex(SignatureType.EthSign);
        assert.isOk(await bZx.isValidSignature.call(trader2, OrderHash_bZx_2, ECSignature_raw_2));
    });

    it("should take sample loan order (as lender2)", async () => {
        await bZx.takeLoanOrderAsLender(
            [
                OrderParams_bZx_2["makerAddress"],
                OrderParams_bZx_2["loanTokenAddress"],
                OrderParams_bZx_2["interestTokenAddress"],
                OrderParams_bZx_2["collateralTokenAddress"],
                OrderParams_bZx_2["feeRecipientAddress"],
                OrderParams_bZx_2["oracleAddress"]
            ],
            [
                new BN(OrderParams_bZx_2["loanTokenAmount"]),
                new BN(OrderParams_bZx_2["interestAmount"]),
                new BN(OrderParams_bZx_2["initialMarginAmount"]),
                new BN(OrderParams_bZx_2["maintenanceMarginAmount"]),
                new BN(OrderParams_bZx_2["lenderRelayFee"]),
                new BN(OrderParams_bZx_2["traderRelayFee"]),
                new BN(OrderParams_bZx_2["expirationUnixTimestampSec"]),
                new BN(OrderParams_bZx_2["makerRole"]),
                new BN(OrderParams_bZx_2["salt"])
            ],
            ECSignature_raw_2, {
                from: lender2
            });
    });

    it("should get single loan order", async () => {
        var data = await bZx.getSingleOrder.call(
            OrderHash_bZx_1
        );
        console.log("getSingleOrder(...):");
        console.log(data);

        data = data.substr(2); // remove 0x from front
        const itemCount = 19;
        const objCount = data.length / 64 / itemCount;
        var orders = [];

        if (objCount != 1) {
            console.error("error: data length invalid!");
            assert.isOk(false);
        } else {
            var orderObjArray = data.match(new RegExp('.{1,' + (itemCount * 64) + '}', 'g'));
            //console.log("orderObjArray.length: "+orderObjArray.length);
            for (var i = 0; i < orderObjArray.length; i++) {
                var params = orderObjArray[i].match(new RegExp('.{1,' + 64 + '}', 'g'));
                //console.log(i+": params.length: "+params.length);
                orders.push({
                    maker: "0x" + params[0].substr(24),
                    loanTokenAddress: "0x" + params[1].substr(24),
                    interestTokenAddress: "0x" + params[2].substr(24),
                    collateralTokenAddress: "0x" + params[3].substr(24),
                    feeRecipientAddress: "0x" + params[4].substr(24),
                    oracleAddress: "0x" + params[5].substr(24),
                    loanTokenAmount: parseInt("0x" + params[6]),
                    interestAmount: parseInt("0x" + params[7]),
                    initialMarginAmount: parseInt("0x" + params[8]),
                    maintenanceMarginAmount: parseInt("0x" + params[9]),
                    lenderRelayFee: parseInt("0x" + params[10]),
                    traderRelayFee: parseInt("0x" + params[11]),
                    expirationUnixTimestampSec: parseInt("0x" + params[12]),
                    loanOrderHash: "0x" + params[13],
                    lender: "0x" + params[14].substr(24),
                    orderFilledAmount: parseInt("0x" + params[15]),
                    orderCancelledAmount: parseInt("0x" + params[16]),
                    orderTraderCount: parseInt("0x" + params[17]),
                    addedUnixTimestampSec: parseInt("0x" + params[18])
                });
            }
            console.log(orders);

            assert.isOk(true);
        }
    });

    it("should get loan orders (for lender1)", async () => {

        var data = await bZx.getOrdersForUser.call(
            lender1,
            0, // starting item
            10 // max number of items returned
        );
        console.log("getOrdersForUser(...):");
        console.log(data);

        data = data.substr(2); // remove 0x from front
        const itemCount = 19;
        const objCount = data.length / 64 / itemCount;
        var orders = [];

        if (objCount % 1 != 0) { // must be a whole number
            console.error("error: data length invalid!");
            assert.isOk(false);
        } else {
            var orderObjArray = data.match(new RegExp('.{1,' + (itemCount * 64) + '}', 'g'));
            //console.log("orderObjArray.length: "+orderObjArray.length);
            for (var i = 0; i < orderObjArray.length; i++) {
                var params = orderObjArray[i].match(new RegExp('.{1,' + 64 + '}', 'g'));
                //console.log(i+": params.length: "+params.length);
                orders.push({
                    maker: "0x" + params[0].substr(24),
                    loanTokenAddress: "0x" + params[1].substr(24),
                    interestTokenAddress: "0x" + params[2].substr(24),
                    collateralTokenAddress: "0x" + params[3].substr(24),
                    feeRecipientAddress: "0x" + params[4].substr(24),
                    oracleAddress: "0x" + params[5].substr(24),
                    loanTokenAmount: parseInt("0x" + params[6]),
                    interestAmount: parseInt("0x" + params[7]),
                    initialMarginAmount: parseInt("0x" + params[8]),
                    maintenanceMarginAmount: parseInt("0x" + params[9]),
                    lenderRelayFee: parseInt("0x" + params[10]),
                    traderRelayFee: parseInt("0x" + params[11]),
                    expirationUnixTimestampSec: parseInt("0x" + params[12]),
                    loanOrderHash: "0x" + params[13],
                    lender: "0x" + params[14].substr(24),
                    orderFilledAmount: parseInt("0x" + params[15]),
                    orderCancelledAmount: parseInt("0x" + params[16]),
                    orderTraderCount: parseInt("0x" + params[17]),
                    addedUnixTimestampSec: parseInt("0x" + params[18])
                });
            }


            console.log(orders);

            assert.isOk(true);
        }
    });

    it("should get loan orders (for lender2)", async () => {

        var data = await bZx.getOrdersForUser.call(
            lender2,
            0, // starting item
            10 // max number of items returned
        );
        console.log("getOrdersForUser(...):");
        console.log(data);

        data = data.substr(2); // remove 0x from front
        const itemCount = 19;
        const objCount = data.length / 64 / itemCount;
        var orders = [];

        if (objCount % 1 != 0) { // must be a whole number
            console.error("error: data length invalid!");
            assert.isOk(false);
        } else {
            var orderObjArray = data.match(new RegExp('.{1,' + (itemCount * 64) + '}', 'g'));
            //console.log("orderObjArray.length: "+orderObjArray.length);
            for (var i = 0; i < orderObjArray.length; i++) {
                var params = orderObjArray[i].match(new RegExp('.{1,' + 64 + '}', 'g'));
                //console.log(i+": params.length: "+params.length);
                orders.push({
                    maker: "0x" + params[0].substr(24),
                    loanTokenAddress: "0x" + params[1].substr(24),
                    interestTokenAddress: "0x" + params[2].substr(24),
                    collateralTokenAddress: "0x" + params[3].substr(24),
                    feeRecipientAddress: "0x" + params[4].substr(24),
                    oracleAddress: "0x" + params[5].substr(24),
                    loanTokenAmount: parseInt("0x" + params[6]),
                    interestAmount: parseInt("0x" + params[7]),
                    initialMarginAmount: parseInt("0x" + params[8]),
                    maintenanceMarginAmount: parseInt("0x" + params[9]),
                    lenderRelayFee: parseInt("0x" + params[10]),
                    traderRelayFee: parseInt("0x" + params[11]),
                    expirationUnixTimestampSec: parseInt("0x" + params[12]),
                    loanOrderHash: "0x" + params[13],
                    lender: "0x" + params[14].substr(24),
                    orderFilledAmount: parseInt("0x" + params[15]),
                    orderCancelledAmount: parseInt("0x" + params[16]),
                    orderTraderCount: parseInt("0x" + params[17]),
                    addedUnixTimestampSec: parseInt("0x" + params[18])
                });
            }

            console.log(orders);

            assert.isOk(true);
        }
    });

    it("should get loan orders (for trader2)", async () => {

        var data = await bZx.getOrdersForUser.call(
            trader2,
            0, // starting item
            10 // max number of items returned
        );
        console.log("getOrdersForUser(...):");
        console.log(data);

        data = data.substr(2); // remove 0x from front
        const itemCount = 19;
        const objCount = data.length / 64 / itemCount;
        var orders = [];

        if (objCount % 1 != 0) { // must be a whole number
            console.error("error: data length invalid!");
            assert.isOk(false);
        } else {
            var orderObjArray = data.match(new RegExp('.{1,' + (itemCount * 64) + '}', 'g'));
            //console.log("orderObjArray.length: "+orderObjArray.length);
            for (var i = 0; i < orderObjArray.length; i++) {
                var params = orderObjArray[i].match(new RegExp('.{1,' + 64 + '}', 'g'));
                //console.log(i+": params.length: "+params.length);
                orders.push({
                    maker: "0x" + params[0].substr(24),
                    loanTokenAddress: "0x" + params[1].substr(24),
                    interestTokenAddress: "0x" + params[2].substr(24),
                    collateralTokenAddress: "0x" + params[3].substr(24),
                    feeRecipientAddress: "0x" + params[4].substr(24),
                    oracleAddress: "0x" + params[5].substr(24),
                    loanTokenAmount: parseInt("0x" + params[6]),
                    interestAmount: parseInt("0x" + params[7]),
                    initialMarginAmount: parseInt("0x" + params[8]),
                    maintenanceMarginAmount: parseInt("0x" + params[9]),
                    lenderRelayFee: parseInt("0x" + params[10]),
                    traderRelayFee: parseInt("0x" + params[11]),
                    expirationUnixTimestampSec: parseInt("0x" + params[12]),
                    loanOrderHash: "0x" + params[13],
                    lender: "0x" + params[14].substr(24),
                    orderFilledAmount: parseInt("0x" + params[15]),
                    orderCancelledAmount: parseInt("0x" + params[16]),
                    orderTraderCount: parseInt("0x" + params[17]),
                    addedUnixTimestampSec: parseInt("0x" + params[18])
                });
            }

            console.log(orders);

            assert.isOk(true);
        }
    });

    it("should get fillable orders", async () => {

        var data = await bZx.getOrdersFillable.call(
            0, // starting item
            10 // max number of items returned
        );
        console.log("getOrdersFillable(...):");
        console.log(data);

        data = data.substr(2); // remove 0x from front
        const itemCount = 19;
        const objCount = data.length / 64 / itemCount;
        var orders = [];

        if (objCount % 1 != 0) { // must be a whole number
            console.error("error: data length invalid!");
            assert.isOk(false);
        } else {
            var orderObjArray = data.match(new RegExp('.{1,' + (itemCount * 64) + '}', 'g'));
            //console.log("orderObjArray.length: "+orderObjArray.length);
            for (var i = 0; i < orderObjArray.length; i++) {
                var params = orderObjArray[i].match(new RegExp('.{1,' + 64 + '}', 'g'));
                //console.log(i+": params.length: "+params.length);
                orders.push({
                    maker: "0x" + params[0].substr(24),
                    loanTokenAddress: "0x" + params[1].substr(24),
                    interestTokenAddress: "0x" + params[2].substr(24),
                    collateralTokenAddress: "0x" + params[3].substr(24),
                    feeRecipientAddress: "0x" + params[4].substr(24),
                    oracleAddress: "0x" + params[5].substr(24),
                    loanTokenAmount: parseInt("0x" + params[6]),
                    interestAmount: parseInt("0x" + params[7]),
                    initialMarginAmount: parseInt("0x" + params[8]),
                    maintenanceMarginAmount: parseInt("0x" + params[9]),
                    lenderRelayFee: parseInt("0x" + params[10]),
                    traderRelayFee: parseInt("0x" + params[11]),
                    expirationUnixTimestampSec: parseInt("0x" + params[12]),
                    loanOrderHash: "0x" + params[13],
                    lender: "0x" + params[14].substr(24),
                    orderFilledAmount: parseInt("0x" + params[15]),
                    orderCancelledAmount: parseInt("0x" + params[16]),
                    orderTraderCount: parseInt("0x" + params[17]),
                    addedUnixTimestampSec: parseInt("0x" + params[18])
                });
            }

            console.log(orders);

            assert.isOk(true);
        }
    });

    it("should get single loan position", async () => {

        var data = await bZx.getSingleLoan.call(
            OrderHash_bZx_1,
            trader1
        );
        console.log(data);

        data = data.substr(2); // remove 0x from front
        const itemCount = 16;
        const objCount = data.length / 64 / itemCount;
        var loanPositions = [];

        if (objCount != 1) {
            console.error("error: data length invalid!");
            assert.isOk(false);
        } else {
            var loanPositionObjArray = data.match(new RegExp('.{1,' + (itemCount * 64) + '}', 'g'));
            console.log("loanPositionObjArray.length: " + loanPositionObjArray.length);
            for (var i = 0; i < loanPositionObjArray.length; i++) {
                var params = loanPositionObjArray[i].match(new RegExp('.{1,' + 64 + '}', 'g'));
                console.log(i + ": params.length: " + params.length);
                if (parseInt("0x" + params[0].substr(24)) == 0) {
                    continue;
                }
                loanPositions.push({
                    lender: "0x" + params[0].substr(24),
                    trader: "0x" + params[1].substr(24),
                    collateralTokenAddressFilled: "0x" + params[2].substr(24),
                    positionTokenAddressFilled: "0x" + params[3].substr(24),
                    loanTokenAmountFilled: parseInt("0x" + params[4]),
                    collateralTokenAmountFilled: parseInt("0x" + params[5]),
                    positionTokenAmountFilled: parseInt("0x" + params[6]),
                    loanStartUnixTimestampSec: parseInt("0x" + params[7]),
                    index: parseInt("0x" + params[8]),
                    active: parseInt("0x" + params[9]),
                    loanOrderHash: "0x" + params[10],
                    loanTokenAddress: "0x" + params[11].substr(24),
                    expirationUnixTimestampSec: parseInt("0x" + params[12]),
                    interestTokenAddress: "0x" + params[13].substr(24),
                    interestTotalAccrued: parseInt("0x" + params[14]),
                    interestPaidSoFar: parseInt("0x" + params[15])
                });
            }


            console.log(loanPositions);

            assert.isOk(true);
        }
    });

    it("should get loan positions (for lender1)", async () => {

        var data = await bZx.getLoansForLender.call(
            lender1,
            10, // max number of items returned
            true // activeOnly
        );
        console.log(data);

        data = data.substr(2); // remove 0x from front
        const itemCount = 16;
        const objCount = data.length / 64 / itemCount;
        var loanPositions = [];

        if (objCount % 1 != 0) { // must be a whole number
            console.error("error: data length invalid!");
            assert.isOk(false);
        } else {
            var loanPositionObjArray = data.match(new RegExp('.{1,' + (itemCount * 64) + '}', 'g'));
            console.log("loanPositionObjArray.length: " + loanPositionObjArray.length);
            for (var i = 0; i < loanPositionObjArray.length; i++) {
                var params = loanPositionObjArray[i].match(new RegExp('.{1,' + 64 + '}', 'g'));
                console.log(i + ": params.length: " + params.length);
                if (parseInt("0x" + params[0].substr(24)) == 0) {
                    continue;
                }
                loanPositions.push({
                    lender: "0x" + params[0].substr(24),
                    trader: "0x" + params[1].substr(24),
                    collateralTokenAddressFilled: "0x" + params[2].substr(24),
                    positionTokenAddressFilled: "0x" + params[3].substr(24),
                    loanTokenAmountFilled: parseInt("0x" + params[4]),
                    collateralTokenAmountFilled: parseInt("0x" + params[5]),
                    positionTokenAmountFilled: parseInt("0x" + params[6]),
                    loanStartUnixTimestampSec: parseInt("0x" + params[7]),
                    index: parseInt("0x" + params[8]),
                    active: parseInt("0x" + params[9]),
                    loanOrderHash: "0x" + params[10],
                    loanTokenAddress: "0x" + params[11].substr(24),
                    expirationUnixTimestampSec: parseInt("0x" + params[12]),
                    interestTokenAddress: "0x" + params[13].substr(24),
                    interestTotalAccrued: parseInt("0x" + params[14]),
                    interestPaidSoFar: parseInt("0x" + params[15])
                });
            }

            console.log(loanPositions);

            assert.isOk(true);
        }
    });

    it("should get loan positions (for trader1)", async () => {

        var data = await bZx.getLoansForTrader.call(
            trader1,
            10, // max number of items returned
            false // activeOnly
        );
        console.log(data);

        data = data.substr(2); // remove 0x from front
        const itemCount = 16;
        const objCount = data.length / 64 / itemCount;
        var loanPositions = [];

        if (objCount % 1 != 0) { // must be a whole number
            console.error("error: data length invalid!");
            assert.isOk(false);
        } else {
            var loanPositionObjArray = data.match(new RegExp('.{1,' + (itemCount * 64) + '}', 'g'));
            console.log("loanPositionObjArray.length: " + loanPositionObjArray.length);
            for (var i = 0; i < loanPositionObjArray.length; i++) {
                var params = loanPositionObjArray[i].match(new RegExp('.{1,' + 64 + '}', 'g'));
                console.log(i + ": params.length: " + params.length);
                if (parseInt("0x" + params[0].substr(24)) == 0) {
                    continue;
                }
                loanPositions.push({
                    lender: "0x" + params[0].substr(24),
                    trader: "0x" + params[1].substr(24),
                    collateralTokenAddressFilled: "0x" + params[2].substr(24),
                    positionTokenAddressFilled: "0x" + params[3].substr(24),
                    loanTokenAmountFilled: parseInt("0x" + params[4]),
                    collateralTokenAmountFilled: parseInt("0x" + params[5]),
                    positionTokenAmountFilled: parseInt("0x" + params[6]),
                    loanStartUnixTimestampSec: parseInt("0x" + params[7]),
                    index: parseInt("0x" + params[8]),
                    active: parseInt("0x" + params[9]),
                    loanOrderHash: "0x" + params[10],
                    loanTokenAddress: "0x" + params[11].substr(24),
                    expirationUnixTimestampSec: parseInt("0x" + params[12]),
                    interestTokenAddress: "0x" + params[13].substr(24),
                    interestTotalAccrued: parseInt("0x" + params[14]),
                    interestPaidSoFar: parseInt("0x" + params[15])
                });
            }

            console.log(loanPositions);

            assert.isOk(true);
        }
    });

    it("should get loan positions (for trader2)", async () => {

        var data = await bZx.getLoansForTrader.call(
            trader2,
            10, // max number of items returned
            true // activeOnly
        );
        console.log(data);

        data = data.substr(2); // remove 0x from front
        const itemCount = 16;
        const objCount = data.length / 64 / itemCount;
        var loanPositions = [];

        if (objCount % 1 != 0) { // must be a whole number
            console.error("error: data length invalid!");
            assert.isOk(false);
        } else {
            var loanPositionObjArray = data.match(new RegExp('.{1,' + (itemCount * 64) + '}', 'g'));
            console.log("loanPositionObjArray.length: " + loanPositionObjArray.length);
            for (var i = 0; i < loanPositionObjArray.length; i++) {
                var params = loanPositionObjArray[i].match(new RegExp('.{1,' + 64 + '}', 'g'));
                console.log(i + ": params.length: " + params.length);
                if (parseInt("0x" + params[0].substr(24)) == 0) {
                    continue;
                }
                loanPositions.push({
                    lender: "0x" + params[0].substr(24),
                    trader: "0x" + params[1].substr(24),
                    collateralTokenAddressFilled: "0x" + params[2].substr(24),
                    positionTokenAddressFilled: "0x" + params[3].substr(24),
                    loanTokenAmountFilled: parseInt("0x" + params[4]),
                    collateralTokenAmountFilled: parseInt("0x" + params[5]),
                    positionTokenAmountFilled: parseInt("0x" + params[6]),
                    loanStartUnixTimestampSec: parseInt("0x" + params[7]),
                    index: parseInt("0x" + params[8]),
                    active: parseInt("0x" + params[9]),
                    loanOrderHash: "0x" + params[10],
                    loanTokenAddress: "0x" + params[11].substr(24),
                    expirationUnixTimestampSec: parseInt("0x" + params[12]),
                    interestTokenAddress: "0x" + params[13].substr(24),
                    interestTotalAccrued: parseInt("0x" + params[14]),
                    interestPaidSoFar: parseInt("0x" + params[15])
                });
            }

            console.log(loanPositions);

            assert.isOk(true);
        }
    });

    it("should get active loans", async () => {

        var data = await bZx.getActiveLoans.call(
            0, // starting item
            10 // max number of items returned
        );
        console.log(data);

        data = data.substr(2); // remove 0x from front
        const itemCount = 3;
        const objCount = data.length / 64 / itemCount;
        var loans = [];

        if (objCount % 1 != 0) { // must be a whole number
            console.error("error: data length invalid!");
            assert.isOk(false);
        } else {
            var loansObjArray = data.match(new RegExp('.{1,' + (itemCount * 64) + '}', 'g'));
            console.log("loansObjArray.length: " + loansObjArray.length);
            for (var i = 0; i < loansObjArray.length; i++) {
                var params = loansObjArray[i].match(new RegExp('.{1,' + 64 + '}', 'g'));
                console.log(i + ": params.length: " + params.length);
                if (parseInt("0x" + params[0].substr(24)) == 0) {
                    continue;
                }
                loans.push({
                    loanOrderHash: "0x" + params[0],
                    trader: "0x" + params[1].substr(24),
                    expirationUnixTimestampSec: parseInt("0x" + params[2])
                });
            }

            console.log(loans);

            assert.isOk(true);
        }
    });

    it("should generate 0x V2 orders", async () => {
        OrderParams_0xV2_1 = {
            "exchangeAddress": config["addresses"]["development"]["ZeroEx"]["ExchangeV2"],
            "makerAddress": makerOf0xOrder1_account,
            "takerAddress": utils.zeroAddress,
            "feeRecipientAddress": owner,
            "senderAddress": utils.zeroAddress,
            "makerAssetAmount": web3.toWei(3, "ether").toString(),
            "takerAssetAmount": web3.toWei(1.2, "ether").toString(),
            "makerFee": web3.toWei(0.0005, "ether").toString(),
            "takerFee": web3.toWei(0.01, "ether").toString(),
            "expirationTimeSeconds": (web3.eth.getBlock("latest").timestamp + 86400).toString(),
            "salt": ZeroExV2.generatePseudoRandomSalt().toString(),
            "makerAssetData": ZeroExV2.encodeERC20AssetData(maker0xV2Token1.address),
            "takerAssetData": ZeroExV2.encodeERC20AssetData(loanToken1.address),
        };
        console.log("OrderParams_0xV2_1:");
        console.log(OrderParams_0xV2_1);

        OrderParams_0xV2_2 = {
            "exchangeAddress": config["addresses"]["development"]["ZeroEx"]["ExchangeV2"],
            "makerAddress": maker2,
            "takerAddress": utils.zeroAddress,
            "feeRecipientAddress": owner,
            "senderAddress": utils.zeroAddress,
            "makerAssetAmount": web3.toWei(120, "ether").toString(),
            "takerAssetAmount": web3.toWei(72, "ether").toString(),
            "makerFee": "0",
            "takerFee": web3.toWei(0.0025, "ether").toString(),
            "expirationTimeSeconds": (web3.eth.getBlock("latest").timestamp + 86400).toString(),
            "salt": ZeroExV2.generatePseudoRandomSalt().toString(),
            "makerAssetData": ZeroExV2.encodeERC20AssetData(maker0xV2Token1.address),
            "takerAssetData": ZeroExV2.encodeERC20AssetData(loanToken1.address),
        };
        console.log("OrderParams_0xV2_2:");
        console.log(OrderParams_0xV2_2);

        OrderHash_0xV2_1 = ZeroExV2.getOrderHashHex(OrderParams_0xV2_1);
        OrderHash_0xV2_2 = ZeroExV2.getOrderHashHex(OrderParams_0xV2_2);

        console.log("OrderHash_0xV2_1 with 0x.js: " + OrderHash_0xV2_1);
        console.log("OrderHash_0xV2_2 with 0x.js: " + OrderHash_0xV2_2);


        assert.isOk(ZeroExV2.isValidOrderHash(OrderHash_0xV2_1) && ZeroExV2.isValidOrderHash(OrderHash_0xV2_2));

        OrderParams_0xV2_1_prepped = [
            OrderParams_0xV2_1["makerAddress"],
            OrderParams_0xV2_1["takerAddress"],
            OrderParams_0xV2_1["feeRecipientAddress"],
            OrderParams_0xV2_1["senderAddress"],
            '0x' + Web3Utils.padLeft(new BN(OrderParams_0xV2_1["makerAssetAmount"]), 64),
            '0x' + Web3Utils.padLeft(new BN(OrderParams_0xV2_1["takerAssetAmount"]), 64),
            '0x' + Web3Utils.padLeft(new BN(OrderParams_0xV2_1["makerFee"]), 64),
            '0x' + Web3Utils.padLeft(new BN(OrderParams_0xV2_1["takerFee"]), 64),
            '0x' + Web3Utils.padLeft(new BN(OrderParams_0xV2_1["expirationTimeSeconds"]), 64),
            '0x' + Web3Utils.padLeft(new BN(OrderParams_0xV2_1["salt"]), 64),
            OrderParams_0xV2_1["makerAssetData"],
            OrderParams_0xV2_1["takerAssetData"]
        ];

        OrderParams_0xV2_2_prepped = [
            OrderParams_0xV2_2["makerAddress"],
            OrderParams_0xV2_2["takerAddress"],
            OrderParams_0xV2_2["feeRecipientAddress"],
            OrderParams_0xV2_2["senderAddress"],
            '0x' + Web3Utils.padLeft(new BN(OrderParams_0xV2_2["makerAssetAmount"]), 64),
            '0x' + Web3Utils.padLeft(new BN(OrderParams_0xV2_2["takerAssetAmount"]), 64),
            '0x' + Web3Utils.padLeft(new BN(OrderParams_0xV2_2["makerFee"]), 64),
            '0x' + Web3Utils.padLeft(new BN(OrderParams_0xV2_2["takerFee"]), 64),
            '0x' + Web3Utils.padLeft(new BN(OrderParams_0xV2_2["expirationTimeSeconds"]), 64),
            '0x' + Web3Utils.padLeft(new BN(OrderParams_0xV2_2["salt"]), 64),
            OrderParams_0xV2_2["makerAssetData"],
            OrderParams_0xV2_2["takerAssetData"]
        ];


        // using ethers.js for ABI v2 encoding
        const provider = await (new providers.Web3Provider(web3.currentProvider));
        const signer = await provider.getSigner(trader1);
        const helper = await (new Contract(zeroExV2Helper.address, zeroExV2Helper.abi, signer));
        OrderHash_0xV2_1_onchain = await helper.getOrderHash(OrderParams_0xV2_1_prepped);
        OrderHash_0xV2_2_onchain = await helper.getOrderHash(OrderParams_0xV2_2_prepped);

        console.log("OrderHash_0xV2_1 with contracts: " + OrderHash_0xV2_1_onchain);
        console.log("OrderHash_0xV2_2 with contracts: " + OrderHash_0xV2_2_onchain);
        /*
        if (ZeroExV2.isValidOrderHash(OrderHash_0xV2_1))
        console.log("valid1 -> true");
        if (ZeroExV2.isValidOrderHash(OrderHash_0xV2_2))
        console.log("valid2 -> true");
        */
        assert.isOk(true);
    });

    it("should sign and verify 0x V2 orders", async () => {

        ECSignature_0xV2_1 = await zeroExV2.ecSignOrderHashAsync(
            OrderHash_0xV2_1_onchain,
            OrderParams_0xV2_1["makerAddress"], {
                prefixType: "ETH_SIGN",
                shouldAddPrefixBeforeCallingEthSign: false
            }
        );
        console.log(ECSignature_0xV2_1);
        ECSignature_0xV2_raw_1 = "0x" + ECSignature_0xV2_1["v"].toString(16) + ECSignature_0xV2_1["r"].substr(2) + ECSignature_0xV2_1["s"].substr(2) + "03";
        console.log(ECSignature_0xV2_raw_1);

        ECSignature_0xV2_2 = await zeroExV2.ecSignOrderHashAsync(
            OrderHash_0xV2_2_onchain,
            OrderParams_0xV2_2["makerAddress"], {
                prefixType: "ETH_SIGN",
                shouldAddPrefixBeforeCallingEthSign: false
            }
        );
        console.log(ECSignature_0xV2_2);
        ECSignature_0xV2_raw_2 = "0x" + ECSignature_0xV2_2["v"].toString(16) + ECSignature_0xV2_2["r"].substr(2) + ECSignature_0xV2_2["s"].substr(2) + "03";
        console.log(ECSignature_0xV2_raw_2);

        var result1 = await exchange_0xV2.isValidSignature.call(
            OrderHash_0xV2_1_onchain,
            OrderParams_0xV2_1["makerAddress"],
            ECSignature_0xV2_raw_1
        );

        var result2 = await exchange_0xV2.isValidSignature.call(
            OrderHash_0xV2_2_onchain,
            OrderParams_0xV2_2["makerAddress"],
            ECSignature_0xV2_raw_2
        );

        assert.isOk(result1 && result2);
    });

    it("should trade position with 0x V2 orders", async () => {
        // using ethers.js for ABI v2 encoding
        var iface = await (new Interface(bZx.abi));
        var tradePositionWith0xV2 = await iface.functions.tradePositionWith0xV2(
            OrderHash_bZx_1,
            [OrderParams_0xV2_1_prepped, OrderParams_0xV2_2_prepped],
            [ECSignature_0xV2_raw_1, ECSignature_0xV2_raw_2]);
        let txData = tradePositionWith0xV2.data;

        let tx = await bZx.sendTransaction({data: txData,from: trader1})
    });

    it("should trade position with oracle", async () => {
        await bZx.tradePositionWithOracle(OrderHash_bZx_1, interestToken2.address, {from: trader1});
    });

    it("should withdraw profits", async () => {
        let initialProfit = await bZx.getProfitOrLoss.call(OrderHash_bZx_1, trader1);
        assert.isTrue(initialProfit[0]);

        let traderInitialBalance = await ERC20.at(initialProfit[2]).balanceOf(trader1);
        let vaultInitialBalance = await ERC20.at(initialProfit[2]).balanceOf(vault.address);

        var tx = await bZx.withdrawProfit(OrderHash_bZx_1, {from: trader1});

        let finalProfit = await bZx.getProfitOrLoss.call(OrderHash_bZx_1, trader1);
        assert.isFalse(finalProfit[0]);

        let traderFinalBalance = await ERC20.at(initialProfit[2]).balanceOf(trader1);
        let vaultFinalBalance = await ERC20.at(initialProfit[2]).balanceOf(vault.address);

        assert.isTrue(traderFinalBalance.eq(traderInitialBalance.add(initialProfit[1])));
        assert.isTrue(vaultFinalBalance.eq(vaultInitialBalance.sub(initialProfit[1])));
    });

    it("should pay lender interest", async () => {
        let amount2pay = await bZx.payInterest.call(OrderHash_bZx_1, trader1, {from: trader1});

        let vaultInitialBalance = await interestToken1.balanceOf(vault.address);
        let oracleInitialBalance = await interestToken1.balanceOf(oracle.address);
        let lenderInitialBalance = await interestToken1.balanceOf(lender1);

        let tx = await bZx.payInterest(OrderHash_bZx_1, trader1, {from: trader1});

        let vaultBalance = await interestToken1.balanceOf(vault.address);
        let oracleBalance = await interestToken1.balanceOf(oracle.address);
        let lenderBalance = await interestToken1.balanceOf(lender1);

        let receivedTokens = (lenderBalance.sub(lenderInitialBalance)).add(oracleBalance.sub(oracleInitialBalance));
        let sendTokens = vaultInitialBalance.sub(vaultBalance);
        assert.isTrue(amount2pay.eq(receivedTokens));
        assert.isTrue(amount2pay.eq(sendTokens));
    });

    context("Collateral", async () => {
        before('before', async () => {
            await reverter.snapshot();
        })

        it("shouldn't allow to change collateral (for stranger)", async () => {
            try {
                await bZx.changeCollateral(OrderHash_bZx_1, interestToken1.address, {from: stranger});
                assert.isTrue(false);
            } catch (e) {
                utils.ensureException(e);
            }
        });

        it("should change collateral with not exists loan order (for trader1)", async () => {
            try {
                await bZx.changeCollateral("some not exists loan order hash", interestToken1.address, {from: trader1})
                assert.isTrue(false);
            } catch (e) {
                utils.ensureException(e);
            }
        });

        it("should change collateral (for trader1)", async () => {
            assert.equal((await bZx.loanPositions.call(OrderHash_bZx_1, trader1))[2], collateralToken1.address);

            let initialBalance1Trader = await collateralToken1.balanceOf(trader1);
            let initialBalance1Vault = await collateralToken1.balanceOf(vault.address);

            let initialBalance2Trader = await interestToken1.balanceOf(trader1);
            let initialBalance2Vault = await interestToken1.balanceOf(vault.address);

            await bZx.changeCollateral(OrderHash_bZx_1, interestToken1.address, {from: trader1});

            let finalBalance1Trader = await collateralToken1.balanceOf(trader1);
            let finalBalance1Vault = await collateralToken1.balanceOf(vault.address);

            let finalBalance2Trader = await interestToken1.balanceOf(trader1);
            let finalBalance2Vault = await interestToken1.balanceOf(vault.address);

            assert.isTrue(finalBalance1Trader.sub(initialBalance1Trader).eq(initialBalance1Vault.sub(finalBalance1Vault)));
            assert.isTrue(finalBalance2Vault.sub(initialBalance2Vault).eq(initialBalance2Trader.sub(finalBalance2Trader)));

            assert.equal((await bZx.loanPositions.call(OrderHash_bZx_1, trader1))[2], interestToken1.address);
        });

        it("should crash if collateral is the same (for trader1)", async () => {
            assert.equal((await bZx.loanPositions.call(OrderHash_bZx_1, trader1))[2], interestToken1.address);

            try {
                await bZx.changeCollateral(OrderHash_bZx_1, interestToken1.address, {from: trader1});
                assert.isTrue(false);
            } catch (e) {
                utils.ensureException(e);
            }
        });

        it("should increase collateral (for trader1)", async () => {
            const VALUE = 100;
            assert.equal((await bZx.loanPositions.call(OrderHash_bZx_1, trader1))[2], interestToken1.address);

            await bZx.depositCollateral(OrderHash_bZx_1, interestToken1.address, VALUE, {from: trader1});
        });

        it("should withdraw excess collateral (for trader1)", async () => {
            const VALUE = 100;
            assert.equal((await bZx.loanPositions.call(OrderHash_bZx_1, trader1))[2], interestToken1.address);

            await bZx.withdrawExcessCollateral(OrderHash_bZx_1, interestToken1.address, VALUE, {from: trader1});
        });

        after(async () => {
            await reverter.revert();
        })
    })

    context("Loan finalization", async () => {
        before('before', async () => {
            await reverter.snapshot();
        })

        it("should close loan as (lender1/trader1)", async () => {
            await bZx.closeLoan(OrderHash_bZx_1, {from: trader1});

            await reverter.revert();
        });

        it("should liquidate position", async () => {
            await bZx.liquidatePosition(OrderHash_bZx_1, trader1, {from: makerOf0xOrder1_account});

            await reverter.revert();
        });

        it("should force close loan", async () => {
            await bZx.forceCloanLoan(OrderHash_bZx_1, trader1, {from: owner});

            await reverter.revert();
        });

        after(async () => {
            await reverter.revert();
        })
    })

    function toHex(d) {
        return ("0" + (Number(d).toString(16))).slice(-2).toUpperCase()
    }
});
