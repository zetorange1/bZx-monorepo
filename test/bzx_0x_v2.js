const BZxProxy = artifacts.require("BZxProxy");
const BZx = artifacts.require("BZx");
const ZeroExV2Helper = artifacts.require("ZeroExV2Helper");
const Exchange0xV2 = artifacts.require("ExchangeV2InterfaceWithEvents");
const ERC20 = artifacts.require("ERC20");
const BZxVault = artifacts.require("BZxVault");

const BZxOracle = artifacts.require("TestNetOracle");   // TODO: get rid of this
import { ZeroEx as ZeroExV2 } from '0xV2.js';  // TODO: get rid of this
var config = require('../protocol-config.js'); // TODO: get rid of this

const { Interface, providers, Contract } = require('ethers');



import Web3Utils from 'web3-utils';

const utils = require('./utils/utils.js');
const Reverter = require('./utils/reverter');
const BigNumber = require('bignumber.js');
const BN = require('bn.js');
const _ = require('underscore');

const MAX_UINT = new BigNumber(2).pow(256).minus(1).toString();

contract('BZx_0x_v2', function (accounts) {
    let reverter = new Reverter(web3);

    const owner = accounts[0];
    const stranger = accounts[2];

    const NULL_ADDRESS = "0x0000000000000000000000000000000000000000"; // TODO: get rid of this
    const NONNULL_ADDRESS = "0x0000000000000000000000000000000000000001"; // TODO: get rid of this

    let bZx;
    let vault;
    let zrx_token;
    let exchange_0xV2;
    let zeroExV2Helper;
    let zeroExV2;

    let test_tokens = [];

    // tokens
    let loanToken1;
    let loanToken2;
    let collateralToken1;
    let collateralToken2;
    let interestToken1;
    let interestToken2;
    let maker0xToken1;
    let maker0xV2Token1;

    // accounts
    const lender = accounts[3]; // lender1_account
    const traider = accounts[5]; // trader1_account
    const maker = accounts[6]; // makerOf0xOrder1_account

    let oracle;

    before('retrieve all deployed test tokens', async function () {
      for (var i = 0; i < 10; i++) {
        test_tokens[i] = await artifacts.require("TestToken"+i).deployed();
        console.log("Test Token "+i+" retrieved: "+test_tokens[i].address);
      }
    });

    before('init', async () => {
        vault = await BZxVault.deployed();

        loanToken1 = test_tokens[0];
        interestToken1 = test_tokens[4];
        maker0xV2Token1 = test_tokens[7];

        await loanToken1.transfer(lender, web3.toWei(1000000, "ether"));
        await loanToken1.approve(vault.address, MAX_UINT, {from: lender});

        await interestToken1.transfer(traider, web3.toWei(1000000, "ether"));
        await interestToken1.approve(vault.address, MAX_UINT, {from: traider});

        await maker0xV2Token1.transfer(maker, web3.toWei(10000, "ether"));
        await maker0xV2Token1.approve(config["addresses"]["development"]["ZeroEx"]["ERC20Proxy"], MAX_UINT, {from: maker});

        oracle = await BZxOracle.deployed();

        bZx = await BZx.at((await BZxProxy.deployed()).address);
        zrx_token = await ERC20.at(config["addresses"]["development"]["ZeroEx"]["ZRXToken"]);
        exchange_0xV2 = await Exchange0xV2.at(config["addresses"]["development"]["ZeroEx"]["ExchangeV2"]);
        zeroExV2Helper = await ZeroExV2Helper.deployed();

        zeroExV2 = new ZeroExV2(web3.currentProvider, {
         blockPollingIntervalMs: undefined,
         erc20ProxyContractAddress: undefined,
         erc721ProxyContractAddress: undefined,
         exchangeContractAddress: undefined,
         gasPrice: BigNumber(8000000000),
         networkId: 50,
         zrxContractAddress: undefined,
       });

        await reverter.snapshot();
    })

    after("after", async () => {
    })

    context("Register", async () => {
        let OrderParams_0xV2_1;
        let OrderParams_0xV2_2;

        let OrderHash_0xV2_1_onchain;
        let OrderHash_0xV2_2_onchain;

        let ECSignature_0xV2_raw_1;
        let ECSignature_0xV2_raw_2;

        let OrderHash_bZx_1;

        let OrderParams_0xV2_1_prepped;
        let OrderParams_0xV2_2_prepped;


        before('init', async () => {
            let OrderParams_bZx_1 = {
                  "bZxAddress": bZx.address,
                  "makerAddress": lender, // lender
                  "loanTokenAddress": loanToken1.address,
                  "interestTokenAddress": interestToken1.address,
                  "collateralTokenAddress": NULL_ADDRESS,
                  "feeRecipientAddress": NULL_ADDRESS,
                  "oracleAddress": oracle.address,
                  "loanTokenAmount": web3.toWei(100000, "ether").toString(),
                  "interestAmount": web3.toWei(2, "ether").toString(), // 2 token units per day
                  "initialMarginAmount": "50", // 50%
                  "maintenanceMarginAmount": "5", // 25%
                  "lenderRelayFee": web3.toWei(0.001, "ether").toString(),
                  "traderRelayFee": web3.toWei(0.0015, "ether").toString(),
                  "expirationUnixTimestampSec": (web3.eth.getBlock("latest").timestamp+86400).toString(),
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
            ])
        });

        (run["should take sample loan order (as lender1/trader1)"] ? it : it.skip)("should take sample loan order (as lender1/trader1)", function(done) {
          let tx = await bZx.takeLoanOrderAsTrader(
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
            {from: trader}).then(function(tx) {
              console.log(txPrettyPrint(tx,"should take sample loan order (as lender1/trader1)"));
              assert.isOk(tx);
              done();
            }), function(error) {
              console.error("error: "+error);
              assert.isOk(false);
              done();
            };
        });

        it("should generate 0x V2 orders", async () => {
            console.log(6);
            OrderParams_0xV2_1 = {
                "exchangeAddress": config["addresses"]["development"]["ZeroEx"]["ExchangeV2"],
                "makerAddress": maker,
                "takerAddress": NULL_ADDRESS,
                "feeRecipientAddress": NONNULL_ADDRESS,
                "senderAddress": NULL_ADDRESS,
                "makerAssetAmount": web3.toWei(3, "ether").toString(),
                "takerAssetAmount": web3.toWei(1.2, "ether").toString(),
                "makerFee": web3.toWei(0.0005, "ether").toString(),
                "takerFee": web3.toWei(0.01, "ether").toString(),
                "expirationTimeSeconds": (web3.eth.getBlock("latest").timestamp+86400).toString(),
                "salt": ZeroExV2.generatePseudoRandomSalt().toString(),
                "makerAssetData": ZeroExV2.encodeERC20AssetData(maker0xV2Token1.address),
                "takerAssetData": ZeroExV2.encodeERC20AssetData(loanToken1.address),
            };

            OrderParams_0xV2_2 = {
                "exchangeAddress": config["addresses"]["development"]["ZeroEx"]["ExchangeV2"],
                "makerAddress": maker,
                "takerAddress": NULL_ADDRESS,
                "feeRecipientAddress": NONNULL_ADDRESS,
                "senderAddress": NULL_ADDRESS,
                "makerAssetAmount": web3.toWei(120, "ether").toString(),
                "takerAssetAmount": web3.toWei(72, "ether").toString(),
                "makerFee": "0",
                "takerFee": web3.toWei(0.0025, "ether").toString(),
                "expirationTimeSeconds": (web3.eth.getBlock("latest").timestamp+86400).toString(),
                "salt": ZeroExV2.generatePseudoRandomSalt().toString(),
                "makerAssetData": ZeroExV2.encodeERC20AssetData(maker0xV2Token1.address),
                "takerAssetData": ZeroExV2.encodeERC20AssetData(loanToken1.address),
            };


            let OrderHash_0xV2_1 = ZeroExV2.getOrderHashHex(OrderParams_0xV2_1);
            let OrderHash_0xV2_2 = ZeroExV2.getOrderHashHex(OrderParams_0xV2_2);


            console.log("OrderHash_0xV2_1 with 0x.js: "+OrderHash_0xV2_1);
            console.log("OrderHash_0xV2_2 with 0x.js: "+OrderHash_0xV2_2);


            assert.isOk(ZeroExV2.isValidOrderHash(OrderHash_0xV2_1) && ZeroExV2.isValidOrderHash(OrderHash_0xV2_2));

            OrderParams_0xV2_1_prepped = [
                OrderParams_0xV2_1["makerAddress"],
                OrderParams_0xV2_1["takerAddress"],
                OrderParams_0xV2_1["feeRecipientAddress"],
                OrderParams_0xV2_1["senderAddress"],
                '0x'+Web3Utils.padLeft(new BigNumber(OrderParams_0xV2_1["makerAssetAmount"]), 64),
                '0x'+Web3Utils.padLeft(new BigNumber(OrderParams_0xV2_1["takerAssetAmount"]), 64),
                '0x'+Web3Utils.padLeft(new BigNumber(OrderParams_0xV2_1["makerFee"]), 64),
                '0x'+Web3Utils.padLeft(new BigNumber(OrderParams_0xV2_1["takerFee"]), 64),
                '0x'+Web3Utils.padLeft(new BigNumber(OrderParams_0xV2_1["expirationTimeSeconds"]), 64),
                '0x'+Web3Utils.padLeft(new BigNumber(OrderParams_0xV2_1["salt"]), 64),
                OrderParams_0xV2_1["makerAssetData"],
                OrderParams_0xV2_1["takerAssetData"]
            ];

            OrderParams_0xV2_2_prepped = [
                OrderParams_0xV2_2["makerAddress"],
                OrderParams_0xV2_2["takerAddress"],
                OrderParams_0xV2_2["feeRecipientAddress"],
                OrderParams_0xV2_2["senderAddress"],
                '0x'+Web3Utils.padLeft(new BigNumber(OrderParams_0xV2_2["makerAssetAmount"]), 64),
                '0x'+Web3Utils.padLeft(new BigNumber(OrderParams_0xV2_2["takerAssetAmount"]), 64),
                '0x'+Web3Utils.padLeft(new BigNumber(OrderParams_0xV2_2["makerFee"]), 64),
                '0x'+Web3Utils.padLeft(new BigNumber(OrderParams_0xV2_2["takerFee"]), 64),
                '0x'+Web3Utils.padLeft(new BigNumber(OrderParams_0xV2_2["expirationTimeSeconds"]), 64),
                '0x'+Web3Utils.padLeft(new BigNumber(OrderParams_0xV2_2["salt"]), 64),
                OrderParams_0xV2_2["makerAssetData"],
                OrderParams_0xV2_2["takerAssetData"]
            ];


            // using ethers.js for ABI v2 encoding
            const provider = await (new providers.Web3Provider(web3.currentProvider));
            const signer = await provider.getSigner(traider);
            const helper = await (new Contract(zeroExV2Helper.address, zeroExV2Helper.abi, signer));

            OrderHash_0xV2_1_onchain = await helper.getOrderHash(OrderParams_0xV2_1_prepped);
            OrderHash_0xV2_2_onchain = await helper.getOrderHash(OrderParams_0xV2_2_prepped);

            console.log("OrderHash_0xV2_1 with contracts: "+OrderHash_0xV2_1_onchain);
            console.log("OrderHash_0xV2_2 with contracts: "+OrderHash_0xV2_2_onchain);
            /*
            if (ZeroExV2.isValidOrderHash(OrderHash_0xV2_1))
            console.log("valid1 -> true");
            if (ZeroExV2.isValidOrderHash(OrderHash_0xV2_2))
            console.log("valid2 -> true");
            */
            assert.isOk(true);
        });

        it("should sign and verify 0x V2 orders", async () => {

            let ECSignature_0xV2_1 = await zeroExV2.ecSignOrderHashAsync(
                OrderHash_0xV2_1_onchain,
                OrderParams_0xV2_1["makerAddress"],
                {
                    prefixType: "ETH_SIGN",
                    shouldAddPrefixBeforeCallingEthSign: false
                }
            );
            console.log(ECSignature_0xV2_1);
            ECSignature_0xV2_raw_1 = "0x"+ECSignature_0xV2_1["v"].toString(16)+ECSignature_0xV2_1["r"].substr(2)+ECSignature_0xV2_1["s"].substr(2)+"03";
            console.log(ECSignature_0xV2_raw_1);

            let ECSignature_0xV2_2 = await zeroExV2.ecSignOrderHashAsync(
                OrderHash_0xV2_2_onchain,
                OrderParams_0xV2_2["makerAddress"],
                {
                    prefixType: "ETH_SIGN",
                    shouldAddPrefixBeforeCallingEthSign: false
                }
            );
            console.log(ECSignature_0xV2_2);
            ECSignature_0xV2_raw_2 = "0x"+ECSignature_0xV2_2["v"].toString(16)+ECSignature_0xV2_2["r"].substr(2)+ECSignature_0xV2_2["s"].substr(2)+"03";
            console.log(ECSignature_0xV2_raw_2);


            var result1 = await exchange_0xV2.isValidSignature.call(
                OrderHash_0xV2_1_onchain,
                OrderParams_0xV2_1["makerAddress"],
                ECSignature_0xV2_raw_1
            );

            assert.isOk(result1);

            var result2 = await exchange_0xV2.isValidSignature.call(
                OrderHash_0xV2_2_onchain,
                OrderParams_0xV2_2["makerAddress"],
                ECSignature_0xV2_raw_2
            );

            assert.isOk(result2);
        });

        it("should trade position with 0x V2 orders", async function() {
            //const provider = await (new providers.Web3Provider(web3.currentProvider));

            // using ethers.js for ABI v2 encoding
            var iface = await (new Interface(bZx.abi));
            console.log(1)
            var tradePositionWith0xV2 = await iface.functions.tradePositionWith0xV2(
                OrderHash_bZx_1,
                [OrderParams_0xV2_2_prepped],
                [ECSignature_0xV2_raw_2]);
                let txData = tradePositionWith0xV2.data;

                console.log(2);

                let tx = await bZx.sendTransaction({data: txData, from: traider})
                console.log(await txPrettyPrint(tx,"should trade position with 0x V2 orders"));
        });

        after(async () => {
            await reverter.revert()
        })
    })
})
