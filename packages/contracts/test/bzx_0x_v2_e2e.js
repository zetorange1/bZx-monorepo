const BZx = artifacts.require("BZx");
const BZxProxy = artifacts.require("BZxProxy");
const BZxVault = artifacts.require("BZxVault");
const BZxOracle = artifacts.require("TestNetOracle");
const ERC20 = artifacts.require("ERC20");

const BZxTo0xV2 = artifacts.require("BZxTo0xV2");
const Exchange0xV2 = artifacts.require("ExchangeV2InterfaceWithEvents");
const ZeroExV2Helper = artifacts.require("ZeroExV2Helper");

const BigNumber = require("bignumber.js");
const BN = require("bn.js");
const ethers = require("ethers");

import Web3Utils from "web3-utils";
import {
  assetDataUtils,
  signatureUtils,
  generatePseudoRandomSalt,
  orderHashUtils
} from "@0xproject/order-utils";

var config = require("../protocol-config.js");

const Reverter = require("./utils/reverter");
const eventsHelper = require("./utils/eventsHelper");
const utils = require("./utils/utils.js");

const MAX_UINT = (new BN(2)).pow(new BN(256)).sub(new BN(1));

const SignatureType = Object.freeze({
  Illegal: 0,
  Invalid: 1,
  EIP712: 2,
  EthSign: 3,
  Wallet: 4,
  Validator: 5,
  PreSigned: 6
});

let currentGasPrice = 8000000000; // 8 gwei
let currentEthPrice = 250; // USD

