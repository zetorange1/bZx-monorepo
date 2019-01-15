// set configuration and tests to run
var run = {
  //"debug mode": true,

  //"should check token registry": false,
  //"should check oracle registry": false,
  //"should verify approval": false,

  "should generate loanOrderHash (as lender1)": true,
  "should sign and verify orderHash (as lender1)": true,
  "should push sample loan order on chain": true,
  "should take sample loan order (as lender1/trader1)": true,
  "should take sample loan order (as lender1/trader2) on chain": true,

  "should generate loanOrderHash (as trader2)": true,
  "should sign and verify orderHash (as trader2)": true,
  "should take sample loan order (as lender2)": true,

  "should get single loan order": true,
  "should get loan orders (for lender1)": true,
  "should get loan orders (for lender2)": true,
  "should get loan orders (for trader2)": true,
  "should get fillable orders": true,

  "should get single loan position": true,
  "should get loan positions (for lender1)": false,
  "should get loan positions (for trader1)": false,
  "should get loan positions (for trader2)": false,
  "should get active loans": false,

  "should generate 0x orders": true,
  "should sign and verify 0x orders": true,
  "should parse 0x order params": false,
  "should trade position with 0x orders": true,

  // "should generate 0x V2 orders": true,
  // "should sign and verify 0x V2 orders": true,
  // "should trade position with 0x V2 orders": true,

  "should trade position with oracle": true,
  "should change collateral (for trader1)": true,
  "should withdraw position excess": true,
  "should pay lender interest": true,

  // note: only one of the tests below can be true at a time
  "should close loan as (lender1/trader1)": true,
  "should liquidate position": false,
  "should force close loan": false
};

const BigNumber = require("bignumber.js");
const BN = require("bn.js");
const ethABI = require("ethereumjs-abi");
const ethUtil = require("ethereumjs-util");
const ethers = require("ethers");
const utils = require("./utils/utils.js");

import Web3Utils from "web3-utils";
import { ZeroEx } from "0x.js";
import {
  assetDataUtils,
  signatureUtils,
  generatePseudoRandomSalt,
  orderHashUtils
} from "@0xproject/order-utils";

var config = require("../protocol-config.js");

let BZxVault = artifacts.require("BZxVault");
let BZxTo0x = artifacts.require("BZxTo0x");
let BZxTo0xV2 = artifacts.require("BZxTo0xV2");
let BZxOracle = artifacts.require("TestNetOracle");
let BZxOracleRegistry = artifacts.require("OracleRegistry");
let BZRxTokenRegistry = artifacts.require("TokenRegistry");
let BZRxToken = artifacts.require("BZRxToken");
let ERC20 = artifacts.require("ERC20"); // for testing with any ERC20 token
let Exchange0x = artifacts.require("ExchangeInterface");
let Exchange0xV2 = artifacts.require("ExchangeV2InterfaceWithEvents");

let BZxProxy = artifacts.require("BZxProxy"); // bZx proxy
let BZx = artifacts.require("BZx"); // BZx interface

let ZeroExV2Helper = artifacts.require("ZeroExV2Helper");

let currentGasPrice = 8000000000; // 8 gwei
let currentEthPrice = 250; // USD

const MAX_UINT = (new BN(2)).pow(new BN(256)).sub(new BN(1));

const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";
const NONNULL_ADDRESS = "0x0000000000000000000000000000000000000001";

const SignatureType = Object.freeze({
  Illegal: 0,
  Invalid: 1,
  EIP712: 2,
  EthSign: 3,
  Wallet: 4,
  Validator: 5,
  PreSigned: 6
});

