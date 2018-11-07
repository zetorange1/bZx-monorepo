var BZxProxy = artifacts.require("BZxProxy");
var BZxProxySettings = artifacts.require("BZxProxySettings");
var BZxTo0x = artifacts.require("BZxTo0x");
var BZx = artifacts.require("BZx");
var BZxVault = artifacts.require("BZxVault");
var BZxOracle = artifacts.require("TestNetOracle");
var BZRxToken = artifacts.require("BZRxToken");
var BZRxTokenSale = artifacts.require("BZRxTokenSale");
var WETHInterface = artifacts.require("WETHInterface");
var ERC20 = artifacts.require("ERC20"); // for testing with any ERC20 token

//var fs = require('fs');

const BigNumber = require("bignumber.js");
const BN = require("bn.js");
const ethABI = require("ethereumjs-abi");
const ethUtil = require("ethereumjs-util");
const _ = require("lodash");

const Web3Utils = require("web3-utils");
const BZxJS = require("bzx.js").default;
const { ZeroEx } = require("0x.js");

const config = require("../protocol-config.js");

const currentGasPrice = 20000000000; // 20 gwei
const currentEthPrice = 1000; // USD

const SignatureType = Object.freeze({
  Illegal: 0,
  Invalid: 1,
  EIP712: 2,
  EthSign: 3,
  Wallet: 4,
  Validator: 5,
  PreSigned: 6
});

// this migration will complete when the embedded testnet is being setup (network: testnet)