contract("BZxTest", function(accounts) {
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
  var OrderHash_0xV2_1,
    OrderHash_0xV2_2,
    OrderHash_0xV2_1_onchain,
    OrderHash_0xV2_2_onchain;
  var ECSignature_0xV2_raw_1, ECSignature_0xV2_raw_2;
  var ECSignature_0xV2_1, ECSignature_0xV2_2;

  var OrderParams_0xV2_1_prepped, OrderParams_0xV2_2_prepped;

  // account roles
  var owner = accounts[0].toLowerCase(); // owner/contract creator, holder of all tokens
  var lender1 = accounts[1].toLowerCase(); // lender 1
  var trader1 = accounts[2].toLowerCase(); // trader 1
  var lender2 = accounts[3].toLowerCase(); // lender 2
  var trader2 = accounts[4].toLowerCase(); // trader 2
  var maker1 = accounts[7].toLowerCase(); // maker of 0x order
  var maker2 = accounts[8].toLowerCase(); // maker of 0x order

  var loanToken1;
  var loanToken2;
  var collateralToken1;
  var collateralToken2;
  var interestToken1;
  var interestToken2;
  var maker0xV2Token1;

  var stranger = accounts[6];

  before("Init: retrieve all deployed contracts", async () => {
    vault = await BZxVault.deployed();
    bZxTo0xV2 = await BZxTo0xV2.deployed();
    oracle = await BZxOracle.deployed();

    bZx = await BZx.at((await BZxProxy.deployed()).address);

    exchange_0xV2 = await Exchange0xV2.at(config["addresses"]["development"]["ZeroEx"]["ExchangeV2"]);
    zeroExV2Helper = await ZeroExV2Helper.deployed();

    zrx_token = await ERC20.at(config["addresses"]["development"]["ZeroEx"]["ZRXToken"]);
  });

  before(
    "Init: retrieve all deployed test tokens and handle token transfers and approvals",
    async () => {
      for (var i = 0; i < 10; i++) {
        test_tokens[i] = await artifacts.require("TestToken" + i).deployed();
      }

      loanToken1 = test_tokens[0];
      loanToken2 = test_tokens[1];
      collateralToken1 = test_tokens[2];
      collateralToken2 = test_tokens[3];
      interestToken1 = test_tokens[4];
      interestToken2 = test_tokens[5];
      maker0xV2Token1 = test_tokens[7];

      await loanToken1.transfer(lender1, utils.toWei(1000000, "ether"));
      await loanToken2.transfer(lender2, utils.toWei(1000000, "ether"));
      await loanToken1.approve(vault.address, MAX_UINT, { from: lender1 });
      await loanToken2.approve(vault.address, MAX_UINT, { from: lender2 });
      await collateralToken1.transfer(trader1, utils.toWei(1000000, "ether"));
      await collateralToken1.transfer(trader2, utils.toWei(1000000, "ether"));
      await collateralToken2.transfer(trader1, utils.toWei(1000000, "ether"));
      await collateralToken2.transfer(trader2, utils.toWei(1000000, "ether"));
      await collateralToken1.approve(vault.address, MAX_UINT, {from: trader1});
      await collateralToken1.approve(vault.address, MAX_UINT, {from: trader2});
      await collateralToken2.approve(vault.address, MAX_UINT, {from: trader1});
      await collateralToken2.approve(vault.address, MAX_UINT, {from: trader2});
      await interestToken1.transfer(trader1, utils.toWei(1000000, "ether"));
      await interestToken1.transfer(trader2, utils.toWei(1000000, "ether"));
      await interestToken2.transfer(trader1, utils.toWei(1000000, "ether"));
      await interestToken2.transfer(trader2, utils.toWei(1000000, "ether"));
      await interestToken1.approve(vault.address, MAX_UINT, { from: trader1 });
      await interestToken1.approve(vault.address, MAX_UINT, { from: trader2 });
      await interestToken2.approve(vault.address, MAX_UINT, { from: trader1 });
      await interestToken2.approve(vault.address, MAX_UINT, { from: trader2 });
      await maker0xV2Token1.transfer(maker1, utils.toWei(10000, "ether"));
      await maker0xV2Token1.transfer(maker2, utils.toWei(10000, "ether"));
      await maker0xV2Token1.approve(
        config["addresses"]["development"]["ZeroEx"]["ERC20Proxy"],
        MAX_UINT,
        { from: maker1 }
      );
      await maker0xV2Token1.approve(
        config["addresses"]["development"]["ZeroEx"]["ERC20Proxy"],
        MAX_UINT,
        { from: maker2 }
      );
      await zrx_token.transfer(trader1, utils.toWei(10000, "ether"));
      await zrx_token.transfer(trader2, utils.toWei(10000, "ether"));
      await zrx_token.approve(bZxTo0xV2.address, MAX_UINT, { from: trader1 });
      await zrx_token.approve(bZxTo0xV2.address, MAX_UINT, { from: trader2 });
      await zrx_token.transfer(maker1, utils.toWei(10000, "ether"));
      await zrx_token.transfer(maker2, utils.toWei(10000, "ether"));
      await zrx_token.approve(
        config["addresses"]["development"]["ZeroEx"]["TokenTransferProxy"],
        MAX_UINT,
        { from: maker1 }
      );
      await zrx_token.approve(
        config["addresses"]["development"]["ZeroEx"]["TokenTransferProxy"],
        MAX_UINT,
        { from: maker2 }
      );
      await zrx_token.approve(
        config["addresses"]["development"]["ZeroEx"]["ERC20Proxy"],
        MAX_UINT,
        { from: maker1 }
      );
      await zrx_token.approve(
        config["addresses"]["development"]["ZeroEx"]["ERC20Proxy"],
        MAX_UINT,
        { from: maker2 }
      );

      assert.isTrue((await loanToken1.balanceOf.call(lender1)).eq(utils.toWei(1000000, "ether")));
      assert.isTrue((await collateralToken1.balanceOf.call(trader1)).eq(utils.toWei(1000000, "ether")));
      assert.isTrue((await interestToken1.balanceOf.call(trader1)).eq(utils.toWei(1000000, "ether")));

      assert.isTrue((await loanToken1.allowance.call(lender1, vault.address)).eq(MAX_UINT));
      assert.isTrue((await collateralToken1.allowance.call(trader1, vault.address)).eq(MAX_UINT));
      assert.isTrue((await interestToken1.allowance.call(trader1, vault.address)).eq(MAX_UINT));
    }
  );

  before("watch events", function() {
    bZxEvents = bZx.allEvents({
      fromBlock: web3.eth.blockNumber,
      toBlock: "latest"
    });
    vaultEvents = vault.allEvents({
      fromBlock: web3.eth.blockNumber,
      toBlock: "latest"
    });
    oracleEvents = oracle.allEvents({
      fromBlock: web3.eth.blockNumber,
      toBlock: "latest"
    });
    bZxTo0xV2Events = bZxTo0xV2.allEvents({
      fromBlock: web3.eth.blockNumber,
      toBlock: "latest"
    });
    zeroExV2Events = exchange_0xV2.allEvents({
      fromBlock: web3.eth.blockNumber,
      toBlock: "latest"
    });
  });

  before("Init: orders", async () => {
    let block = await web3.eth.getBlock("latest");

    OrderParams_bZx_1 = {
      bZxAddress: bZx.address,
      makerAddress: lender1, // lender
      loanTokenAddress: loanToken1.address,
      interestTokenAddress: interestToken1.address,
      collateralTokenAddress: utils.zeroAddress,
      feeRecipientAddress: utils.zeroAddress,
      oracleAddress: oracle.address,
      loanTokenAmount: utils.toWei(100000, "ether"),
      interestAmount: utils.toWei(2, "ether"), // 2 token units per day
      initialMarginAmount: "50", // 50%
      maintenanceMarginAmount: "5", // 25%
      lenderRelayFee: utils.toWei(0.001, "ether").toString(),
      traderRelayFee: utils.toWei(0.0015, "ether").toString(),
      maxDurationUnixTimestampSec: "2419200", // 28 days
      expirationUnixTimestampSec: (block.timestamp + 86400).toString(),
      makerRole: "0", // 0=lender, 1=trader
      salt: generatePseudoRandomSalt().toString()
    };

    OrderParams_bZx_2 = {
      bZxAddress: bZx.address,
      makerAddress: trader2, // lender
      loanTokenAddress: loanToken2.address,
      interestTokenAddress: interestToken2.address,
      collateralTokenAddress: collateralToken2.address,
      feeRecipientAddress: utils.zeroAddress,
      oracleAddress: oracle.address,
      loanTokenAmount: utils.toWei(100000, "ether"),
      interestAmount: utils.toWei(2, "ether"), // 2 token units per day
      initialMarginAmount: "50", // 50%
      maintenanceMarginAmount: "25", // 25%
      lenderRelayFee: utils.toWei(0.001, "ether").toString(),
      traderRelayFee: utils.toWei(0.0015, "ether").toString(),
      maxDurationUnixTimestampSec: "2419200", // 28 days
      expirationUnixTimestampSec: (block.timestamp + 86400).toString(),
      makerRole: "1", // 0=lender, 1=trader
      salt: generatePseudoRandomSalt().toString()
    };
  });

  after(async function() {
    // var logs = [];
    // logs = logs.concat(await bZxEvents.get());
    // logs = logs.concat(await vaultEvents.get());
    // logs = logs.concat(await oracleEvents.get());
    // logs = logs.concat(await bZxTo0xV2Events.get());
    // logs = logs.concat(await zeroExV2Events.get());

    // bZxEvents.stopWatching();
    // vaultEvents.stopWatching();
    // oracleEvents.stopWatching();
    // bZxTo0xV2Events.stopWatching();
    // zeroExV2Events.stopWatching();
  });

  context("Off-chain loans", async () => {
    it("should generate loanOrderHash", async () => {
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
        "0x00" // oracleData
      );

      assert.notEqual(OrderHash_bZx_1, "");
    });

    it("should sign and verify orderHash (as lender1)", async () => {
      ECSignature_raw_1 = await web3.eth.sign(OrderHash_bZx_1, lender1);
      // add signature type to end
      ECSignature_raw_1 = ECSignature_raw_1 + toHex(SignatureType.EthSign);

      assert.isOk(await bZx.isValidSignature.call(lender1, OrderHash_bZx_1, ECSignature_raw_1));
    });

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
          new BN(OrderParams_bZx_1["maxDurationUnixTimestampSec"]),
          new BN(OrderParams_bZx_1["expirationUnixTimestampSec"]),
          new BN(OrderParams_bZx_1["makerRole"]),
          new BN(OrderParams_bZx_1["salt"])
        ],
        "0x00", // oracleData
        collateralToken1.address,
        utils.toWei(12.3, "ether"),
        ECSignature_raw_1,
        {
          from: trader1
        }
      );

      assert.equal(decodeOrders(await bZx.getOrdersForUser.call(lender1, 0, 10)).length, 1);
    });

    it("should generate loanOrderHash (as trader2)", async () => {
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
          new BN(OrderParams_bZx_2["maxDurationUnixTimestampSec"]),
          new BN(OrderParams_bZx_2["expirationUnixTimestampSec"]),
          new BN(OrderParams_bZx_2["makerRole"]),
          new BN(OrderParams_bZx_2["salt"])
        ],
        "0x00" // oracleData
      );
    });

    it("should sign and verify orderHash (as trader2)", async () => {
      ECSignature_raw_2 = await web3.eth.sign(OrderHash_bZx_2, trader2);
      // add signature type to end
      ECSignature_raw_2 = ECSignature_raw_2 + toHex(SignatureType.EthSign);
      assert.isOk(await bZx.isValidSignature.call(trader2, OrderHash_bZx_2, ECSignature_raw_2));
    });

    it("should take sample loan order (as lender2)", async () => {
      let ordersLender2Count = decodeOrders(await bZx.getOrdersForUser.call(lender2, 0, 10)).length;
      let ordersTrader2Count = decodeOrders(await bZx.getOrdersForUser.call(trader2, 0, 10)).length;

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
          new BN(OrderParams_bZx_2["maxDurationUnixTimestampSec"]),
          new BN(OrderParams_bZx_2["expirationUnixTimestampSec"]),
          new BN(OrderParams_bZx_2["makerRole"]),
          new BN(OrderParams_bZx_2["salt"])
        ],
        "0x00", // oracleData
        ECSignature_raw_2,
        {
          from: lender2
        }
      );

      assert.equal(
        decodeOrders(await bZx.getOrdersForUser.call(lender2, 0, 10)).length,
        ordersLender2Count + 1
      );

      assert.equal(
        decodeOrders(await bZx.getOrdersForUser.call(trader2, 0, 10)).length,
        ordersTrader2Count + 1
      );

      var data = await bZx.getSingleOrder.call(OrderHash_bZx_2);

      let orders = decodeOrders(data);
      assert.equal(orders.length, 1);
    
      ensureOrder(orders[0], OrderParams_bZx_2, OrderHash_bZx_2);
    });

    it("should get fillable orders", async () => {
      let data = await bZx.getOrdersFillable.call(0, 10);
      let orders = decodeOrders(data);
      // console.log("Fillable orders:", orders);
    });

    it("should get single loan position", async () => {
      let data = await bZx.getSingleLoan.call(OrderHash_bZx_1, trader1);
      let loanPositions = decodeLoanPosition(data);
      // console.log(loanPositions);
    });

    it("should get loan positions (for lender1)", async () => {
      let data = await bZx.getLoansForLender.call(lender1, 10, true);
      let loanPositions = decodeLoanPosition(data);
      // console.log(loanPositions);
    });

    it("should get loan positions (for trader1)", async () => {
      let data = await bZx.getLoansForTrader.call(trader1, 10, false);
      let loanPositions = decodeLoanPosition(data);
      // console.log(loanPositions);
    });

    it("should get loan positions (for trader2)", async () => {
      var data = await bZx.getLoansForTrader.call(trader2, 10, true);
      let loanPositions = decodeLoanPosition(data);
      // console.log(loanPositions);
    });

    it("should get active loans", async () => {
      var data = await bZx.getActiveLoans.call(
        0, // starting item
        10 // max number of items returned
      );

      data = data.substr(2); // remove 0x from front
      const itemCount = 3;
      const objCount = data.length / 64 / itemCount;
      var loans = [];

      if (objCount % 1 != 0) {
        // must be a whole number
        console.error("error: data length invalid!");
        assert.isOk(false);
      } else {
        var loansObjArray = data.match(
          new RegExp(".{1," + itemCount * 64 + "}", "g")
        );
        for (var i = 0; i < loansObjArray.length; i++) {
          var params = loansObjArray[i].match(
            new RegExp(".{1," + 64 + "}", "g")
          );
          if (parseInt("0x" + params[0].substr(24)) == 0) {
            continue;
          }
          loans.push({
            loanOrderHash: "0x" + params[0],
            trader: "0x" + params[1].substr(24),
            expirationUnixTimestampSec: parseInt("0x" + params[2])
          });
        }

        assert.isOk(true);
      }
    });
  });

  context("On-chain loans", async () => {
    let orderAsTrader;
    let orderAsLender;

    let hashOrderAsTrader;
    let hashOrderAsLender;

    before("before", async () => {
      await reverter.snapshot();
    });

    before("Init: orders", async () => {
      let block = await web3.eth.getBlock("latest");

      orderAsTrader = {
        bZxAddress: bZx.address,
        makerAddress: lender1, // lender
        loanTokenAddress: loanToken1.address,
        interestTokenAddress: interestToken1.address,
        collateralTokenAddress: utils.zeroAddress,
        feeRecipientAddress: utils.zeroAddress,
        oracleAddress: oracle.address,
        loanTokenAmount: utils.toWei(100000, "ether"),
        interestAmount: utils.toWei(2, "ether"), // 2 token units per day
        initialMarginAmount: "50", // 50%
        maintenanceMarginAmount: "5", // 25%
        lenderRelayFee: utils.toWei(0.001, "ether").toString(),
        traderRelayFee: utils.toWei(0.0015, "ether").toString(),
        maxDurationUnixTimestampSec: "2419200", // 28 days
        expirationUnixTimestampSec: (block.timestamp + 86400).toString(),
        makerRole: "0", // 0=lender, 1=trader
        salt: generatePseudoRandomSalt().toString()
      };

      orderAsLender = {
        bZxAddress: bZx.address,
        makerAddress: trader2, // lender
        loanTokenAddress: loanToken2.address,
        interestTokenAddress: interestToken2.address,
        collateralTokenAddress: collateralToken2.address,
        feeRecipientAddress: utils.zeroAddress,
        oracleAddress: oracle.address,
        loanTokenAmount: utils.toWei(100000, "ether"),
        interestAmount: utils.toWei(2, "ether"), // 2 token units per day
        initialMarginAmount: "50", // 50%
        maintenanceMarginAmount: "25", // 25%
        lenderRelayFee: utils.toWei(0.001, "ether").toString(),
        traderRelayFee: utils.toWei(0.0015, "ether").toString(),
        maxDurationUnixTimestampSec: "2419200", // 28 days
        expirationUnixTimestampSec: (block.timestamp + 86400).toString(),
        makerRole: "1", // 0=lender, 1=trader
        salt: generatePseudoRandomSalt().toString()
      };
    });

    it("should push sample loan order on chain (as maker2)", async () => {
      let hash = await bZx.getLoanOrderHash.call(
        [
          orderAsTrader["makerAddress"],
          orderAsTrader["loanTokenAddress"],
          orderAsTrader["interestTokenAddress"],
          orderAsTrader["collateralTokenAddress"],
          orderAsTrader["feeRecipientAddress"],
          orderAsTrader["oracleAddress"]
        ],
        [
          new BN(orderAsTrader["loanTokenAmount"]),
          new BN(orderAsTrader["interestAmount"]),
          new BN(orderAsTrader["initialMarginAmount"]),
          new BN(orderAsTrader["maintenanceMarginAmount"]),
          new BN(orderAsTrader["lenderRelayFee"]),
          new BN(orderAsTrader["traderRelayFee"]),
          new BN(orderAsTrader["maxDurationUnixTimestampSec"]),
          new BN(orderAsTrader["expirationUnixTimestampSec"]),
          new BN(orderAsTrader["makerRole"]),
          new BN(orderAsTrader["salt"])
        ],
        "0x00" // oracleData
      );

      let signature = await sign(lender1, hash);
      assert.isTrue(await bZx.isValidSignature.call(lender1, hash, signature));

      await bZx.pushLoanOrderOnChain(
        [
          orderAsTrader["makerAddress"],
          orderAsTrader["loanTokenAddress"],
          orderAsTrader["interestTokenAddress"],
          orderAsTrader["collateralTokenAddress"],
          orderAsTrader["feeRecipientAddress"],
          orderAsTrader["oracleAddress"]
        ],
        [
          new BN(orderAsTrader["loanTokenAmount"]),
          new BN(orderAsTrader["interestAmount"]),
          new BN(orderAsTrader["initialMarginAmount"]),
          new BN(orderAsTrader["maintenanceMarginAmount"]),
          new BN(orderAsTrader["lenderRelayFee"]),
          new BN(orderAsTrader["traderRelayFee"]),
          new BN(orderAsTrader["maxDurationUnixTimestampSec"]),
          new BN(orderAsTrader["expirationUnixTimestampSec"]),
          new BN(orderAsTrader["makerRole"]),
          new BN(orderAsTrader["salt"])
        ],
        "0x00", // oracleData
        signature,
        { from: maker2 }
      );

      let orders = decodeOrders(await bZx.getSingleOrder.call(hash));
      assert.equal(orders.length, 1);
      ensureOrder(orders[0], orderAsTrader, hash);

      hashOrderAsTrader = hash;
    });

    it("should take sample loan order (as trader2) on chain", async () => {
      await bZx.takeLoanOrderOnChainAsTrader(
        hashOrderAsTrader,
        collateralToken1.address,
        utils.toWei(20, "ether"),
        {
          from: trader2
        }
      );

      //assert.equal(decodeOrders(await bZx.getOrdersForUser.call(trader2, 0, 10)).length, 1);
    });

    it("should push sample loan order on chain (as maker1)", async () => {
      let hash = await bZx.getLoanOrderHash.call(
        [
          orderAsLender["makerAddress"],
          orderAsLender["loanTokenAddress"],
          orderAsLender["interestTokenAddress"],
          orderAsLender["collateralTokenAddress"],
          orderAsLender["feeRecipientAddress"],
          orderAsLender["oracleAddress"]
        ],
        [
          new BN(orderAsLender["loanTokenAmount"]),
          new BN(orderAsLender["interestAmount"]),
          new BN(orderAsLender["initialMarginAmount"]),
          new BN(orderAsLender["maintenanceMarginAmount"]),
          new BN(orderAsLender["lenderRelayFee"]),
          new BN(orderAsLender["traderRelayFee"]),
          new BN(orderAsLender["maxDurationUnixTimestampSec"]),
          new BN(orderAsLender["expirationUnixTimestampSec"]),
          new BN(orderAsLender["makerRole"]),
          new BN(orderAsLender["salt"])
        ],
        "0x00" // oracleData
      );

      let signature = await sign(trader2, hash);

      await bZx.pushLoanOrderOnChain(
        [
          orderAsLender["makerAddress"],
          orderAsLender["loanTokenAddress"],
          orderAsLender["interestTokenAddress"],
          orderAsLender["collateralTokenAddress"],
          orderAsLender["feeRecipientAddress"],
          orderAsLender["oracleAddress"]
        ],
        [
          new BN(orderAsLender["loanTokenAmount"]),
          new BN(orderAsLender["interestAmount"]),
          new BN(orderAsLender["initialMarginAmount"]),
          new BN(orderAsLender["maintenanceMarginAmount"]),
          new BN(orderAsLender["lenderRelayFee"]),
          new BN(orderAsLender["traderRelayFee"]),
          new BN(orderAsLender["maxDurationUnixTimestampSec"]),
          new BN(orderAsLender["expirationUnixTimestampSec"]),
          new BN(orderAsLender["makerRole"]),
          new BN(orderAsLender["salt"])
        ],
        "0x00", // oracleData
        signature,
        { from: maker1 }
      );

      let orders = decodeOrders(await bZx.getSingleOrder.call(hash));
      assert.equal(orders.length, 1);
      ensureOrder(orders[0], orderAsLender, hash);

      hashOrderAsLender = hash;
    });

    it("should take sample loan order (as lender2) on chain", async () => {
      await bZx.takeLoanOrderOnChainAsLender(hashOrderAsLender, {
        from: lender2
      });
    });

    after("Clean up", async () => {
      await reverter.revert();
    });
  });


  context("On-chain loans (with Presign)", async () => {
    let orderAsTrader;
    let orderAsLender;

    let hashOrderAsTrader;
    let hashOrderAsLender;

    before("before", async () => {
      await reverter.snapshot();
    });

    before("Init: orders", async () => {
      let block = await web3.eth.getBlock("latest");

      orderAsTrader = {
        bZxAddress: bZx.address,
        makerAddress: lender1, // lender
        loanTokenAddress: loanToken1.address,
        interestTokenAddress: interestToken1.address,
        collateralTokenAddress: utils.zeroAddress,
        feeRecipientAddress: utils.zeroAddress,
        oracleAddress: oracle.address,
        loanTokenAmount: utils.toWei(100000, "ether"),
        interestAmount: utils.toWei(2, "ether"), // 2 token units per day
        initialMarginAmount: "50", // 50%
        maintenanceMarginAmount: "5", // 25%
        lenderRelayFee: utils.toWei(0.001, "ether").toString(),
        traderRelayFee: utils.toWei(0.0015, "ether").toString(),
        maxDurationUnixTimestampSec: "2419200", // 28 days
        expirationUnixTimestampSec: (block.timestamp + 86400).toString(),
        makerRole: "0", // 0=lender, 1=trader
        salt: generatePseudoRandomSalt().toString()
      };

      orderAsLender = {
        bZxAddress: bZx.address,
        makerAddress: trader2, // lender
        loanTokenAddress: loanToken2.address,
        interestTokenAddress: interestToken2.address,
        collateralTokenAddress: collateralToken2.address,
        feeRecipientAddress: utils.zeroAddress,
        oracleAddress: oracle.address,
        loanTokenAmount: utils.toWei(100000, "ether"),
        interestAmount: utils.toWei(2, "ether"), // 2 token units per day
        initialMarginAmount: "50", // 50%
        maintenanceMarginAmount: "25", // 25%
        lenderRelayFee: utils.toWei(0.001, "ether").toString(),
        traderRelayFee: utils.toWei(0.0015, "ether").toString(),
        maxDurationUnixTimestampSec: "2419200", // 28 days
        expirationUnixTimestampSec: (block.timestamp + 86400).toString(),
        makerRole: "1", // 0=lender, 1=trader
        salt: generatePseudoRandomSalt().toString()
      };
    });

    it("should push sample loan order on chain (as maker2 - Presign with order params)", async () => {
      let hash = await bZx.getLoanOrderHash.call(
        [
          orderAsTrader["makerAddress"],
          orderAsTrader["loanTokenAddress"],
          orderAsTrader["interestTokenAddress"],
          orderAsTrader["collateralTokenAddress"],
          orderAsTrader["feeRecipientAddress"],
          orderAsTrader["oracleAddress"]
        ],
        [
          new BN(orderAsTrader["loanTokenAmount"]),
          new BN(orderAsTrader["interestAmount"]),
          new BN(orderAsTrader["initialMarginAmount"]),
          new BN(orderAsTrader["maintenanceMarginAmount"]),
          new BN(orderAsTrader["lenderRelayFee"]),
          new BN(orderAsTrader["traderRelayFee"]),
          new BN(orderAsTrader["maxDurationUnixTimestampSec"]),
          new BN(orderAsTrader["expirationUnixTimestampSec"]),
          new BN(orderAsTrader["makerRole"]),
          new BN(orderAsTrader["salt"])
        ],
        "0x00" // oracleData
      );

      let signature = "0x"+"00".repeat(65)+"06"; // SignatureType == PreSigned (null-padded to 66 bytes)

      try {
        await bZx.preSign(
          orderAsTrader["makerAddress"],
          [
            orderAsTrader["makerAddress"],
            orderAsTrader["loanTokenAddress"],
            orderAsTrader["interestTokenAddress"],
            orderAsTrader["collateralTokenAddress"],
            orderAsTrader["feeRecipientAddress"],
            orderAsTrader["oracleAddress"]
          ],
          [
            new BN(orderAsTrader["loanTokenAmount"]),
            new BN(orderAsTrader["interestAmount"]),
            new BN(orderAsTrader["initialMarginAmount"]),
            new BN(orderAsTrader["maintenanceMarginAmount"]),
            new BN(orderAsTrader["lenderRelayFee"]),
            new BN(orderAsTrader["traderRelayFee"]),
            new BN(orderAsTrader["maxDurationUnixTimestampSec"]),
            new BN(orderAsTrader["expirationUnixTimestampSec"]),
            new BN(orderAsTrader["makerRole"]),
            new BN(orderAsTrader["salt"])
          ],
          "0x00", // oracleData
          signature,
          { from: maker2 }
        );
        assert.isTrue(false);
      } catch (e) {
        utils.ensureException(e);
      }

      await bZx.preSign(
        orderAsTrader["makerAddress"],
        [
          orderAsTrader["makerAddress"],
          orderAsTrader["loanTokenAddress"],
          orderAsTrader["interestTokenAddress"],
          orderAsTrader["collateralTokenAddress"],
          orderAsTrader["feeRecipientAddress"],
          orderAsTrader["oracleAddress"]
        ],
        [
          new BN(orderAsTrader["loanTokenAmount"]),
          new BN(orderAsTrader["interestAmount"]),
          new BN(orderAsTrader["initialMarginAmount"]),
          new BN(orderAsTrader["maintenanceMarginAmount"]),
          new BN(orderAsTrader["lenderRelayFee"]),
          new BN(orderAsTrader["traderRelayFee"]),
          new BN(orderAsTrader["maxDurationUnixTimestampSec"]),
          new BN(orderAsTrader["expirationUnixTimestampSec"]),
          new BN(orderAsTrader["makerRole"]),
          new BN(orderAsTrader["salt"])
        ],
        "0x00", // oracleData
        signature,
        { from: orderAsTrader["makerAddress"] }
      );

      await bZx.pushLoanOrderOnChain(
        [
          orderAsTrader["makerAddress"],
          orderAsTrader["loanTokenAddress"],
          orderAsTrader["interestTokenAddress"],
          orderAsTrader["collateralTokenAddress"],
          orderAsTrader["feeRecipientAddress"],
          orderAsTrader["oracleAddress"]
        ],
        [
          new BN(orderAsTrader["loanTokenAmount"]),
          new BN(orderAsTrader["interestAmount"]),
          new BN(orderAsTrader["initialMarginAmount"]),
          new BN(orderAsTrader["maintenanceMarginAmount"]),
          new BN(orderAsTrader["lenderRelayFee"]),
          new BN(orderAsTrader["traderRelayFee"]),
          new BN(orderAsTrader["maxDurationUnixTimestampSec"]),
          new BN(orderAsTrader["expirationUnixTimestampSec"]),
          new BN(orderAsTrader["makerRole"]),
          new BN(orderAsTrader["salt"])
        ],
        "0x00", // oracleData
        signature,
        { from: maker2 }
      );

      let orders = decodeOrders(await bZx.getSingleOrder.call(hash));
      assert.equal(orders.length, 1);
      ensureOrder(orders[0], orderAsTrader, hash);

      hashOrderAsTrader = hash;
    });

    it("should take sample loan order (as trader2) on chain", async () => {
      await bZx.takeLoanOrderOnChainAsTrader(
        hashOrderAsTrader,
        collateralToken1.address,
        utils.toWei(20, "ether"),
        {
          from: trader2
        }
      );

      //assert.equal(decodeOrders(await bZx.getOrdersForUser.call(trader2, 0, 10)).length, 1);
    });

    it("should push sample loan order on chain (as maker1 - Presign with hash)", async () => {
      let hash = await bZx.getLoanOrderHash.call(
        [
          orderAsLender["makerAddress"],
          orderAsLender["loanTokenAddress"],
          orderAsLender["interestTokenAddress"],
          orderAsLender["collateralTokenAddress"],
          orderAsLender["feeRecipientAddress"],
          orderAsLender["oracleAddress"]
        ],
        [
          new BN(orderAsLender["loanTokenAmount"]),
          new BN(orderAsLender["interestAmount"]),
          new BN(orderAsLender["initialMarginAmount"]),
          new BN(orderAsLender["maintenanceMarginAmount"]),
          new BN(orderAsLender["lenderRelayFee"]),
          new BN(orderAsLender["traderRelayFee"]),
          new BN(orderAsLender["maxDurationUnixTimestampSec"]),
          new BN(orderAsLender["expirationUnixTimestampSec"]),
          new BN(orderAsLender["makerRole"]),
          new BN(orderAsLender["salt"])
        ],
        "0x00" // oracleData
      );

      let signature = "0x"+"00".repeat(65)+"06"; // SignatureType == PreSigned (null-padded to 66 bytes)

      try {
        await bZx.preSignWithHash(
          orderAsLender["makerAddress"],
          hash,
          signature,
          { from: maker1 }
        );
      } catch (e) {
        utils.ensureException(e);
      }

      await bZx.preSignWithHash(
        orderAsLender["makerAddress"],
        hash,
        signature,
        { from: orderAsLender["makerAddress"] }
      );

      await bZx.pushLoanOrderOnChain(
        [
          orderAsLender["makerAddress"],
          orderAsLender["loanTokenAddress"],
          orderAsLender["interestTokenAddress"],
          orderAsLender["collateralTokenAddress"],
          orderAsLender["feeRecipientAddress"],
          orderAsLender["oracleAddress"]
        ],
        [
          new BN(orderAsLender["loanTokenAmount"]),
          new BN(orderAsLender["interestAmount"]),
          new BN(orderAsLender["initialMarginAmount"]),
          new BN(orderAsLender["maintenanceMarginAmount"]),
          new BN(orderAsLender["lenderRelayFee"]),
          new BN(orderAsLender["traderRelayFee"]),
          new BN(orderAsLender["maxDurationUnixTimestampSec"]),
          new BN(orderAsLender["expirationUnixTimestampSec"]),
          new BN(orderAsLender["makerRole"]),
          new BN(orderAsLender["salt"])
        ],
        "0x00", // oracleData
        signature,
        { from: maker1 }
      );

      let orders = decodeOrders(await bZx.getSingleOrder.call(hash));
      assert.equal(orders.length, 1);
      ensureOrder(orders[0], orderAsLender, hash);

      hashOrderAsLender = hash;
    });

    it("should take sample loan order (as lender2) on chain", async () => {
      await bZx.takeLoanOrderOnChainAsLender(hashOrderAsLender, {
        from: lender2
      });
    });

    after("Clean up", async () => {
      await reverter.revert();
    });
  });

  context("0x V2 trading", async () => {
    it("should generate 0x V2 orders", async () => {
      OrderParams_0xV2_1 = {
        exchangeAddress:config["addresses"]["development"]["ZeroEx"]["ExchangeV2"],
        makerAddress: maker1,
        takerAddress: utils.zeroAddress,
        feeRecipientAddress: owner,
        senderAddress: utils.zeroAddress,
        makerAssetAmount: utils.toWei(3, "ether").toString(),
        takerAssetAmount: utils.toWei(1.2, "ether").toString(),
        makerFee: utils.toWei(0.0005, "ether").toString(),
        takerFee: utils.toWei(0.01, "ether").toString(),
        expirationTimeSeconds: ((await web3.eth.getBlock("latest")).timestamp + 86400).toString(),
        salt: generatePseudoRandomSalt().toString(),
        makerAssetData: assetDataUtils.encodeERC20AssetData(maker0xV2Token1.address),
        takerAssetData: assetDataUtils.encodeERC20AssetData(loanToken1.address)
      };

      OrderParams_0xV2_2 = {
        exchangeAddress:config["addresses"]["development"]["ZeroEx"]["ExchangeV2"],
        makerAddress: maker2,
        takerAddress: utils.zeroAddress,
        feeRecipientAddress: owner,
        senderAddress: utils.zeroAddress,
        makerAssetAmount: utils.toWei(120, "ether").toString(),
        takerAssetAmount: utils.toWei(72, "ether").toString(),
        makerFee: "0",
        takerFee: utils.toWei(0.0025, "ether").toString(),
        expirationTimeSeconds: ((await web3.eth.getBlock("latest")).timestamp + 86400).toString(),
        salt: generatePseudoRandomSalt().toString(),
        makerAssetData: assetDataUtils.encodeERC20AssetData(maker0xV2Token1.address),
        takerAssetData: assetDataUtils.encodeERC20AssetData(loanToken1.address)
      };

      OrderHash_0xV2_1 = orderHashUtils.getOrderHashHex(OrderParams_0xV2_1);
      OrderHash_0xV2_2 = orderHashUtils.getOrderHashHex(OrderParams_0xV2_2);

      assert.isOk(orderHashUtils.isValidOrderHash(OrderHash_0xV2_1) 
          && orderHashUtils.isValidOrderHash(OrderHash_0xV2_2));

      OrderParams_0xV2_1_prepped = [
        OrderParams_0xV2_1["makerAddress"],
        OrderParams_0xV2_1["takerAddress"],
        OrderParams_0xV2_1["feeRecipientAddress"],
        OrderParams_0xV2_1["senderAddress"],
        "0x" +
          Web3Utils.padLeft(new BN(OrderParams_0xV2_1["makerAssetAmount"]), 64),
        "0x" +
          Web3Utils.padLeft(new BN(OrderParams_0xV2_1["takerAssetAmount"]), 64),
        "0x" + Web3Utils.padLeft(new BN(OrderParams_0xV2_1["makerFee"]), 64),
        "0x" + Web3Utils.padLeft(new BN(OrderParams_0xV2_1["takerFee"]), 64),
        "0x" +
          Web3Utils.padLeft(
            new BN(OrderParams_0xV2_1["expirationTimeSeconds"]),
            64
          ),
        "0x" + Web3Utils.padLeft(new BN(OrderParams_0xV2_1["salt"]), 64),
        OrderParams_0xV2_1["makerAssetData"],
        OrderParams_0xV2_1["takerAssetData"]
      ];

      OrderParams_0xV2_2_prepped = [
        OrderParams_0xV2_2["makerAddress"],
        OrderParams_0xV2_2["takerAddress"],
        OrderParams_0xV2_2["feeRecipientAddress"],
        OrderParams_0xV2_2["senderAddress"],
        "0x" +
          Web3Utils.padLeft(new BN(OrderParams_0xV2_2["makerAssetAmount"]), 64),
        "0x" +
          Web3Utils.padLeft(new BN(OrderParams_0xV2_2["takerAssetAmount"]), 64),
        "0x" + Web3Utils.padLeft(new BN(OrderParams_0xV2_2["makerFee"]), 64),
        "0x" + Web3Utils.padLeft(new BN(OrderParams_0xV2_2["takerFee"]), 64),
        "0x" +
          Web3Utils.padLeft(
            new BN(OrderParams_0xV2_2["expirationTimeSeconds"]),
            64
          ),
        "0x" + Web3Utils.padLeft(new BN(OrderParams_0xV2_2["salt"]), 64),
        OrderParams_0xV2_2["makerAssetData"],
        OrderParams_0xV2_2["takerAssetData"]
      ];

      // using ethers.js for ABI v2 encoding
      const provider = await new ethers.providers.Web3Provider(web3.currentProvider);
      const signer = await provider.getSigner(trader1);
      const helper = await new ethers.Contract(
        zeroExV2Helper.address,
        zeroExV2Helper.abi,
        signer
      );

      OrderHash_0xV2_1_onchain = await helper.getOrderHash(
        OrderParams_0xV2_1_prepped
      );

      OrderHash_0xV2_2_onchain = await helper.getOrderHash(
        OrderParams_0xV2_2_prepped
      );

      assert.isOk(true);
    });

    it("should sign and verify 0x V2 orders", async () => {
      ECSignature_0xV2_raw_1 = await signatureUtils.ecSignOrderHashAsync(
        web3.currentProvider,
        OrderHash_0xV2_1_onchain,
        OrderParams_0xV2_1["makerAddress"],
        "DEFAULT"
      );

      assert.isTrue(
        await exchange_0xV2.isValidSignature.call(
          OrderHash_0xV2_1_onchain,
          OrderParams_0xV2_1["makerAddress"],
          ECSignature_0xV2_raw_1
        )
      );

      ECSignature_0xV2_raw_2 = await signatureUtils.ecSignOrderHashAsync(
        web3.currentProvider,
        OrderHash_0xV2_2_onchain,
        OrderParams_0xV2_2["makerAddress"],
        "DEFAULT"
      );

      assert.isTrue(
        await exchange_0xV2.isValidSignature.call(
          OrderHash_0xV2_2_onchain,
          OrderParams_0xV2_2["makerAddress"],
          ECSignature_0xV2_raw_2
        )
      );
    });

    it("should trade position with 0x V2 orders", async () => {
      // using ethers.js for ABI v2 encoding
      var iface = new ethers.utils.Interface(BZx.abi);      
      var tradePositionWith0xV2 = await iface.functions.tradePositionWith0xV2.encode(
        [OrderHash_bZx_1,
        [OrderParams_0xV2_1_prepped, OrderParams_0xV2_2_prepped],
        [ECSignature_0xV2_raw_1, ECSignature_0xV2_raw_2]]
      );

      await web3.eth.sendTransaction(
        { 
          data: tradePositionWith0xV2, 
          from: trader1, 
          to: bZx.address,
          gas: 6721975,
          gasPrice: 20000000000
        });
    });

    it("should trade position with oracle", async () => {
      await bZx.tradePositionWithOracle(
        OrderHash_bZx_1,
        interestToken2.address,
        { from: trader1 }
      );
    });
  });

  context("Profits and Interests", async () => {
    it("should withdraw profits (for trader1)", async () => {
      let initialProfit = await bZx.getProfitOrLoss.call(OrderHash_bZx_1, trader1);

      assert.isTrue(initialProfit[0]);
      let positionToken = await ERC20.at(initialProfit[2]);
      let traderInitialBalance = await positionToken.balanceOf.call(trader1);
      let vaultInitialBalance = await positionToken.balanceOf.call(vault.address);

      try {
        await bZx.withdrawProfit(OrderHash_bZx_1, { from: stranger });
        assert.isTrue(false);
      } catch (e) {
        utils.ensureException(e);
      }

      await bZx.withdrawProfit(OrderHash_bZx_1, { from: trader1 });

      let finalProfit = await bZx.getProfitOrLoss.call(
        OrderHash_bZx_1,
        trader1
      );
      assert.isFalse(finalProfit[0]);

      let traderFinalBalance = await positionToken.balanceOf.call(
        trader1
      );
      let vaultFinalBalance = await positionToken.balanceOf.call(
        vault.address
      );

      assert.isTrue(
        traderFinalBalance.eq(traderInitialBalance.add(initialProfit[1]))
      );
      assert.isTrue(
        vaultFinalBalance.eq(vaultInitialBalance.sub(initialProfit[1]))
      );
    });

    it("should pay lender interest (for trader1)", async () => {
      let interest = await bZx.getInterest.call(OrderHash_bZx_1, trader1);

      let amount2pay = await bZx.payInterest.call(OrderHash_bZx_1, trader1, {from: trader1});

      let vaultInitialBalance = await interestToken1.balanceOf.call(vault.address);
      let oracleInitialBalance = await interestToken1.balanceOf.call(oracle.address);
      let lenderInitialBalance = await interestToken1.balanceOf.call(lender1);

      let tx = await bZx.payInterest(OrderHash_bZx_1, trader1, {from: trader1});

      let payInterestEvent = eventsHelper.extractEvents(tx, "LogPayInterestForPosition")[0];
      let amountPaid = payInterestEvent.args.amountPaid;

      assert.isTrue(amountPaid.gte(amount2pay));

      let vaultBalance = await interestToken1.balanceOf.call(vault.address);
      let oracleBalance = await interestToken1.balanceOf.call(oracle.address);
      let lenderBalance = await interestToken1.balanceOf.call(lender1);

      let receivedTokens = lenderBalance.sub(lenderInitialBalance).add(oracleBalance.sub(oracleInitialBalance));

      let sendTokens = vaultInitialBalance.sub(vaultBalance);

      assert.isTrue(amountPaid.gte(receivedTokens));
      assert.isTrue(amountPaid.gte(sendTokens));
      assert.isTrue(amountPaid.gte(interest[2]));

      assert.equal(interestToken1.address, interest[1]);
    });
  });

  context("Collateral", async () => {
    before("before", async () => {
      await reverter.snapshot();
    });

    it("shouldn't allow to change collateral (for stranger)", async () => {
      try {
        await bZx.changeCollateral(OrderHash_bZx_1, interestToken1.address, {
          from: stranger
        });
        assert.isTrue(false);
      } catch (e) {
        utils.ensureException(e);
      }
    });

    it("should change collateral with not exists loan order (for trader1)", async () => {
      try {
        await bZx.changeCollateral(
          web3.utils.asciiToHex("some not exists loan order hash"),
          interestToken1.address,
          { from: trader1 }
        );
        assert.isTrue(false);
      } catch (e) {
        utils.ensureException(e);
      }
    });

    it("should change collateral (for trader1)", async () => {
      const positionId = await bZx.loanPositionsIds.call(OrderHash_bZx_1, trader1);
      assert.equal(
        (await bZx.loanPositions.call(positionId))[1],
        collateralToken1.address
      );

      let initialBalance1Trader = await collateralToken1.balanceOf.call(
        trader1
      );
      let initialBalance1Vault = await collateralToken1.balanceOf.call(
        vault.address
      );

      let initialBalance2Trader = await interestToken1.balanceOf.call(trader1);
      let initialBalance2Vault = await interestToken1.balanceOf.call(
        vault.address
      );

      await bZx.changeCollateral(OrderHash_bZx_1, interestToken1.address, {
        from: trader1
      });

      let finalBalance1Trader = await collateralToken1.balanceOf.call(trader1);
      let finalBalance1Vault = await collateralToken1.balanceOf.call(
        vault.address
      );

      let finalBalance2Trader = await interestToken1.balanceOf.call(trader1);
      let finalBalance2Vault = await interestToken1.balanceOf.call(
        vault.address
      );

      assert.isTrue(
        finalBalance1Trader
          .sub(initialBalance1Trader)
          .eq(initialBalance1Vault.sub(finalBalance1Vault))
      );
      assert.isTrue(
        finalBalance2Vault
          .sub(initialBalance2Vault)
          .eq(initialBalance2Trader.sub(finalBalance2Trader))
      );

      assert.equal(
        (await bZx.loanPositions.call(positionId))[1],
        interestToken1.address
      );
    });

    it("should crash if collateral is the same (for trader1)", async () => {
      const positionId = await bZx.loanPositionsIds.call(OrderHash_bZx_1, trader1);
      assert.equal(
        (await bZx.loanPositions.call(positionId))[1],
        interestToken1.address
      );

      try {
        await bZx.changeCollateral(OrderHash_bZx_1, interestToken1.address, {
          from: trader1
        });
        assert.isTrue(false);
      } catch (e) {
        utils.ensureException(e);
      }
    });

    it("should increase collateral (for trader1)", async () => {
      const VALUE = 100;
      const positionId = await bZx.loanPositionsIds.call(OrderHash_bZx_1, trader1);
      assert.equal(
        (await bZx.loanPositions.call(positionId))[1],
        interestToken1.address
      );

      await bZx.depositCollateral(
        OrderHash_bZx_1,
        interestToken1.address,
        VALUE,
        { from: trader1 }
      );
    });

    it("should withdraw excess collateral (for trader1)", async () => {
      const VALUE = 100;
      const positionId = await bZx.loanPositionsIds.call(OrderHash_bZx_1, trader1);
      assert.equal(
        (await bZx.loanPositions.call(positionId))[1],
        interestToken1.address
      );

      await bZx.withdrawExcessCollateral(
        OrderHash_bZx_1,
        interestToken1.address,
        VALUE,
        { from: trader1 }
      );
    });

    after(async () => {
      await reverter.revert();
    });
  });

  context("Loan finalization", async () => {
    before("before", async () => {
      await reverter.snapshot();
    });

    it("should close loan as (lender1/trader1)", async () => {
      let loans = decodeLoanPosition(
        await bZx.getSingleLoan.call(OrderHash_bZx_1, trader1)
      );
      assert.equal(loans.length, 1);
      assert.isTrue(loans[0].active);

      await bZx.closeLoan(OrderHash_bZx_1, { from: trader1 });

      loans = decodeLoanPosition(
        await bZx.getSingleLoan.call(OrderHash_bZx_1, trader1)
      );
      assert.equal(loans.length, 1);
      assert.isFalse(loans[0].active);

      await reverter.revert();
    });

    it("should liquidate position", async () => {
      let loans = decodeLoanPosition(
        await bZx.getSingleLoan.call(OrderHash_bZx_1, trader1)
      );
      assert.equal(loans.length, 1);
      assert.isTrue(loans[0].active);

      await bZx.liquidatePosition(OrderHash_bZx_1, trader1, { from: maker1 });
      //let txn = await bZx.liquidatePosition(OrderHash_bZx_1, trader1, { from: maker1 });
      //console.log(txPrettyPrint(txn, "should liquidate position"));

      loans = decodeLoanPosition(
        await bZx.getSingleLoan.call(OrderHash_bZx_1, trader1)
      );
      assert.equal(loans.length, 1);
      assert.isFalse(loans[0].active);

      await reverter.revert();
    });

    it("should force close loan", async () => {
      let loans = decodeLoanPosition(
        await bZx.getSingleLoan.call(OrderHash_bZx_1, trader1)
      );
      assert.equal(loans.length, 1);
      assert.isTrue(loans[0].active);

      await bZx.forceCloanLoan(OrderHash_bZx_1, trader1, { from: owner });

      loans = decodeLoanPosition(
        await bZx.getSingleLoan.call(OrderHash_bZx_1, trader1)
      );
      assert.equal(loans.length, 1);
      assert.isFalse(loans[0].active);

      await reverter.revert();
    });

    after(async () => {
      await reverter.revert();
    });
  });

  function toHex(d) {
    return ("0" + Number(d).toString(16)).slice(-2).toUpperCase();
  }

  function decodeLoanPosition(data) {
    var result = [];

    data = data.substr(2); // remove 0x from front

    const itemCount = 16;
    const objCount = data.length / 64 / itemCount;

    assert.isTrue(objCount % 1 == 0);

    var loanPositionObjArray = data.match(
      new RegExp(".{1," + itemCount * 64 + "}", "g")
    );

    for (var i = 0; i < loanPositionObjArray.length; i++) {
      var params = loanPositionObjArray[i].match(
        new RegExp(".{1," + 64 + "}", "g")
      );

      if (parseInt("0x" + params[0].substr(24)) == 0) {
        continue;
      }
      result.push({
        lender: "0x" + params[0].substr(24),
        trader: "0x" + params[1].substr(24),
        collateralTokenAddressFilled: "0x" + params[2].substr(24),
        positionTokenAddressFilled: "0x" + params[3].substr(24),
        loanTokenAmountFilled: parseInt("0x" + params[4]),
        collateralTokenAmountFilled: parseInt("0x" + params[5]),
        positionTokenAmountFilled: parseInt("0x" + params[6]),
        loanStartUnixTimestampSec: parseInt("0x" + params[7]),
        loanEndUnixTimestampSec: parseInt("0x" + params[8]),
        active: parseInt("0x" + params[9]) == 1,
        loanOrderHash: "0x" + params[10],
        loanTokenAddress: "0x" + params[11].substr(24),
        expirationUnixTimestampSec: parseInt("0x" + params[12]),
        interestTokenAddress: "0x" + params[13].substr(24),
        interestTotalAccrued: parseInt("0x" + params[14]),
        interestPaidSoFar: parseInt("0x" + params[15]),
        interestLastPaidDate: parseInt("0x" + params[16])
      });
    }

    return result;
  }

  function decodeOrders(data) {
    if (!data) {
      return [];
    }

    data = data.substr(2); // remove 0x from front
    const itemCount = 20;
    const objCount = data.length / 64 / itemCount;

    assert.isTrue(objCount % 1 == 0);

    var orderObjArray = data.match(
      new RegExp(".{1," + itemCount * 64 + "}", "g")
    );
    if (!orderObjArray) {
      return [];
    }

    var result = [];

    for (var i = 0; i < orderObjArray.length; i++) {
      var params = orderObjArray[i].match(new RegExp(".{1," + 64 + "}", "g"));

      result.push({
        maker: "0x" + params[0].substr(24),
        loanTokenAddress: "0x" + params[1].substr(24),
        interestTokenAddress: "0x" + params[2].substr(24),
        collateralTokenAddress: "0x" + params[3].substr(24),
        feeRecipientAddress: "0x" + params[4].substr(24),
        oracleAddress: "0x" + params[5].substr(24),
        loanTokenAmount: web3.utils.toBN("0x" + params[6]),
        interestAmount: web3.utils.toBN("0x" + params[7]),
        initialMarginAmount: parseInt("0x" + params[8]),
        maintenanceMarginAmount: parseInt("0x" + params[9]),
        lenderRelayFee: web3.utils.toBN("0x" + params[10]),
        traderRelayFee: web3.utils.toBN("0x" + params[11]),
        maxDurationUnixTimestampSec: parseInt("0x" + params[12]),
        expirationUnixTimestampSec: parseInt("0x" + params[13]),
        loanOrderHash: "0x" + params[14],
        lender: "0x" + params[15].substr(24),
        orderFilledAmount: web3.utils.toBN("0x" + params[16]),
        orderCancelledAmount: web3.utils.toBN("0x" + params[17]),
        orderTraderCount: web3.utils.toBN("0x" + params[18]),
        addedUnixTimestampSec: web3.utils.toBN("0x" + params[19])
      });
    }

    return result;
  }

  function ensureOrder(order, expectedOrder, expectedHash) {
    assert.equal(expectedOrder.makerAddress.toUpperCase(), order.maker.toUpperCase());
    assert.equal(expectedOrder.loanTokenAddress.toUpperCase(), order.loanTokenAddress.toUpperCase());
    assert.equal(expectedOrder.interestTokenAddress.toUpperCase(), order.interestTokenAddress.toUpperCase());
    assert.equal(expectedOrder.collateralTokenAddress.toUpperCase(), order.collateralTokenAddress.toUpperCase());
    assert.equal(expectedOrder.feeRecipientAddress.toUpperCase(), order.feeRecipientAddress.toUpperCase());
    assert.equal(expectedOrder.oracleAddress.toUpperCase(), order.oracleAddress.toUpperCase());
    assert.equal(expectedOrder.loanTokenAmount.toString(), order.loanTokenAmount.toString());
    assert.equal(expectedOrder.interestAmount.toString(), order.interestAmount.toString());
    assert.equal(expectedOrder.initialMarginAmount, order.initialMarginAmount);
    assert.equal(expectedOrder.maintenanceMarginAmount, order.maintenanceMarginAmount);
    assert.equal(expectedOrder.lenderRelayFee, order.lenderRelayFee);
    assert.equal(expectedOrder.traderRelayFee, order.traderRelayFee);
    assert.equal(expectedOrder.expirationUnixTimestampSec, order.expirationUnixTimestampSec);
    assert.equal(expectedHash, order.loanOrderHash);
  }

  let sign = async (signer, data) => {
    let signature = await web3.eth.sign(data, signer) + toHex(SignatureType.EthSign);
    assert.isOk(await bZx.isValidSignature.call(signer, data, signature));
    return signature;
  };
});

function txLogsPrint(logs) {
  var ret = "";
  if (logs === undefined) {
    logs = [];
  }
  if (logs.length > 0) {
    logs = logs.sort(function(a, b) {
      return a.blockNumber > b.blockNumber
        ? 1
        : b.blockNumber > a.blockNumber
          ? -1
          : 0;
    });
    ret = ret + "\n  LOGS --> " + "\n";
    for (var i = 0; i < logs.length; i++) {
      var log = logs[i];
      //console.log(log);
      ret =
        ret + "  " + i + ": " + log.event + " " + JSON.stringify(log.args);
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
        (
          ((tx.receipt.gasUsed * currentGasPrice) / 1e18) *
          currentEthPrice
        ).toFixed(2) +
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
        (
          ((tx.receipt.cumulativeGasUsed * currentGasPrice) / 1e18) *
          currentEthPrice
        ).toFixed(2) +
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