contract("BZxTest", function(accounts) {
  var bZx;
  var vault;
  var oracle;
  var bZxTo0x;
  var bZxTo0xV2;

  var oracle_registry;
  //var bzrx_token;
  var token_registry;

  var bZxEvents;
  var vaultEvents;
  var oracleEvents;
  var bZxTo0xEvents;
  var bZxTo0xV2Events;
  var zeroExV2Events;

  var test_tokens = [];

  var zrx_token;
  var exchange_0x;
  var exchange_0xV2;
  var zeroExV2Helper;

  var OrderParams_bZx_1, OrderParams_bZx_2;
  var OrderHash_bZx_1, OrderHash_bZx_2;
  var ECSignature_raw_1, ECSignature_raw_2;

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

  var OrderParams_0xV2_1_prepped, OrderParams_0xV2_2_prepped;

  // account roles
  var owner_account = accounts[0].toLowerCase(); // owner/contract creator, holder of all tokens
  var lender1_account = accounts[1].toLowerCase(); // lender 1
  var trader1_account = accounts[2].toLowerCase(); // trader 1
  var lender2_account = accounts[3].toLowerCase(); // lender 2
  var trader2_account = accounts[4].toLowerCase(); // trader 2
  var makerOf0xOrder1_account = accounts[7].toLowerCase(); // maker of 0x order
  var makerOf0xOrder2_account = accounts[8].toLowerCase(); // maker of 0x order
  var relay1_account = accounts[9].toLowerCase(); // relay 1

  var loanToken1;
  var loanToken2;
  var collateralToken1;
  var collateralToken2;
  var interestToken1;
  var interestToken2;
  var maker0xToken1;

  var maker0xV2Token1;

  //printBalances(accounts);

  before("retrieve all deployed contracts", async function() {
    await Promise.all([
      //(bzrx_token = await BZRxToken.deployed()),
      (vault = await BZxVault.deployed()),
      (bZxTo0x = await BZxTo0x.deployed()),
      (bZxTo0xV2 = await BZxTo0xV2.deployed()),
      (oracle_registry = await BZxOracleRegistry.deployed()),
      (token_registry = await BZRxTokenRegistry.deployed()),
      (oracle = await BZxOracle.deployed()),
      (bZx = await BZx.at((await BZxProxy.deployed()).address)),
      (zrx_token = await ERC20.at(config["addresses"]["development"]["ZeroEx"]["ZRXToken"])),
      (exchange_0x = await Exchange0x.at(config["addresses"]["development"]["ZeroEx"]["ExchangeV1"])),
      (exchange_0xV2 = await Exchange0xV2.at(config["addresses"]["development"]["ZeroEx"]["ExchangeV2"])),
      (zeroExV2Helper = await ZeroExV2Helper.deployed())
    ]);
  });

  before("retrieve all deployed test tokens", async function() {
    for (var i = 0; i < 10; i++) {
      test_tokens[i] = await artifacts.require("TestToken" + i).deployed();
      console.log("Test Token " + i + " retrieved: " + test_tokens[i].address);
    }
  });

  before("handle token transfers and approvals", async function() {
    loanToken1 = test_tokens[0];
    loanToken2 = test_tokens[1];
    collateralToken1 = test_tokens[2];
    collateralToken2 = test_tokens[3];
    interestToken1 = test_tokens[4];
    interestToken2 = test_tokens[5];
    maker0xToken1 = test_tokens[6];
    maker0xV2Token1 = test_tokens[7];

    await Promise.all([
      /*await bzrx_token.transfer(lender1_account, utils.toWei(1000000, "ether"), {
        from: owner_account
      }),
      await bzrx_token.transfer(lender2_account, utils.toWei(1000000, "ether"), {
        from: owner_account
      }),
      await bzrx_token.transfer(trader1_account, utils.toWei(1000000, "ether"), {
        from: owner_account
      }),
      await bzrx_token.transfer(trader2_account, utils.toWei(1000000, "ether"), {
        from: owner_account
      }),
      await bzrx_token.approve(vault.address, MAX_UINT, {
        from: lender1_account
      }),
      await bzrx_token.approve(vault.address, MAX_UINT, {
        from: lender2_account
      }),
      await bzrx_token.approve(vault.address, MAX_UINT, {
        from: trader1_account
      }),
      await bzrx_token.approve(vault.address, MAX_UINT, {
        from: trader2_account
      }),*/
      await loanToken1.transfer(lender1_account, utils.toWei(1000000, "ether"), {
        from: owner_account
      }),
      await loanToken2.transfer(lender2_account, utils.toWei(1000000, "ether"), {
        from: owner_account
      }),
      await loanToken1.approve(vault.address, MAX_UINT, {
        from: lender1_account
      }),
      await loanToken2.approve(vault.address, MAX_UINT, {
        from: lender2_account
      }),
      await collateralToken1.transfer(
        trader1_account,
        utils.toWei(1000000, "ether"),
        { from: owner_account }
      ),
      await collateralToken1.transfer(
        trader2_account,
        utils.toWei(1000000, "ether"),
        { from: owner_account }
      ),
      await collateralToken2.transfer(
        trader2_account,
        utils.toWei(1000000, "ether"),
        { from: owner_account }
      ),
      await collateralToken1.approve(vault.address, MAX_UINT, {
        from: trader1_account
      }),
      await collateralToken1.approve(vault.address, MAX_UINT, {
        from: trader2_account
      }),
      await collateralToken2.approve(vault.address, MAX_UINT, {
        from: trader2_account
      }),
      await interestToken1.transfer(
        trader1_account,
        utils.toWei(1000000, "ether"),
        { from: owner_account }
      ),
      await interestToken1.transfer(
        trader2_account,
        utils.toWei(1000000, "ether"),
        { from: owner_account }
      ),
      await interestToken2.transfer(
        trader2_account,
        utils.toWei(1000000, "ether"),
        { from: owner_account }
      ),
      await interestToken1.approve(vault.address, MAX_UINT, {
        from: trader1_account
      }),
      await interestToken1.approve(vault.address, MAX_UINT, {
        from: trader2_account
      }),
      await interestToken2.approve(vault.address, MAX_UINT, {
        from: trader2_account
      }),
      await zrx_token.transfer(trader1_account, utils.toWei(10000, "ether"), {
        from: owner_account
      }),
      await zrx_token.transfer(trader2_account, utils.toWei(10000, "ether"), {
        from: owner_account
      }),
      await zrx_token.approve(bZxTo0x.address, MAX_UINT, {
        from: trader1_account
      }),
      await zrx_token.approve(bZxTo0x.address, MAX_UINT, {
        from: trader2_account
      }),
      await zrx_token.approve(bZxTo0xV2.address, MAX_UINT, {
        from: trader1_account
      }),
      await zrx_token.approve(bZxTo0xV2.address, MAX_UINT, {
        from: trader2_account
      }),
      await zrx_token.transfer(
        makerOf0xOrder1_account,
        utils.toWei(10000, "ether"),
        { from: owner_account }
      ),
      await zrx_token.transfer(
        makerOf0xOrder2_account,
        utils.toWei(10000, "ether"),
        { from: owner_account }
      ),
      await zrx_token.approve(
        config["addresses"]["development"]["ZeroEx"]["TokenTransferProxy"],
        MAX_UINT,
        { from: makerOf0xOrder1_account }
      ),
      await zrx_token.approve(
        config["addresses"]["development"]["ZeroEx"]["TokenTransferProxy"],
        MAX_UINT,
        { from: makerOf0xOrder2_account }
      ),
      await zrx_token.approve(
        config["addresses"]["development"]["ZeroEx"]["ERC20Proxy"],
        MAX_UINT,
        { from: makerOf0xOrder1_account }
      ),
      await zrx_token.approve(
        config["addresses"]["development"]["ZeroEx"]["ERC20Proxy"],
        MAX_UINT,
        { from: makerOf0xOrder2_account }
      ),
      await maker0xToken1.transfer(
        makerOf0xOrder1_account,
        utils.toWei(10000, "ether"),
        { from: owner_account }
      ),
      await maker0xToken1.transfer(
        makerOf0xOrder2_account,
        utils.toWei(10000, "ether"),
        { from: owner_account }
      ),
      await maker0xToken1.approve(
        config["addresses"]["development"]["ZeroEx"]["TokenTransferProxy"],
        MAX_UINT,
        { from: makerOf0xOrder1_account }
      ),
      await maker0xToken1.approve(
        config["addresses"]["development"]["ZeroEx"]["TokenTransferProxy"],
        MAX_UINT,
        { from: makerOf0xOrder2_account }
      ),
      await maker0xV2Token1.transfer(
        makerOf0xOrder1_account,
        utils.toWei(10000, "ether"),
        { from: owner_account }
      ),
      await maker0xV2Token1.transfer(
        makerOf0xOrder2_account,
        utils.toWei(10000, "ether"),
        { from: owner_account }
      ),
      await maker0xV2Token1.approve(
        config["addresses"]["development"]["ZeroEx"]["ERC20Proxy"],
        MAX_UINT,
        { from: makerOf0xOrder1_account }
      ),
      await maker0xV2Token1.approve(
        config["addresses"]["development"]["ZeroEx"]["ERC20Proxy"],
        MAX_UINT,
        { from: makerOf0xOrder2_account }
      )
    ]);
  });

  /*before('set bZx debug mode', async function () {
    await bZx.setDebugMode(run["debug mode"], {from: owner_account});
  });*/

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
    bZxTo0xEvents = bZxTo0x.allEvents({
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
    /*bZxEvents.watch(function (error, result) {
      if(error) {
        console.err(error);
      } else {
        //console.log(result);
        console.log(txLogsPrint(result));
        //bZxEvents.stopWatching();
      }
    });*/

    /*var bZxEvents;
    var vaultEvents;
    var oracleEvents;
    var bZxTo0xEvents;*/
    /*oracle.allEvents().watch(function (error, result) {
      if(error) {
        console.err(error);
      } else {
        console.log(result);
        //bZxEvents.stopWatching();
      }
    });*/
  });

  /*
  //setup event listener
  var event = bZx.LogErrorText(function(error, result) {
      if (!error)
          console.log(result);
  });
  */

  /* TODO: getTokenList has been removed from contract, so this needs updating
  (run["should check token registry"] ? it : it.skip)("should check token registry", async function() {
    // return array of arrays: address[], uint[], uint[], string
    var data = await token_registry.getTokenList.call();
    console.log(data);
    var stringPos = 0;

    var addresses = data[0];
    var decimals = data[1];
    var stringLengths = data[2];
    var allStrings = data[3];

    for(var i=0, j=0; i < addresses.length; i++, j+=3) {
      stringLengths[j] = stringLengths[j].toNumber();
      console.log("Token "+i+" symbol: "+allStrings.substr(stringPos,stringLengths[j]));
      stringPos+=stringLengths[j];

      stringLengths[j+1] = stringLengths[j+1].toNumber();
      console.log("Token "+i+" name: "+allStrings.substr(stringPos,stringLengths[j+1]));
      stringPos+=stringLengths[j+1];

      console.log("Token "+i+" decimals: "+decimals[i].toNumber());

      stringLengths[j+2] = stringLengths[j+2].toNumber();
      console.log("Token "+i+" url: "+allStrings.substr(stringPos,stringLengths[j+2]));
      stringPos+=stringLengths[j+2];

      console.log("Token "+i+" address: "+addresses[i]);
    }

    assert.isOk(true);
  });
  */

  (run["should check oracle registry"]
    ? it
    : it.skip)("should check oracle registry", async function() {
    var data = await oracle_registry.getOracleList.call();
    //console.log(data);
    var namePos = 0;

    for (var i = 0; i < data[0].length; i++) {
      data[1][i] = data[1][i].toNumber();
      console.log(
        "Oracle " + i + " name: " + data[2].substr(namePos, data[1][i])
      );
      namePos = namePos + data[1][i];

      console.log("Oracle " + i + " address: " + data[0][i]);
    }

    assert.isOk(true);
  });

  (run["should verify approval"]
    ? it
    : it.skip)("should verify approval", async function() {
    var balance = await loanToken1.balanceOf.call(lender1_account);
    console.log("loanToken1 lender1_account: " + balance);

    var allowance = await loanToken1.allowance.call(
      lender1_account,
      vault.address
    );
    console.log("loanToken1 allowance: " + allowance);

    balance = await collateralToken1.balanceOf.call(trader1_account);
    console.log("collateralToken1 trader1_account: " + balance);

    allowance = await collateralToken1.allowance.call(
      trader1_account,
      vault.address
    );
    console.log("collateralToken1 allowance: " + allowance);

    balance = await interestToken1.balanceOf.call(trader1_account);
    console.log("interestToken1 trader1_account: " + balance);

    allowance = await interestToken1.allowance.call(
      trader1_account,
      vault.address
    );
    console.log("interestToken1 allowance: " + allowance);

    assert.isOk(true);
  });

  (run["should generate loanOrderHash (as lender1)"]
    ? it
    : it.skip)("should generate loanOrderHash (as lender1)", async () => {

    let block = await web3.eth.getBlock("latest");
    OrderParams_bZx_1 = {
      bZxAddress: bZx.address,
      makerAddress: lender1_account, // lender
      loanTokenAddress: loanToken1.address,
      interestTokenAddress: interestToken1.address,
      collateralTokenAddress: NULL_ADDRESS,
      feeRecipientAddress: NULL_ADDRESS,
      oracleAddress: oracle.address,
      loanTokenAmount: utils.toWei(100000, "ether"),
      interestAmount: utils.toWei(2, "ether"), // 2 token units per day
      initialMarginAmount: utils.toWei(50, "ether").toString(), // 50%
      maintenanceMarginAmount: utils.toWei(5, "ether").toString(), // 25%
      lenderRelayFee: utils.toWei(0.001, "ether"),
      traderRelayFee: utils.toWei(0.0015, "ether"),
      maxDurationUnixTimestampSec: "2419200", // 28 days
      expirationUnixTimestampSec: (block.timestamp + 86400).toString(),
      makerRole: "0", // 0=lender, 1=trader
      salt: generatePseudoRandomSalt().toString(),
      takerAddress: NULL_ADDRESS,
	  tradeTokenToFillAddress: NULL_ADDRESS,
      withdrawOnOpen: "0"

    };
    console.log(OrderParams_bZx_1);

    OrderHash_bZx_1 = await bZx.getLoanOrderHash.call(
        [
          OrderParams_bZx_1["makerAddress"],
          OrderParams_bZx_1["loanTokenAddress"],
          OrderParams_bZx_1["interestTokenAddress"],
          OrderParams_bZx_1["collateralTokenAddress"],
          OrderParams_bZx_1["feeRecipientAddress"],
          OrderParams_bZx_1["oracleAddress"],
          OrderParams_bZx_1["takerAddress"],
          OrderParams_bZx_1["tradeTokenToFillAddress"]
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
          new BN(OrderParams_bZx_1["withdrawOnOpen"]),
          new BN(OrderParams_bZx_1["salt"])
        ],
        "0x00" // oracleData
      );

      console.log("sol hash: " + OrderHash_bZx_1);
  });

  (run["should sign and verify orderHash (as lender1)"]
    ? it
    : it.skip)("should sign and verify orderHash (as lender1)", async () => {

    console.log("OrderHash_bZx_1", OrderHash_bZx_1)
    console.log("lender1_account", lender1_account)

    ECSignature_raw_1 = await web3.eth.sign(OrderHash_bZx_1, lender1_account);


    // add signature type to end
    ECSignature_raw_1 = ECSignature_raw_1 + toHex(SignatureType.EthSign);

    bZx.isValidSignature
      .call(
        lender1_account, // lender
        OrderHash_bZx_1,
        ECSignature_raw_1
      )
      .then(
        function(result) {
          assert.isOk(result);
        },
        function(error) {
          console.error(error);
          assert.isOk(false);
        }
      );
  });

  (run["should push sample loan order on chain"]
    ? it
    : it.skip)("should push sample loan order on chain", function(done) {
    bZx
      .pushLoanOrderOnChain(
        [
          OrderParams_bZx_1["makerAddress"],
          OrderParams_bZx_1["loanTokenAddress"],
          OrderParams_bZx_1["interestTokenAddress"],
          OrderParams_bZx_1["collateralTokenAddress"],
          OrderParams_bZx_1["feeRecipientAddress"],
          OrderParams_bZx_1["oracleAddress"],
          OrderParams_bZx_1["takerAddress"],
          OrderParams_bZx_1["tradeTokenToFillAddress"]
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
          new BN(OrderParams_bZx_1["withdrawOnOpen"]),
          new BN(OrderParams_bZx_1["salt"])
        ],
        "0x00", // oracleData
        ECSignature_raw_1,
        {
          from: makerOf0xOrder2_account,
          gas: 1000000,
          gasPrice: utils.toWei(10, "gwei")
        }
      )
      .then(function(tx) {
        console.log(
          txPrettyPrint(tx, "should push sample loan order on chain")
        );
        assert.isOk(tx);
        done();
      }),
      function(error) {
        console.error("error: " + error);
        assert.isOk(false);
        done();
      };
  });

  (run["should take sample loan order (as lender1/trader1)"]
    ? it
    : it.skip)("should take sample loan order (as lender1/trader1)", function(done) {
    bZx
      .takeLoanOrderAsTrader(
        [
          OrderParams_bZx_1["makerAddress"],
          OrderParams_bZx_1["loanTokenAddress"],
          OrderParams_bZx_1["interestTokenAddress"],
          OrderParams_bZx_1["collateralTokenAddress"],
          OrderParams_bZx_1["feeRecipientAddress"],
          OrderParams_bZx_1["oracleAddress"],
          OrderParams_bZx_1["takerAddress"],
          OrderParams_bZx_1["tradeTokenToFillAddress"]
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
          new BN(OrderParams_bZx_1["withdrawOnOpen"]),
          new BN(OrderParams_bZx_1["salt"])
        ],
        "0x00", // oracleData
        collateralToken1.address,
        utils.toWei(12.3, "ether"),
        NULL_ADDRESS,
        false,
        ECSignature_raw_1,
        {
          from: trader1_account,
          gas: 1000000,
          gasPrice: utils.toWei(30, "gwei")
        }
      )
      .then(function(tx) {
        console.log(
          txPrettyPrint(
            tx,
            "should take sample loan order (as lender1/trader1)"
          )
        );
        assert.isOk(tx);
        done();
      }),
      function(error) {
        console.error("error: " + error);
        assert.isOk(false);
        done();
      };
  });

  (run["should take sample loan order (as lender1/trader2) on chain"]
    ? it
    : it.skip)("should take sample loan order (as lender1/trader2) on chain", function(done) {
    bZx
      .takeLoanOrderOnChainAsTrader(
        OrderHash_bZx_1,
        collateralToken1.address,
        utils.toWei(20, "ether"),
        NULL_ADDRESS,
        false,
        {
          from: trader2_account,
          gas: 1000000,
          gasPrice: utils.toWei(30, "gwei")
        }
      )
      .then(function(tx) {
        console.log(
          txPrettyPrint(
            tx,
            "should take sample loan order (as lender1/trader2) on chain"
          )
        );
        assert.isOk(tx);
        done();
      }),
      function(error) {
        console.error("error: " + error);
        assert.isOk(false);
        done();
      };
  });

  (run["should generate loanOrderHash (as trader2)"]
    ? it
    : it.skip)("should generate loanOrderHash (as trader2)", async() => {
    OrderParams_bZx_2 = {
      bZxAddress: bZx.address,
      makerAddress: trader2_account, // lender
      loanTokenAddress: loanToken2.address,
      interestTokenAddress: interestToken2.address,
      collateralTokenAddress: collateralToken2.address,
      feeRecipientAddress: NULL_ADDRESS,
      oracleAddress: oracle.address,
      loanTokenAmount: utils.toWei(100000, "ether").toString(),
      interestAmount: utils.toWei(2, "ether").toString(), // 2 token units per day
      initialMarginAmount: utils.toWei(50, "ether").toString(), // 50%
      maintenanceMarginAmount: utils.toWei(25, "ether").toString(), // 25%
      lenderRelayFee: utils.toWei(0.001, "ether").toString(),
      traderRelayFee: utils.toWei(0.0015, "ether").toString(),
      maxDurationUnixTimestampSec: "2419200", // 28 days
      expirationUnixTimestampSec: (
        (await web3.eth.getBlock("latest")).timestamp + 86400
      ).toString(),
      makerRole: "1", // 0=lender, 1=trader
      salt: generatePseudoRandomSalt().toString(),
      takerAddress: NULL_ADDRESS,
	  tradeTokenToFillAddress: NULL_ADDRESS,
      withdrawOnOpen: "0"
    };
    console.log(OrderParams_bZx_2);
    OrderHash_bZx_2 = await bZx.getLoanOrderHash
      .call(
        [
          OrderParams_bZx_2["makerAddress"],
          OrderParams_bZx_2["loanTokenAddress"],
          OrderParams_bZx_2["interestTokenAddress"],
          OrderParams_bZx_2["collateralTokenAddress"],
          OrderParams_bZx_2["feeRecipientAddress"],
          OrderParams_bZx_2["oracleAddress"],
          OrderParams_bZx_2["takerAddress"],
          OrderParams_bZx_2["tradeTokenToFillAddress"]
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
          new BN(OrderParams_bZx_2["withdrawOnOpen"]),
          new BN(OrderParams_bZx_2["salt"])
        ],
        "0x00" // oracleData
      )
      console.log("sol hash: " + OrderHash_bZx_2);
  });

  (run["should sign and verify orderHash (as trader2)"]
    ? it
    : it.skip)("should sign and verify orderHash (as trader2)", async () => {

    ECSignature_raw_2 = await web3.eth.sign(OrderHash_bZx_2, trader2_account);

    // add signature type to end
    ECSignature_raw_2 = ECSignature_raw_2 + toHex(SignatureType.EthSign);

    bZx.isValidSignature
      .call(
        trader2_account, // lender
        OrderHash_bZx_2,
        ECSignature_raw_2
      )
      .then(
        function(result) {
          assert.isOk(result);
        },
        function(error) {
          console.error(error);
          assert.isOk(false);
        }
      );
  });

  (run["should take sample loan order (as lender2)"]
    ? it
    : it.skip)("should take sample loan order (as lender2)", async function() {
    //const provider = new providers.Web3Provider(web3.currentProvider);

    try {
      let tx = await bZx.takeLoanOrderAsLender(
        [
          OrderParams_bZx_2["makerAddress"],
          OrderParams_bZx_2["loanTokenAddress"],
          OrderParams_bZx_2["interestTokenAddress"],
          OrderParams_bZx_2["collateralTokenAddress"],
          OrderParams_bZx_2["feeRecipientAddress"],
          OrderParams_bZx_2["oracleAddress"],
          OrderParams_bZx_2["takerAddress"],
          OrderParams_bZx_2["tradeTokenToFillAddress"]
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
          new BN(OrderParams_bZx_2["withdrawOnOpen"]),
          new BN(OrderParams_bZx_2["salt"])
        ],
        "0x00", // oracleData
        ECSignature_raw_2,
        { from: lender2_account, gasPrice: utils.toWei(30, "gwei") }
      );

      console.log(
        txPrettyPrint(tx, "should take sample loan order (as lender2)")
      );

      /*tx = (await provider.send("debug_traceTransaction", [ tx.tx, {} ]));
      console.log(JSON.stringify(tx, null, '\t'));*/

      assert.isOk(tx);
    } catch (error) {
      console.error("error: " + error);

      /*var matches = error.message.match(/Transaction: ([^ ]+) exited/);
      console.log(matches[1]);
      provider.send("debug_traceTransaction", [ matches[1], {} ]).then(function(tx) {
      //provider.getTransactionReceipt(error["tx"]).then(function(tx) {
        console.log(JSON.stringify(tx, null, '\t'));
      });*/

      assert.isOk(false);
    }
  });

  (run["should get single loan order"]
    ? it
    : it.skip)("should get single loan order", async function() {
    var data = await bZx.getSingleOrder.call(OrderHash_bZx_1);
    console.log("getSingleOrder(...):");
    console.log(data);

    data = data.substr(2); // remove 0x from front
    const itemCount = 23;
    const objCount = data.length / 64 / itemCount;
    var orders = [];

    if (objCount != 1) {
      console.error("error: data length invalid!");
      assert.isOk(false);
    } else {
      var orderObjArray = data.match(
        new RegExp(".{1," + itemCount * 64 + "}", "g")
      );
      //console.log("orderObjArray.length: "+orderObjArray.length);
      for (var i = 0; i < orderObjArray.length; i++) {
        var params = orderObjArray[i].match(new RegExp(".{1," + 64 + "}", "g"));
        //console.log(i+": params.length: "+params.length);
        orders.push({
          makerAddress: "0x" + params[0].substr(24),
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
          maxDurationUnixTimestampSec: parseInt("0x" + params[12]),
          expirationUnixTimestampSec: parseInt("0x" + params[13]),
          loanOrderHash: "0x" + params[14],
          lender: "0x" + params[15].substr(24),
          orderFilledAmount: parseInt("0x" + params[16]),
          orderCancelledAmount: parseInt("0x" + params[17]),
          orderTraderCount: parseInt("0x" + params[18]),
          addedUnixTimestampSec: parseInt("0x" + params[19]),
          takerAddress: "0x" + params[20].substr(24),
          tradeTokenToFillAddress: "0x" + params[21].substr(24),
          withdrawOnOpen: parseInt("0x" + params[22]) ? true : false
        });
      }

      /*struct LoanOrder {
          address maker;
          address loanTokenAddress;
          address interestTokenAddress;
          address collateralTokenAddress;
          address feeRecipientAddress;
          address oracleAddress;
          uint loanTokenAmount;
          uint interestAmount;
          uint initialMarginAmount;
          uint maintenanceMarginAmount;
          uint lenderRelayFee;
          uint traderRelayFee;
          uint expirationUnixTimestampSec;
          bytes32 loanOrderHash;
      }*/

      console.log(orders);

      assert.isOk(true);
    }
  });

  (run["should get loan orders (for lender1)"]
    ? it
    : it.skip)("should get loan orders (for lender1)", async function() {
    var data = await bZx.getOrdersForUser.call(
      lender1_account,
      0, // starting item
      10, // max number of items returned
      NULL_ADDRESS // oracleAddress filter
    );
    console.log("getOrdersForUser(...):");
    console.log(data);

    data = data.substr(2); // remove 0x from front
    const itemCount = 23;
    const objCount = data.length / 64 / itemCount;
    var orders = [];

    if (objCount % 1 != 0) {
      // must be a whole number
      console.error("error: data length invalid!");
      assert.isOk(false);
    } else {
      var orderObjArray = data.match(
        new RegExp(".{1," + itemCount * 64 + "}", "g")
      );
      //console.log("orderObjArray.length: "+orderObjArray.length);
      for (var i = 0; i < orderObjArray.length; i++) {
        var params = orderObjArray[i].match(new RegExp(".{1," + 64 + "}", "g"));
        //console.log(i+": params.length: "+params.length);
        orders.push({
          makerAddress: "0x" + params[0].substr(24),
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
          maxDurationUnixTimestampSec: parseInt("0x" + params[12]),
          expirationUnixTimestampSec: parseInt("0x" + params[13]),
          loanOrderHash: "0x" + params[14],
          lender: "0x" + params[15].substr(24),
          orderFilledAmount: parseInt("0x" + params[16]),
          orderCancelledAmount: parseInt("0x" + params[17]),
          orderTraderCount: parseInt("0x" + params[18]),
          addedUnixTimestampSec: parseInt("0x" + params[19]),
          takerAddress: "0x" + params[20].substr(24),
          tradeTokenToFillAddress: "0x" + params[21].substr(24),
          withdrawOnOpen: parseInt("0x" + params[22]) ? true : false
        });
      }

      /*struct LoanOrder {
          address maker;
          address loanTokenAddress;
          address interestTokenAddress;
          address collateralTokenAddress;
          address feeRecipientAddress;
          address oracleAddress;
          uint loanTokenAmount;
          uint interestAmount;
          uint initialMarginAmount;
          uint maintenanceMarginAmount;
          uint lenderRelayFee;
          uint traderRelayFee;
          uint expirationUnixTimestampSec;
          bytes32 loanOrderHash;
      }*/

      console.log(orders);

      assert.isOk(true);
    }
  });

  (run["should get loan orders (for lender2)"]
    ? it
    : it.skip)("should get loan orders (for lender2)", async function() {
    var data = await bZx.getOrdersForUser.call(
      lender2_account,
      0, // starting item
      10, // max number of items returned
      NULL_ADDRESS // oracleAddress filter
    );
    console.log("getOrdersForUser(...):");
    console.log(data);

    data = data.substr(2); // remove 0x from front
    const itemCount = 23;
    const objCount = data.length / 64 / itemCount;
    var orders = [];

    if (objCount % 1 != 0) {
      // must be a whole number
      console.error("error: data length invalid!");
      assert.isOk(false);
    } else {
      var orderObjArray = data.match(
        new RegExp(".{1," + itemCount * 64 + "}", "g")
      );
      //console.log("orderObjArray.length: "+orderObjArray.length);
      for (var i = 0; i < orderObjArray.length; i++) {
        var params = orderObjArray[i].match(new RegExp(".{1," + 64 + "}", "g"));
        //console.log(i+": params.length: "+params.length);
        orders.push({
          makerAddress: "0x" + params[0].substr(24),
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
          maxDurationUnixTimestampSec: parseInt("0x" + params[12]),
          expirationUnixTimestampSec: parseInt("0x" + params[13]),
          loanOrderHash: "0x" + params[14],
          lender: "0x" + params[15].substr(24),
          orderFilledAmount: parseInt("0x" + params[16]),
          orderCancelledAmount: parseInt("0x" + params[17]),
          orderTraderCount: parseInt("0x" + params[18]),
          addedUnixTimestampSec: parseInt("0x" + params[19]),
          takerAddress: "0x" + params[20].substr(24),
          tradeTokenToFillAddress: "0x" + params[21].substr(24),
          withdrawOnOpen: parseInt("0x" + params[22]) ? true : false
        });
      }

      /*struct LoanOrder {
          address maker;
          address loanTokenAddress;
          address interestTokenAddress;
          address collateralTokenAddress;
          address feeRecipientAddress;
          address oracleAddress;
          uint loanTokenAmount;
          uint interestAmount;
          uint initialMarginAmount;
          uint maintenanceMarginAmount;
          uint lenderRelayFee;
          uint traderRelayFee;
          uint expirationUnixTimestampSec;
          bytes32 loanOrderHash;
      }*/

      console.log(orders);

      assert.isOk(true);
    }
  });

  (run["should get loan orders (for trader2)"]
    ? it
    : it.skip)("should get loan orders (for trader2)", async function() {
    var data = await bZx.getOrdersForUser.call(
      trader2_account,
      0, // starting item
      10, // max number of items returned
      NULL_ADDRESS // oracleAddress filter
    );
    console.log("getOrdersForUser(...):");
    console.log(data);

    data = data.substr(2); // remove 0x from front
    const itemCount = 23;
    const objCount = data.length / 64 / itemCount;
    var orders = [];

    if (objCount % 1 != 0) {
      // must be a whole number
      console.error("error: data length invalid!");
      assert.isOk(false);
    } else {
      var orderObjArray = data.match(
        new RegExp(".{1," + itemCount * 64 + "}", "g")
      );
      //console.log("orderObjArray.length: "+orderObjArray.length);
      for (var i = 0; i < orderObjArray.length; i++) {
        var params = orderObjArray[i].match(new RegExp(".{1," + 64 + "}", "g"));
        //console.log(i+": params.length: "+params.length);
        orders.push({
          makerAddress: "0x" + params[0].substr(24),
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
          maxDurationUnixTimestampSec: parseInt("0x" + params[12]),
          expirationUnixTimestampSec: parseInt("0x" + params[13]),
          loanOrderHash: "0x" + params[14],
          lender: "0x" + params[15].substr(24),
          orderFilledAmount: parseInt("0x" + params[16]),
          orderCancelledAmount: parseInt("0x" + params[17]),
          orderTraderCount: parseInt("0x" + params[18]),
          addedUnixTimestampSec: parseInt("0x" + params[19]),
          takerAddress: "0x" + params[20].substr(24),
          tradeTokenToFillAddress: "0x" + params[21].substr(24),
          withdrawOnOpen: parseInt("0x" + params[22]) ? true : false
        });
      }

      /*struct LoanOrder {
          address maker;
          address loanTokenAddress;
          address interestTokenAddress;
          address collateralTokenAddress;
          address feeRecipientAddress;
          address oracleAddress;
          uint loanTokenAmount;
          uint interestAmount;
          uint initialMarginAmount;
          uint maintenanceMarginAmount;
          uint lenderRelayFee;
          uint traderRelayFee;
          uint expirationUnixTimestampSec;
          bytes32 loanOrderHash;
      }*/

      console.log(orders);

      assert.isOk(true);
    }
  });

  (run["should get fillable orders"]
    ? it
    : it.skip)("should get fillable orders", async function() {
    var data = await bZx.getOrdersFillable.call(
      0, // starting item
      10, // max number of items returned
      NULL_ADDRESS // oracleAddress filter
    );
    console.log("getOrdersFillable(...):");
    console.log(data);

    data = data.substr(2); // remove 0x from front
    const itemCount = 23;
    const objCount = data.length / 64 / itemCount;
    var orders = [];

    if (objCount % 1 != 0) {
      // must be a whole number
      console.error("error: data length invalid!");
      assert.isOk(false);
    } else {
      var orderObjArray = data.match(
        new RegExp(".{1," + itemCount * 64 + "}", "g")
      );
      //console.log("orderObjArray.length: "+orderObjArray.length);
      for (var i = 0; i < orderObjArray.length; i++) {
        var params = orderObjArray[i].match(new RegExp(".{1," + 64 + "}", "g"));
        //console.log(i+": params.length: "+params.length);
        orders.push({
          makerAddress: "0x" + params[0].substr(24),
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
          maxDurationUnixTimestampSec: parseInt("0x" + params[12]),
          expirationUnixTimestampSec: parseInt("0x" + params[13]),
          loanOrderHash: "0x" + params[14],
          lender: "0x" + params[15].substr(24),
          orderFilledAmount: parseInt("0x" + params[16]),
          orderCancelledAmount: parseInt("0x" + params[17]),
          orderTraderCount: parseInt("0x" + params[18]),
          addedUnixTimestampSec: parseInt("0x" + params[19]),
          takerAddress: "0x" + params[20].substr(24),
          tradeTokenToFillAddress: "0x" + params[21].substr(24),
          withdrawOnOpen: parseInt("0x" + params[22]) ? true : false
        });
      }

      /*struct LoanOrder {
          address maker;
          address loanTokenAddress;
          address interestTokenAddress;
          address collateralTokenAddress;
          address feeRecipientAddress;
          address oracleAddress;
          uint loanTokenAmount;
          uint interestAmount;
          uint initialMarginAmount;
          uint maintenanceMarginAmount;
          uint lenderRelayFee;
          uint traderRelayFee;
          uint expirationUnixTimestampSec;
          bytes32 loanOrderHash;
      }*/

      console.log(orders);

      assert.isOk(true);
    }
  });

  (run["should get single loan position"]
    ? it
    : it.skip)("should get single loan position", async function() {
    var data = await bZx.getSingleLoan.call(OrderHash_bZx_1, trader1_account);
    console.log(data);

    data = data.substr(2); // remove 0x from front
    const itemCount = 15;
    const objCount = data.length / 64 / itemCount;
    var loanPositions = [];

    if (objCount != 1) {
      console.error("error: data length invalid!");
      assert.isOk(false);
    } else {
      var loanPositionObjArray = data.match(
        new RegExp(".{1," + itemCount * 64 + "}", "g")
      );
      console.log(
        "loanPositionObjArray.length: " + loanPositionObjArray.length
      );
      for (var i = 0; i < loanPositionObjArray.length; i++) {
        var params = loanPositionObjArray[i].match(
          new RegExp(".{1," + 64 + "}", "g")
        );
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
          loanEndUnixTimestampSec: parseInt("0x" + params[8]),
          active: parseInt("0x" + params[9]) == 1,
          loanOrderHash: "0x" + params[10],
          loanTokenAddress: "0x" + params[11].substr(24),
          interestTokenAddress: "0x" + params[12].substr(24),
          interestPaidTotal: parseInt("0x" + params[13]),
          interestDepositRemaining: parseInt("0x" + params[14])
        });
      }

      /*struct LoanPosition {
        address lender;
        address trader;
        address collateralTokenAddressFilled;
        address positionTokenAddressFilled;
        uint loanTokenAmountFilled;
        uint collateralTokenAmountFilled;
        uint positionTokenAmountFilled;
        uint loanStartUnixTimestampSec;
        bool active;
      }*/

      console.log(loanPositions);

      assert.isOk(true);
    }
  });

  (run["should get loan positions (for lender1)"]
    ? it
    : it.skip)("should get loan positions (for lender1)", async function() {
    var data = await bZx.getLoansForLender.call(
      lender1_account,
      10, // max number of items returned
      true // activeOnly
    );
    console.log(data);

    data = data.substr(2); // remove 0x from front
    const itemCount = 15;
    const objCount = data.length / 64 / itemCount;
    var loanPositions = [];

    if (objCount % 1 != 0) {
      // must be a whole number
      console.error("error: data length invalid!");
      assert.isOk(false);
    } else {
      var loanPositionObjArray = data.match(
        new RegExp(".{1," + itemCount * 64 + "}", "g")
      );
      console.log(
        "loanPositionObjArray.length: " + loanPositionObjArray.length
      );
      for (var i = 0; i < loanPositionObjArray.length; i++) {
        var params = loanPositionObjArray[i].match(
          new RegExp(".{1," + 64 + "}", "g")
        );
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
          loanEndUnixTimestampSec: parseInt("0x" + params[8]),
          active: parseInt("0x" + params[9]) == 1,
          loanOrderHash: "0x" + params[10],
          loanTokenAddress: "0x" + params[11].substr(24),
          interestTokenAddress: "0x" + params[12].substr(24),
          interestPaidTotal: parseInt("0x" + params[13]),
          interestDepositRemaining: parseInt("0x" + params[14]),
        });
      }

      /*struct LoanPosition {
        address lender;
        address trader;
        address collateralTokenAddressFilled;
        address positionTokenAddressFilled;
        uint loanTokenAmountFilled;
        uint collateralTokenAmountFilled;
        uint positionTokenAmountFilled;
        uint loanStartUnixTimestampSec;
        bool active;
      }*/

      console.log(loanPositions);

      assert.isOk(true);
    }
  });

  (run["should get loan positions (for trader1)"]
    ? it
    : it.skip)("should get loan positions (for trader1)", async function() {
    var data = await bZx.getLoansForTrader.call(
      trader1_account,
      10, // max number of items returned
      false // activeOnly
    );
    console.log(data);

    data = data.substr(2); // remove 0x from front
    const itemCount = 15;
    const objCount = data.length / 64 / itemCount;
    var loanPositions = [];

    if (objCount % 1 != 0) {
      // must be a whole number
      console.error("error: data length invalid!");
      assert.isOk(false);
    } else {
      var loanPositionObjArray = data.match(
        new RegExp(".{1," + itemCount * 64 + "}", "g")
      );
      console.log(
        "loanPositionObjArray.length: " + loanPositionObjArray.length
      );
      for (var i = 0; i < loanPositionObjArray.length; i++) {
        var params = loanPositionObjArray[i].match(
          new RegExp(".{1," + 64 + "}", "g")
        );
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
          loanEndUnixTimestampSec: parseInt("0x" + params[8]),
          active: parseInt("0x" + params[9]) == 1,
          loanOrderHash: "0x" + params[10],
          loanTokenAddress: "0x" + params[11].substr(24),
          interestTokenAddress: "0x" + params[12].substr(24),
          interestPaidTotal: parseInt("0x" + params[13]),
          interestDepositRemaining: parseInt("0x" + params[14]),
        });
      }

      /*struct LoanPosition {
        address lender;
        address trader;
        address collateralTokenAddressFilled;
        address positionTokenAddressFilled;
        uint loanTokenAmountFilled;
        uint collateralTokenAmountFilled;
        uint positionTokenAmountFilled;
        uint loanStartUnixTimestampSec;
        bool active;
      }*/

      console.log(loanPositions);

      assert.isOk(true);
    }
  });

  (run["should get loan positions (for trader2)"]
    ? it
    : it.skip)("should get loan positions (for trader2)", async function() {
    var data = await bZx.getLoansForTrader.call(
      trader2_account,
      10, // max number of items returned
      true // activeOnly
    );
    console.log(data);

    data = data.substr(2); // remove 0x from front
    const itemCount = 15;
    const objCount = data.length / 64 / itemCount;
    var loanPositions = [];

    if (objCount % 1 != 0) {
      // must be a whole number
      console.error("error: data length invalid!");
      assert.isOk(false);
    } else {
      var loanPositionObjArray = data.match(
        new RegExp(".{1," + itemCount * 64 + "}", "g")
      );
      console.log(
        "loanPositionObjArray.length: " + loanPositionObjArray.length
      );
      for (var i = 0; i < loanPositionObjArray.length; i++) {
        var params = loanPositionObjArray[i].match(
          new RegExp(".{1," + 64 + "}", "g")
        );
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
          loanEndUnixTimestampSec: parseInt("0x" + params[8]),
          active: parseInt("0x" + params[9]) == 1,
          loanOrderHash: "0x" + params[10],
          loanTokenAddress: "0x" + params[11].substr(24),
          interestTokenAddress: "0x" + params[12].substr(24),
          interestPaidTotal: parseInt("0x" + params[13]),
          interestDepositRemaining: parseInt("0x" + params[14]),

        });
      }

      /*struct LoanPosition {
        address lender;
        address trader;
        address collateralTokenAddressFilled;
        address positionTokenAddressFilled;
        uint loanTokenAmountFilled;
        uint collateralTokenAmountFilled;
        uint positionTokenAmountFilled;
        uint loanStartUnixTimestampSec;
        bool active;
      }*/

      console.log(loanPositions);

      assert.isOk(true);
    }
  });

  (run["should get active loans"]
    ? it
    : it.skip)("should get active loans", async function() {
    var data = await bZx.getActiveLoans.call(
      0, // starting item
      10 // max number of items returned
    );
    console.log(data);

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
      console.log("loansObjArray.length: " + loansObjArray.length);
      for (var i = 0; i < loansObjArray.length; i++) {
        var params = loansObjArray[i].match(new RegExp(".{1," + 64 + "}", "g"));
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

  (run["should generate 0x orders"]
    ? it
    : it.skip)("should generate 0x orders", async function() {

    let tradeData = await oracle.getTradeData.call(
      maker0xToken1.address.toLowerCase(),
      loanToken1.address.toLowerCase(),
      utils.toWei(2, "ether").toString()
    );
    //console.log(tradeData);

    OrderParams_0x_1 = {
      exchangeContractAddress:config["addresses"]["development"]["ZeroEx"]["ExchangeV1"],
      expirationUnixTimestampSec: ((await web3.eth.getBlock("latest")).timestamp + 86400).toString(),
      feeRecipient: NONNULL_ADDRESS,
      maker: makerOf0xOrder1_account,
      makerFee: utils.toWei(0.002, "ether").toString(),
      makerTokenAddress: maker0xToken1.address.toLowerCase(),
      makerTokenAmount: utils.toWei(2, "ether").toString(),
      salt: generatePseudoRandomSalt().toString(),
      taker: NULL_ADDRESS,
      takerFee: utils.toWei(0.0013, "ether").toString(),
      takerTokenAddress: loanToken1.address.toLowerCase(),
      takerTokenAmount: tradeData[1].toString()
    };

    console.log("OrderParams_0x_1:");
    console.log(OrderParams_0x_1);

    tradeData = await oracle.getTradeData.call(
      maker0xToken1.address.toLowerCase(),
      loanToken1.address.toLowerCase(),
      utils.toWei(100, "ether").toString()
    );
    //console.log(tradeData);

    OrderParams_0x_2 = {
      exchangeContractAddress:config["addresses"]["development"]["ZeroEx"]["ExchangeV1"],
      expirationUnixTimestampSec: ((await web3.eth.getBlock("latest")).timestamp + 86400).toString(),
      feeRecipient: NONNULL_ADDRESS,
      maker: makerOf0xOrder2_account,
      makerFee: utils.toWei(0.1, "ether").toString(),
      makerTokenAddress: maker0xToken1.address.toLowerCase(),
      makerTokenAmount: utils.toWei(100, "ether").toString(),
      salt: generatePseudoRandomSalt().toString(),
      taker: NULL_ADDRESS,
      takerFee: utils.toWei(0.02, "ether").toString(),
      takerTokenAddress: loanToken1.address.toLowerCase(),
      takerTokenAmount: tradeData[1].toString()
    };

    console.log("OrderParams_0x_2:");
    console.log(OrderParams_0x_2);

    OrderHash_0x_1 = ZeroEx.getOrderHashHex(OrderParams_0x_1);
    OrderHash_0x_2 = ZeroEx.getOrderHashHex(OrderParams_0x_2);

    assert.isOk(true);
  });

  (run["should sign and verify 0x orders"]
    ? it
    : it.skip)("should sign and verify 0x orders", async function() {

    ECSignature_0x_raw_1 = await web3.eth.sign(
        OrderHash_0x_1,
        makerOf0xOrder1_account
    );
    ECSignature_0x_raw_2 = await web3.eth.sign(
        OrderHash_0x_2,
        makerOf0xOrder2_account
    );

    ECSignature_0x_1 = {
      v: parseInt(ECSignature_0x_raw_1.substring(130, 132)) + 27,
      r: "0x" + ECSignature_0x_raw_1.substring(2, 66),
      s: "0x" + ECSignature_0x_raw_1.substring(66, 130)
    };

    ECSignature_0x_2 = {
      v: parseInt(ECSignature_0x_raw_2.substring(130, 132)) + 27,
      r: "0x" + ECSignature_0x_raw_2.substring(2, 66),
      s: "0x" + ECSignature_0x_raw_2.substring(66, 130)
    };

    try {
      var result1 = await exchange_0x.isValidSignature.call(
        makerOf0xOrder1_account,
        OrderHash_0x_1,
        ECSignature_0x_1["v"],
        ECSignature_0x_1["r"],
        ECSignature_0x_1["s"]
      );

      console.log("result1", result1)

      var result2 = await exchange_0x.isValidSignature.call(
        makerOf0xOrder2_account,
        OrderHash_0x_2,
        ECSignature_0x_2["v"],
        ECSignature_0x_2["r"],
        ECSignature_0x_2["s"]
      );

      console.log("result2", result2)

      assert.isOk(result1 && result2);
    } catch (error) {
      console.error(error);
      assert.isOk(false);
    }
  });

  (run["should parse 0x order params"]
    ? it
    : it.skip)("should parse 0x order params", function(done) {
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
      Web3Utils.padLeft(OrderParams_0x_1["maker"], 64),
      Web3Utils.padLeft(OrderParams_0x_1["taker"], 64),
      Web3Utils.padLeft(OrderParams_0x_1["makerTokenAddress"], 64),
      Web3Utils.padLeft(OrderParams_0x_1["takerTokenAddress"], 64),
      Web3Utils.padLeft(OrderParams_0x_1["feeRecipient"], 64),
      "0x" +
        Web3Utils.padLeft(new BN(OrderParams_0x_1["makerTokenAmount"]), 64),
      "0x" +
        Web3Utils.padLeft(new BN(OrderParams_0x_1["takerTokenAmount"]), 64),
      "0x" + Web3Utils.padLeft(new BN(OrderParams_0x_1["makerFee"]), 64),
      "0x" + Web3Utils.padLeft(new BN(OrderParams_0x_1["takerFee"]), 64),
      "0x" +
        Web3Utils.padLeft(
          new BN(OrderParams_0x_1["expirationUnixTimestampSec"]),
          64
        ),
      "0x" + Web3Utils.padLeft(new BN(OrderParams_0x_1["salt"]), 64)
    ];

    //console.log(values);
    var hashBuff = ethABI.solidityPack(types, values);
    //console.log(hashBuff);
    var sample_order_tightlypacked = ethUtil.bufferToHex(hashBuff);
    //console.log(sample_order_tightlypacked);
    //console.log(ECSignature_0x_raw_1);
    console.log("sample_order_tightlypacked: " + sample_order_tightlypacked);
    bZxTo0x.getOrderValuesFromData
      .call(sample_order_tightlypacked, { from: trader1_account })
      .then(function(values) {
        console.log(JSON.stringify(values, null, "\t"));
        assert.isOk(true);
        done();
      }),
      function(error) {
        console.error(error);
        assert.isOk(false);
        done();
      };
  });

  (run["should trade position with 0x orders"]
    ? it
    : it.skip)("should trade position with 0x orders", function(done) {
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
      Web3Utils.padLeft(OrderParams_0x_1["maker"], 64),
      Web3Utils.padLeft(OrderParams_0x_1["taker"], 64),
      Web3Utils.padLeft(OrderParams_0x_1["makerTokenAddress"], 64),
      Web3Utils.padLeft(OrderParams_0x_1["takerTokenAddress"], 64),
      Web3Utils.padLeft(OrderParams_0x_1["feeRecipient"], 64),
      "0x" +
        Web3Utils.padLeft(new BN(OrderParams_0x_1["makerTokenAmount"]), 64),
      "0x" +
        Web3Utils.padLeft(new BN(OrderParams_0x_1["takerTokenAmount"]), 64),
      "0x" + Web3Utils.padLeft(new BN(OrderParams_0x_1["makerFee"]), 64),
      "0x" + Web3Utils.padLeft(new BN(OrderParams_0x_1["takerFee"]), 64),
      "0x" +
        Web3Utils.padLeft(
          new BN(OrderParams_0x_1["expirationUnixTimestampSec"]),
          64
        ),
      "0x" + Web3Utils.padLeft(new BN(OrderParams_0x_1["salt"]), 64)
    ];

    //console.log(values);
    var hashBuff = ethABI.solidityPack(types, values);
    //console.log(hashBuff);
    var sample_order_tightlypacked_1 = ethUtil.bufferToHex(hashBuff);
    //console.log(sample_order_tightlypacked);
    //console.log(ECSignature_0x_raw_1);

    values = [
      Web3Utils.padLeft(OrderParams_0x_2["maker"], 64),
      Web3Utils.padLeft(OrderParams_0x_2["taker"], 64),
      Web3Utils.padLeft(OrderParams_0x_2["makerTokenAddress"], 64),
      Web3Utils.padLeft(OrderParams_0x_2["takerTokenAddress"], 64),
      Web3Utils.padLeft(OrderParams_0x_2["feeRecipient"], 64),
      "0x" +
        Web3Utils.padLeft(new BN(OrderParams_0x_2["makerTokenAmount"]), 64),
      "0x" +
        Web3Utils.padLeft(new BN(OrderParams_0x_2["takerTokenAmount"]), 64),
      "0x" + Web3Utils.padLeft(new BN(OrderParams_0x_2["makerFee"]), 64),
      "0x" + Web3Utils.padLeft(new BN(OrderParams_0x_2["takerFee"]), 64),
      "0x" +
        Web3Utils.padLeft(
          new BN(OrderParams_0x_2["expirationUnixTimestampSec"]),
          64
        ),
      "0x" + Web3Utils.padLeft(new BN(OrderParams_0x_2["salt"]), 64)
    ];

    //console.log(values);
    hashBuff = ethABI.solidityPack(types, values);
    //console.log(hashBuff);
    var sample_order_tightlypacked_2 = ethUtil.bufferToHex(hashBuff);

    bZx
      .tradePositionWith0x(
        OrderHash_bZx_1,
        sample_order_tightlypacked_1 + sample_order_tightlypacked_2.substr(2),
        ECSignature_0x_raw_1 + ECSignature_0x_raw_2.substr(2),
        { from: trader1_account }
      )
      .then(function(tx) {
        console.log(txPrettyPrint(tx, "should trade position with 0x orders"));
        assert.isOk(tx);
        done();
      }),
      function(error) {
        console.error(error);
        assert.isOk(false);
        done();
      };
  });

  (run["should generate 0x V2 orders"]
    ? it
    : it.skip)("should generate 0x V2 orders", async function() {
    
    let tradeData = await oracle.getTradeData.call(
      maker0xV2Token1.address.toLowerCase(),
      loanToken1.address.toLowerCase(),
      utils.toWei(3, "ether").toString()
    );
    //console.log(tradeData);
    
     OrderParams_0xV2_1 = {
      exchangeAddress:
        config["addresses"]["development"]["ZeroEx"]["ExchangeV2"],
      makerAddress: makerOf0xOrder1_account,
      takerAddress: NULL_ADDRESS,
      feeRecipientAddress: NONNULL_ADDRESS,
      senderAddress: NULL_ADDRESS,
      makerAssetAmount: utils.toWei(3, "ether").toString(),
      takerAssetAmount: tradeData[1].toString(),
      makerFee: utils.toWei(0.0005, "ether").toString(),
      takerFee: utils.toWei(0.01, "ether").toString(),
      expirationTimeSeconds: (
        web3.eth.getBlock("latest").timestamp + 86400
      ).toString(),
      salt: generatePseudoRandomSalt().toString(),
      makerAssetData: assetDataUtils.encodeERC20AssetData(
        maker0xV2Token1.address
      ),
      takerAssetData: assetDataUtils.encodeERC20AssetData(loanToken1.address)
    };
    console.log("OrderParams_0xV2_1:");
    console.log(OrderParams_0xV2_1);

    tradeData = await oracle.getTradeData.call(
      maker0xV2Token1.address.toLowerCase(),
      loanToken1.address.toLowerCase(),
      utils.toWei(120, "ether").toString()
    );
    //console.log(tradeData);

    OrderParams_0xV2_2 = {
      exchangeAddress:
        config["addresses"]["development"]["ZeroEx"]["ExchangeV2"],
      makerAddress: makerOf0xOrder2_account,
      takerAddress: NULL_ADDRESS,
      feeRecipientAddress: NONNULL_ADDRESS,
      senderAddress: NULL_ADDRESS,
      makerAssetAmount: utils.toWei(120, "ether").toString(),
      takerAssetAmount: tradeData[1].toString(),
      makerFee: "0",
      takerFee: utils.toWei(0.0025, "ether").toString(),
      expirationTimeSeconds: (
        web3.eth.getBlock("latest").timestamp + 86400
      ).toString(),
      salt: generatePseudoRandomSalt().toString(),
      makerAssetData: assetDataUtils.encodeERC20AssetData(
        maker0xV2Token1.address
      ),
      takerAssetData: assetDataUtils.encodeERC20AssetData(loanToken1.address)
    };
    console.log("OrderParams_0xV2_2:");
    console.log(OrderParams_0xV2_2);

    OrderHash_0xV2_1 = orderHashUtils.getOrderHashHex(OrderParams_0xV2_1);
    OrderHash_0xV2_2 = orderHashUtils.getOrderHashHex(OrderParams_0xV2_2);

    console.log("OrderHash_0xV2_1 with 0x.js: " + OrderHash_0xV2_1);
    console.log("OrderHash_0xV2_2 with 0x.js: " + OrderHash_0xV2_2);

    assert.isOk(
      orderHashUtils.isValidOrderHash(OrderHash_0xV2_1) &&
        orderHashUtils.isValidOrderHash(OrderHash_0xV2_2)
    );

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
    const signer = await provider.getSigner(trader1_account);
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

  (run["should sign and verify 0x V2 orders"]
    ? it
    : it.skip)("should sign and verify 0x V2 orders", async function() {
    ECSignature_0xV2_raw_1 = await signatureUtils.ecSignOrderHashAsync(
      OrderHash_0xV2_1_onchain,
      OrderParams_0xV2_1["makerAddress"],
      "DEFAULT"
    );
    console.log("ECSignature_0xV2_raw_1: " + ECSignature_0xV2_raw_1);

    ECSignature_0xV2_raw_2 = await signatureUtils.ecSignOrderHashAsync(
      OrderHash_0xV2_2_onchain,
      OrderParams_0xV2_2["makerAddress"],
      "DEFAULT"
    );
    console.log("ECSignature_0xV2_raw_2: " + ECSignature_0xV2_raw_2);

    try {
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
    } catch (error) {
      console.error(error);
      assert.isOk(false);
    }
  });

  (run["should trade position with 0x V2 orders"]
    ? it
    : it.skip)("should trade position with 0x V2 orders", async function() {
    //const provider = await (new providers.Web3Provider(web3.currentProvider));

    var iface = new ethers.utils.Interface(BZx.abi);
    var tradeTxData = await iface.functions.tradePositionWith0xV2.encode(
        [OrderHash_bZx_1,
        [OrderParams_0xV2_1_prepped, OrderParams_0xV2_2_prepped],
        [ECSignature_0xV2_raw_1, ECSignature_0xV2_raw_2]]
      );



    try {
      let tx = await web3.eth.sendTransaction({
        data: tradeTxData,
        from: trader1_account,
        to: bZx.address,
        gas: 6721975,
        gasPrice: 20000000000
      });
      console.log(
        await txPrettyPrint(tx, "should trade position with 0x V2 orders")
      );

      //tx = await provider.send("debug_traceTransaction", [ tx.tx, {} ]);
      //return provider.getTransactionReceipt(tx.hash);
      //console.log(JSON.stringify(tx, null, '\t'));

      assert.isOk(tx);
    } catch (error) {
      console.log(error);

      /*var matches = error.message.match(/Transaction: ([^ ]+) exited/);
      console.log(matches[1]);
      provider.send("debug_traceTransaction", [ matches[1], {} ]).then(function(tx) {
      //provider.getTransactionReceipt(error["tx"]).then(function(tx) {
        console.log(JSON.stringify(tx, null, '\t'));
      });*/

      assert.isOk(false);
    }
  });

  (run["should trade position with oracle"]
    ? it
    : it.skip)("should trade position with oracle", function(done) {
    bZx
      .tradePositionWithOracle(OrderHash_bZx_1, interestToken2.address, {
        from: trader1_account
      })
      .then(function(tx) {
        console.log(txPrettyPrint(tx, "should trade position with oracle"));
        assert.isOk(tx);
        done();
      }),
      function(error) {
        console.error(error);
        assert.isOk(false);
        done();
      };
  });

  (run["should change collateral (for trader1)"]
    ? it
    : it.skip)("should change collateral (for trader1)", function(done) {
    bZx
      .changeCollateral(OrderHash_bZx_1, interestToken1.address, {
        from: trader1_account
      })
      .then(function(tx) {
        console.log(
          txPrettyPrint(tx, "should change collateral (for trader1)")
        );
        assert.isOk(tx);
        done();
      }),
      function(error) {
        console.error(error);
        assert.isOk(false);
        done();
      };
  });

  (run["should withdraw position excess"]
    ? it
    : it.skip)("should withdraw position excess", async function() {
    console.log("Before withdraw:");
    console.log(
      await bZx.getPositionOffset.call(OrderHash_bZx_1, trader1_account, {
        from: lender2_account
      })
    );

    try {
      var tx = await bZx.withdrawPosition(
        OrderHash_bZx_1,
        MAX_UINT,
        { from: trader1_account }
      );

      console.log(txPrettyPrint(tx, "should withdraw position excess"));

      console.log("After withdraw:");
      console.log(
        await bZx.getPositionOffset.call(OrderHash_bZx_1, trader1_account, {
          from: lender2_account
        })
      );

      assert.isTrue(true);
    } catch (e) {
      console.error(e);
      utils.ensureException(e);
    }
  });

  (run["should pay lender interest"]
    ? it
    : it.skip)("should pay lender interest", function(done) {
    bZx
      .payInterestForOrder(OrderHash_bZx_1, { from: trader1_account })
      .then(function(tx) {
        console.log(txPrettyPrint(tx, "should pay lender interest"));
        assert.isOk(tx);
        done();
      }),
      function(error) {
        console.error(error);
        assert.isOk(false);
        done();
      };
  });

  (run["should close loan as (lender1/trader1)"]
    ? it
    : it.skip)("should close loan as (lender1/trader1)", function(done) {
    bZx
      .closeLoan(OrderHash_bZx_1, { from: trader1_account })
      .then(function(tx) {
        console.log(
          txPrettyPrint(tx, "should close loan as (lender1/trader1)")
        );
        assert.isOk(tx);
        done();
      }),
      function(error) {
        console.error(error);
        assert.isOk(false);
        done();
      };
  });

  (run["should liquidate position"]
    ? it
    : it.skip)("should liquidate position", function(done) {
    /*bZx.liquidatePosition.estimateGas(
      OrderHash_bZx_1,
      trader1_account,
      {from: makerOf0xOrder1_account}).then(function(tx) {
        //console.log(txPrettyPrint(tx,"should liquidate position"));
        console.log(tx);
      }).catch(function(error) {
        console.error(error);
      });

      assert.isOk(true);
      done();*/

    bZx
      .liquidatePosition(OrderHash_bZx_1, trader1_account, {
        from: makerOf0xOrder1_account
      })
      .then(function(tx) {
        console.log(txPrettyPrint(tx, "should liquidate position"));
        assert.isOk(tx);
        done();
      })
      .catch(function(error) {
        console.error(error);
        assert.isOk(false);
        done();
      });
  });

  (run["should force close loan"]
    ? it
    : it.skip)("should force close loan", function(done) {
    bZx
      .forceCloseLoan(OrderHash_bZx_1, trader1_account, { from: owner_account })
      .then(function(tx) {
        console.log(txPrettyPrint(tx, "should force close loan"));
        assert.isOk(tx);
        done();
      })
      .catch(function(error) {
        console.error(error);
        assert.isOk(false);
        done();
      });
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

  function printBalances(accounts) {
    accounts.forEach(function(ac, i) {
      console.log(
        accounts[i],
        ": ",
        web3.fromWei(web3.eth.getBalance(ac), "ether").toNumber()
      );
    });
  }

  function getWeiBalance(account) {
    return web3.eth.getBalance(account).toNumber();
  }

  function encodeFunctionTxData(functionName, types, args) {
    var fullName = functionName + "(" + types.join() + ")";
    var signature = CryptoJS.SHA3(fullName, { outputLength: 256 })
      .toString(CryptoJS.enc.Hex)
      .slice(0, 8);
    var dataHex = signature + coder.encodeParams(types, args);

    return dataHex;
  }

  function toHex(d) {
    return ("0" + Number(d).toString(16)).slice(-2).toUpperCase();
  }
});