module.exports = (deployer, network, accounts) => {
  if (network == "testnet") {
    network = "development";

    const MAX_UINT = (new BN(2)).pow(new BN(256)).sub(new BN(1));

    const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";
    //const NONNULL_ADDRESS = "0x0000000000000000000000000000000000000001";

    // account roles
    var owner_account = accounts[0].toLowerCase(); // owner/contract creator, holder of all tokens
    var lender1_account = accounts[4].toLowerCase(); // lender 1
    var trader1_account = accounts[3].toLowerCase(); // trader 1
    var lender2_account = accounts[2].toLowerCase(); // lender 2
    var trader2_account = accounts[1].toLowerCase(); // trader 2
    var makerOf0xOrder_account = accounts[6].toLowerCase(); // maker of 0x order
    var relay1_account = accounts[9].toLowerCase(); // relay 1

    var test_tokens = [];
    var loanToken1;
    var loanToken2;
    var collateralToken1;
    var collateralToken2;
    var interestToken1;
    var interestToken2;
    var maker0xToken1;

    var OrderParams_bZx_1;
    var ECSignature_raw_1;

    deployer.then(async function() {
     
      var bZxProxy = await BZxProxySettings.at(BZxProxy.address);
      var bZx = await BZx.at(bZxProxy.address);
      var vault = await BZxVault.deployed();
      var oracle = await BZxOracle.deployed();
      var bzrx_token = await BZRxToken.deployed();
      var bzrx_tokensale = await BZRxTokenSale.deployed();

      await bzrx_tokensale.closeSale(false);

      var bZxTo0x = await BZxTo0x.deployed();
      //var zrx_token;
      var zrx_token = await ERC20.at(config["addresses"]["development"]["ZeroEx"]["ZRXToken"]);

      var weth = await WETHInterface.at(config["addresses"][network]["ZeroEx"]["WETH9"]);
      var weth_token = await ERC20.at(config["addresses"][network]["ZeroEx"]["WETH9"]);

      for (var i = 0; i < 10; i++) {
        test_tokens[i] = await artifacts.require("TestToken" + i).deployed();
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
        await bzrx_token.mint(lender1_account, toWei(100, "ether"), { from: owner_account }),
        await weth.deposit({ from: lender2_account, value: toWei(10, "ether") }),
        await weth.deposit({ from: trader1_account, value: toWei(10, "ether") }),
        await weth.deposit({ from: trader2_account, value: toWei(0.00001, "ether") }),
        await bzrx_token.approve(vault.address, MAX_UINT, {
          from: lender1_account
        }),
        await weth_token.approve(bzrx_tokensale.address, MAX_UINT, {
          from: lender2_account
        }),
        await weth_token.approve(bzrx_tokensale.address, MAX_UINT, {
          from: trader1_account
        }),
        await weth_token.approve(bzrx_tokensale.address, MAX_UINT, {
          from: trader2_account
        }),
        await loanToken1.transfer(lender1_account, toWei(1000000, "ether"), { from: owner_account }),
        await loanToken2.transfer(lender2_account, toWei(1000000, "ether"), { from: owner_account }),
        await loanToken1.approve(vault.address, MAX_UINT, {
          from: lender1_account
        }),
        await loanToken2.approve(vault.address, MAX_UINT, {
          from: lender2_account
        }),
        await collateralToken1.transfer(trader1_account, toWei(1000000, "ether"), { from: owner_account }),
        await collateralToken2.transfer(trader2_account, toWei(1000000, "ether"), { from: owner_account }),
        await collateralToken1.approve(vault.address, MAX_UINT, {
          from: trader1_account
        }),
        await collateralToken2.approve(vault.address, MAX_UINT, {
          from: trader2_account
        }),
        await interestToken1.transfer(trader1_account, toWei(1000000, "ether"), { from: owner_account }),
        await interestToken1.transfer(trader2_account, toWei(1000000, "ether"), { from: owner_account }),
        await interestToken2.transfer(trader2_account, toWei(1000000, "ether"), { from: owner_account }),
        await interestToken1.approve(vault.address, MAX_UINT, {
          from: trader1_account
        }),
        await interestToken1.approve(vault.address, MAX_UINT, {
          from: trader2_account
        }),
        await interestToken2.approve(vault.address, MAX_UINT, {
          from: trader2_account
        }),
        await zrx_token.transfer(trader1_account, toWei(10000, "ether"), {
          from: owner_account
        }),
        await zrx_token.transfer(trader2_account, toWei(10000, "ether"), {
          from: owner_account
        }),
        await zrx_token.approve(bZxTo0x.address, MAX_UINT, {
          from: trader1_account
        }),
        await zrx_token.approve(bZxTo0x.address, MAX_UINT, {
          from: trader2_account
        }),
        await maker0xToken1.transfer(makerOf0xOrder_account, toWei(10000, "ether"), { from: owner_account }),
        await maker0xToken1.approve(config["addresses"]["development"]["ZeroEx"]["TokenTransferProxy"], MAX_UINT, {
          from: makerOf0xOrder_account
        })
      ]);

      /// should take sample loan order (as trader1)
      OrderParams_bZx_1 = {
        bZxAddress: bZx.address,
        makerAddress: lender1_account, // lender
        loanTokenAddress: loanToken1.address,
        interestTokenAddress: interestToken1.address,
        collateralTokenAddress: NULL_ADDRESS,
        feeRecipientAddress: relay1_account,
        oracleAddress: oracle.address,
        loanTokenAmount: toWei(10000, "ether").toString(),
        interestAmount: toWei(2.5, "ether").toString(), // 2 token units per day
        initialMarginAmount: "50", // 50%
        maintenanceMarginAmount: "25", // 25%
        lenderRelayFee: toWei(0.001, "ether").toString(),
        traderRelayFee: toWei(0.0013, "ether").toString(),
        maxDurationUnixTimestampSec: "2419200", // 28 days
        expirationUnixTimestampSec: ((await web3.eth.getBlock("latest")).timestamp + 86400).toString(),
        makerRole: "0", // 0=lender, 1=trader
        salt: ZeroEx.generatePseudoRandomSalt().toString()
      };
      //console.log(OrderParams_bZx_1);
      let OrderHash_bZx_1; //= BZxJS.getLoanOrderHashHex(OrderParams_bZx_1);
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
          new BN(OrderParams_bZx_1["maxDurationUnixTimestampSec"]),
          new BN(OrderParams_bZx_1["expirationUnixTimestampSec"]),
          new BN(OrderParams_bZx_1["makerRole"]),
          new BN(OrderParams_bZx_1["salt"])
        ],
        "0x12a1232124" // oracleData
      );

      ECSignature_raw_1 = await web3.eth.sign(OrderHash_bZx_1, lender1_account);
    
      // add signature type to end
      ECSignature_raw_1 = ECSignature_raw_1 + toHex(SignatureType.EthSign);

      /// should take sample loan order (as trader1)
      console.log(
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
            new BN(OrderParams_bZx_1["maxDurationUnixTimestampSec"]),
            new BN(OrderParams_bZx_1["expirationUnixTimestampSec"]),
            new BN(OrderParams_bZx_1["makerRole"]),
            new BN(OrderParams_bZx_1["salt"])
          ],
          "0x12a1232124", // oracleData
          collateralToken1.address,
          toWei(12.3, "ether"),
          ECSignature_raw_1,
          {
            from: trader1_account,
            gas: 2000000,
            gasPrice: toWei(30, "gwei")
          }
        )
      );

      /// should take sample loan order (as trader2)
      console.log(
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
            new BN(OrderParams_bZx_1["maxDurationUnixTimestampSec"]),
            new BN(OrderParams_bZx_1["expirationUnixTimestampSec"]),
            new BN(OrderParams_bZx_1["makerRole"]),
            new BN(OrderParams_bZx_1["salt"])
          ],
          "0x12a1232124", // oracleData
          collateralToken2.address,
          toWei(20, "ether"),
          ECSignature_raw_1,
          {
            from: trader2_account,
            gas: 2000000,
            gasPrice: toWei(20, "gwei")
          }
        )
      );

      OrderParams_0x = {
        exchangeContractAddress: config["addresses"]["development"]["ZeroEx"]["ExchangeV1"],
        expirationUnixTimestampSec: ((await web3.eth.getBlock("latest")).timestamp + 86400).toString(),
        feeRecipient: NULL_ADDRESS, //"0x1230000000000000000000000000000000000000",
        maker: makerOf0xOrder_account,
        makerFee: toWei(0.002, "ether").toString(),
        makerTokenAddress: maker0xToken1.address.toLowerCase(),
        makerTokenAmount: toWei(75.1, "ether").toString(),
        salt: ZeroEx.generatePseudoRandomSalt().toString(),
        taker: NULL_ADDRESS,
        takerFee: toWei(0.0013, "ether").toString(),
        takerTokenAddress: loanToken1.address.toLowerCase(),
        takerTokenAmount: toWei(100, "ether").toString()
      };
      console.log(OrderParams_0x);

      OrderHash_0x = ZeroEx.getOrderHashHex(OrderParams_0x);
        
      ECSignature_0x_raw = await web3.eth.sign(OrderHash_0x, makerOf0xOrder_account);

      ECSignature_0x = {
        v: parseInt(ECSignature_0x_raw.substring(130, 132)) + 27,
        r: "0x" + ECSignature_0x_raw.substring(2, 66),
        s: "0x" + ECSignature_0x_raw.substring(66, 130)
      };

      var types = [
        "bytes32",
        "bytes32",
        "bytes32",
        "bytes32",
        "bytes32",
        "bytes32",
        "bytes32",
        "bytes32",
        "bytes32",
        "bytes32",
        "bytes32"
      ];
      var values = [
        Web3Utils.padLeft(OrderParams_0x["maker"], 64),
        Web3Utils.padLeft(OrderParams_0x["taker"], 64),
        Web3Utils.padLeft(OrderParams_0x["makerTokenAddress"], 64),
        Web3Utils.padLeft(OrderParams_0x["takerTokenAddress"], 64),
        Web3Utils.padLeft(OrderParams_0x["feeRecipient"], 64),
        "0x" + Web3Utils.padLeft(new BN(OrderParams_0x["makerTokenAmount"]), 64),
        "0x" + Web3Utils.padLeft(new BN(OrderParams_0x["takerTokenAmount"]), 64),
        "0x" + Web3Utils.padLeft(new BN(OrderParams_0x["makerFee"]), 64),
        "0x" + Web3Utils.padLeft(new BN(OrderParams_0x["takerFee"]), 64),
        "0x" + Web3Utils.padLeft(new BN(OrderParams_0x["expirationUnixTimestampSec"]), 64),
        "0x" + Web3Utils.padLeft(new BN(OrderParams_0x["salt"]), 64)
      ];

      //console.log(values);
      var hashBuff = ethABI.solidityPack(types, values);
      //console.log(hashBuff);
      var sample_order_tightlypacked = ethUtil.bufferToHex(hashBuff);
      //console.log(sample_order_tightlypacked);
      //console.log(ECSignature_0x_raw);

      console.log("Before profit:");
      console.log(
        (await bZx.getProfitOrLoss.call(OrderHash_bZx_1, trader1_account, {
          from: lender2_account
        })).toString()
      );

      console.log(
        txPrettyPrint(
          await bZx.tradePositionWith0x(OrderHash_bZx_1, sample_order_tightlypacked, ECSignature_0x_raw, {
            from: trader1_account
          })
        ),
        ""
      );
      console.log("After profit:");
      console.log(
        (await bZx.getProfitOrLoss.call(OrderHash_bZx_1, trader1_account, {
          from: lender2_account
        })).toString()
      );

      console.log("Margin Levels:");
      console.log(
        (await bZx.getMarginLevels.call(OrderHash_bZx_1, trader1_account, {
          from: lender2_account
        })).toString()
      );
    });
  }

  function txLogsPrint(logs) {
    var ret = "";
    if (logs === undefined) {
      logs = [];
    }
    if (logs.length > 0) {
      logs = logs.sort(function(a, b) {
        return a.blockNumber > b.blockNumber ? 1 : b.blockNumber > a.blockNumber ? -1 : 0;
      });
      ret = ret + "\n  LOGS --> " + "\n";
      for (var i = 0; i < logs.length; i++) {
        var log = logs[i];
        //console.log(log);
        ret = ret + "  " + i + ": " + log.event + " " + JSON.stringify(log.args);
        if (log.event == "GasRefund") {
          ret =
            ret +
            " -> Refund: " +
            ((log.args.refundAmount / 1e18) * currentEthPrice).toFixed(2) +
            "USD @ " +
            currentEthPrice +
            "USD/ETH)";
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
      ret = ret + "  tx: " + tx.tx + "\n";
      if (tx.receipt !== undefined) {
        ret = ret + "  blockNumber: " + tx.receipt.blockNumber + "\n";
        ret =
          ret +
          "  gasUsed: " +
          tx.receipt.gasUsed +
          " -> x" +
          currentGasPrice +
          " = " +
          tx.receipt.gasUsed * currentGasPrice +
          " (" +
          (((tx.receipt.gasUsed * currentGasPrice) / 1e18) * currentEthPrice).toFixed(2) +
          "USD @ " +
          currentEthPrice +
          "USD/ETH)\n";
        ret =
          ret +
          "  cumulativeGasUsed: " +
          tx.receipt.cumulativeGasUsed +
          " -> x" +
          currentGasPrice +
          " = " +
          tx.receipt.cumulativeGasUsed * currentGasPrice +
          " (" +
          (((tx.receipt.cumulativeGasUsed * currentGasPrice) / 1e18) * currentEthPrice).toFixed(2) +
          "USD @ " +
          currentEthPrice +
          "USD/ETH)\n";
        ret = ret + "  status: " + tx.receipt.status + "\n";
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
    return ("0" + Number(d).toString(16)).slice(-2).toUpperCase();
  }

  function toWei(number, unit) {
    if (web3.utils.isBN(number)) {
      return web3.utils.toWei(number, unit);
    } else {
      return web3.utils.toBN(web3.utils.toWei(number.toString(), unit));
    }
  }
};
