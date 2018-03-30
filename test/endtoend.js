

// set configuration and tests to run
var run = {
  "debug mode": true,
  
  "should check token registry": false,
  "should check oracle registry": false,
  "should verify approval": false,

  "should generate loanOrderHash (as lender1)": true,
  "should sign and verify orderHash (as lender1)": true,
  "should take sample loan order (as trader1)": true,
  "should get loan orders (for trader 1)": false,
  "should get loan positions (for trader 1)": false,

  "should generate loanOrderHash (as trader2)": false,
  "should sign and verify orderHash (as trader2)": false,
  "should take sample loan order (as lender2)": false,

  "should generate 0x order": true,
  "should sign and verify 0x order": true,
  "should open 0x position with borrowed funds": true,
  /*"should test LoanOrder bytes": false,
  "should test Loan bytes": false,
  "should test Position bytes": false,*/
};


const BigNumber = require('bignumber.js');
const BN = require('bn.js');
const ethABI = require('ethereumjs-abi');
const ethUtil = require('ethereumjs-util');

import Web3Utils from 'web3-utils';
import B0xJS from 'b0x.js'
import { ZeroEx } from '0x.js';

var config = require('../../config/secrets.js');

let B0xVault = artifacts.require("B0xVault");
let B0xTo0x = artifacts.require("B0xTo0x");
let B0xOracle = artifacts.require("B0xOracle");
let B0xOracleRegistry = artifacts.require("OracleRegistry");
let B0xTokenRegistry = artifacts.require("TokenRegistry");
let B0x = artifacts.require("B0x");
let B0xToken = artifacts.require("B0xToken");
let ERC20 = artifacts.require("ERC20"); // for testing with any ERC20 token
let BaseToken = artifacts.require("BaseToken");
let Exchange0x = artifacts.require("Exchange_Interface");

let currentGasPrice = 20000000000; // 20 gwei
let currentEthPrice = 1000; // USD

const MAX_UINT = new BigNumber(2).pow(256).minus(1).toString();

const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";
const NONNULL_ADDRESS = "0x0000000000000000000000000000000000000001";

contract('B0xTest', function(accounts) {
  var vault;
  var b0x;
  var oracle;
  var oracle_registry;
  var b0x_token;
  var b0xTo0x;
  var token_registry;

  var test_tokens = [];

  var gasRefundEvent;
  //var logErrorEvent0x;

  var tx_obj;

  var zrx_token;
  var exchange_0x;

  var OrderParams_b0x_1;
  var OrderHash_b0x_1;
  var ECSignature_raw_1;
  var ECSignature_1;

  var OrderParams_b0x_2;
  var OrderHash_b0x_2;
  var ECSignature_raw_2;
  var ECSignature_2;


  var OrderParams_0x;
  var OrderHash_0x;
  var ECSignature_0x_raw;
  var ECSignature_0x;

  // account roles
  var owner_account = accounts[0]; // owner/contract creator, holder of all tokens
  var lender1_account = accounts[1]; // lender 1
  var trader1_account = accounts[2]; // trader 1
  var lender2_account = accounts[3]; // lender 2
  var trader2_account = accounts[4]; // trader 2
  var makerOf0xOrder_account = accounts[7]; // maker of 0x order
  var relay1_account = accounts[9]; // relay 1

  var loanToken1;
  var loanToken2;
  var collateralToken1;
  var collateralToken2;
  var interestToken1;
  var interestToken2;
  var maker0xToken1;

  //printBalances(accounts);

  before(function() {
    new Promise((resolve, reject) => {
      console.log("b0x_tester :: before balance: "+web3.eth.getBalance(owner_account));
      const gasPrice = new BigNumber(web3.toWei(2, 'gwei'));
      resolve(true);
    });
  });

  before('retrieve all deployed contracts', async function () {
    await Promise.all([
      (b0x_token = await B0xToken.deployed()),
      (vault = await B0xVault.deployed()),
      (b0xTo0x = await B0xTo0x.deployed()),
      (oracle_registry = await B0xOracleRegistry.deployed()),
      (token_registry = await B0xTokenRegistry.deployed()),
      (b0x = await B0x.deployed()),
      (oracle = await B0xOracle.deployed()),

      (zrx_token = await ERC20.at(config["protocol"]["development"]["ZeroEx"]["ZRXToken"])),
      (exchange_0x = await Exchange0x.at(config["protocol"]["development"]["ZeroEx"]["Exchange"])),
    ]);
  });

  before('retrieve all deployed test tokens', async function () {
    for (var i = 0; i < 10; i++) {
      test_tokens[i] = await artifacts.require("TestToken"+i).deployed();
      console.log("Test Token "+i+" retrieved: "+test_tokens[i].address);
    }
  });

  before('handle token transfers and approvals', async function () {
    loanToken1 = test_tokens[0];
    loanToken2 = test_tokens[1];
    collateralToken1 = test_tokens[2];
    collateralToken2 = test_tokens[3];
    interestToken1 = test_tokens[4];
    interestToken2 = test_tokens[5];
    maker0xToken1 = test_tokens[6];

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
      (await interestToken2.transfer(trader2_account, web3.toWei(1000000, "ether"), {from: owner_account})),
      (await interestToken1.approve(vault.address, MAX_UINT, {from: trader1_account})),
      (await interestToken2.approve(vault.address, MAX_UINT, {from: trader2_account})),

      (await zrx_token.transfer(trader1_account, web3.toWei(10000, "ether"), {from: owner_account})),
      (await zrx_token.transfer(trader2_account, web3.toWei(10000, "ether"), {from: owner_account})),
      (await zrx_token.approve(b0xTo0x.address, MAX_UINT, {from: trader1_account})),
      (await zrx_token.approve(b0xTo0x.address, MAX_UINT, {from: trader2_account})),

      (await maker0xToken1.transfer(makerOf0xOrder_account, web3.toWei(10000, "ether"), {from: owner_account})),
      (await maker0xToken1.approve(config["protocol"]["development"]["ZeroEx"]["TokenTransferProxy"], MAX_UINT, {from: makerOf0xOrder_account})),
    ]);
  });

  before('set b0x debug mode', async function () {
    await b0x.setDebugMode(run["debug mode"], {from: owner_account});
  });

  before('watch events', function () {
    gasRefundEvent = oracle.GasRefund();
    //logErrorEvent0x = b0xTo0x.LogErrorUint();
  });

  after(function() {
    new Promise((resolve, reject) => {
      console.log("b0x_tester :: after balance: "+web3.eth.getBalance(owner_account));
    });
  });

  /*
  //setup event listener
  var event = b0x.LogErrorText(function(error, result) {
      if (!error)
          console.log(result);
  });
  */


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


  (run["should check oracle registry"] ? it : it.skip)("should check oracle registry", async function() {
    // return array of arrays: address[], uint[], string
    var data = await oracle_registry.getOracleList.call();
    //console.log(data);
    var namePos = 0;

    for(var i=0; i < data[0].length; i++) {
      data[1][i] = data[1][i].toNumber();
      console.log("Oracle "+i+" name: "+data[2].substr(namePos,data[1][i]));
      namePos = namePos+data[1][i];
      
      console.log("Oracle "+i+" address: "+data[0][i]);
    }
    
    assert.isOk(true);
  });

  (run["should verify approval"] ? it : it.skip)("should verify approval", async function() {
    var balance = await loanToken1.balanceOf.call(lender1_account);
    console.log("loanToken1 lender1_account: "+balance);
    
    var allowance = await loanToken1.allowance.call(lender1_account, vault.address);
    console.log("loanToken1 allowance: "+allowance);


    balance = await collateralToken1.balanceOf.call(trader1_account);
    console.log("collateralToken1 trader1_account: "+balance);
    
    allowance = await collateralToken1.allowance.call(trader1_account, vault.address);
    console.log("collateralToken1 allowance: "+allowance);


    balance = await interestToken1.balanceOf.call(trader1_account);
    console.log("interestToken1 trader1_account: "+balance);
    
    allowance = await interestToken1.allowance.call(trader1_account, vault.address);
    console.log("interestToken1 allowance: "+allowance);

    assert.isOk(true);
  });


  (run["should generate loanOrderHash (as lender1)"] ? it : it.skip)("should generate loanOrderHash (as lender1)", function(done) {

    OrderParams_b0x_1 = {
      "b0xAddress": b0x.address,
      "makerAddress": lender1_account, // lender
      "loanTokenAddress": loanToken1.address,
      "interestTokenAddress": interestToken1.address,
      "collateralTokenAddress": NULL_ADDRESS,
      "feeRecipientAddress": NULL_ADDRESS,
      "oracleAddress": oracle.address,
      "loanTokenAmount": web3.toWei(100000, "ether").toString(),
      "interestAmount": web3.toWei(2, "ether").toString(), // 2 token units per day
      "initialMarginAmount": "50", // 50%
      "maintenanceMarginAmount": "25", // 25%
      "lenderRelayFee": web3.toWei(0.001, "ether").toString(),
      "traderRelayFee": web3.toWei(0.0015, "ether").toString(),
      "expirationUnixTimestampSec": (web3.eth.getBlock("latest").timestamp+86400).toString(),
      "makerRole": "0", // 0=lender, 1=trader
      "salt": B0xJS.generatePseudoRandomSalt().toString()
    };
    console.log(OrderParams_b0x_1);
    let expectedHash = B0xJS.getLoanOrderHashHex(OrderParams_b0x_1);
    console.log("js hash: "+expectedHash);
    b0x.getLoanOrderHash.call(
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
    ]).then(function(orderHash) {
      console.log("sol hash: "+orderHash);
      OrderHash_b0x_1 = orderHash;
      assert.equal(orderHash, expectedHash, "expectedHash should equal returned loanOrderHash");
      done();
    }, function(error) {
      console.error(error);
      assert.equal(true, false);
      done();
    });
  });

  (run["should sign and verify orderHash (as lender1)"] ? it : it.skip)("should sign and verify orderHash (as lender1)", function(done) {
    const nodeVersion = web3.version.node;
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

    b0x.isValidSignature.call(
      lender1_account, // lender
      OrderHash_b0x_1,
      ECSignature_raw_1
    ).then(function(result) {
      assert.isOk(result);
      done();
    }, function(error) {
      console.error(error);
      assert.isOk(false);
      done();
    });
  });

  (run["should take sample loan order (as trader1)"] ? it : it.skip)("should take sample loan order (as trader1)", function(done) {
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
        //console.log(tx);
        tx_obj = tx;
        return gasRefundEvent.get();
      }).then(function(caughtEvents) {
        console.log(txPrettyPrint(tx_obj,"should take sample loan order (as trader1)",caughtEvents));
        assert.isOk(tx_obj);
        done();
      }, function(error) {
        console.error("error: "+error);
        assert.isOk(false);
        done();
      });
  });

(run["should get loan orders (for trader 1)"] ? it : it.skip)("should get loan orders (for trader 1)", async function() {
    // return array of arrays: address[], uint[], string
    var data = await b0x.getOrders.call(
      trader1_account,
      0, // starting item
      10 // max number of items returned
    );
    console.log(data);

    data = data.substr(2); // remove 0x from front
    const itemCount = 14;
    const objCount = data.length / 64 / itemCount;
    var orders = [];

    if (objCount % 1 != 0) { // must be a whole number
        console.error("error: data length invalid!");
        assert.isOk(false);
    }
    else {
      var orderObjArray = data.match(new RegExp('.{1,' + (itemCount * 64) + '}', 'g'));
      //console.log("orderObjArray.length: "+orderObjArray.length);
      for(var i=0; i < orderObjArray.length; i++) {
        var params = orderObjArray[i].match(new RegExp('.{1,' + 64 + '}', 'g'));
        //console.log(i+": params.length: "+params.length);
        orders.push({
          maker: "0x"+params[0].substr(24),
          loanTokenAddress: "0x"+params[1].substr(24),
          interestTokenAddress: "0x"+params[2].substr(24),
          collateralTokenAddress: "0x"+params[3].substr(24),
          feeRecipientAddress: "0x"+params[4].substr(24),
          oracleAddress: "0x"+params[5].substr(24),
          loanTokenAmount: parseInt("0x"+params[6]),
          interestAmount: parseInt("0x"+params[7]),
          initialMarginAmount: parseInt("0x"+params[8]),
          maintenanceMarginAmount: parseInt("0x"+params[9]),
          lenderRelayFee: parseInt("0x"+params[10]),
          traderRelayFee: parseInt("0x"+params[11]),
          expirationUnixTimestampSec: parseInt("0x"+params[12]),
          loanOrderHash: "0x"+params[13]
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

  (run["should get loan positions (for trader 1)"] ? it : it.skip)("should get loan positions (for trader 1)", async function() {
    // return array of arrays: address[], uint[], boolean
    var data = await b0x.getLoanPositions.call(
      trader1_account,
      0, // starting item
      10 // max number of items returned
    );
    console.log(data);

    data = data.substr(2); // remove 0x from front
    const itemCount = 9;
    const objCount = data.length / 64 / itemCount;
    var loanPositions = [];

    if (objCount % 1 != 0) { // must be a whole number
        console.error("error: data length invalid!");
        assert.isOk(false);
    }
    else {
      var loanPositionObjArray = data.match(new RegExp('.{1,' + (itemCount * 64) + '}', 'g'));
      console.log("loanPositionObjArray.length: "+loanPositionObjArray.length);
      for(var i=0; i < loanPositionObjArray.length; i++) {
        var params = loanPositionObjArray[i].match(new RegExp('.{1,' + 64 + '}', 'g'));
        console.log(i+": params.length: "+params.length);
        loanPositions.push({
          lender: "0x"+params[0].substr(24),
          trader: "0x"+params[1].substr(24),
          collateralTokenAddressFilled: "0x"+params[2].substr(24),
          positionTokenAddressFilled: "0x"+params[3].substr(24),
          loanTokenAmountFilled: parseInt("0x"+params[4]),
          collateralTokenAmountFilled: parseInt("0x"+params[5]),
          positionTokenAmountFilled: parseInt("0x"+params[6]),
          loanStartUnixTimestampSec: parseInt("0x"+params[7]),
          active: parseInt("0x"+params[8])
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

  (run["should generate loanOrderHash (as trader2)"] ? it : it.skip)("should generate loanOrderHash (as trader2)", function(done) {

    OrderParams_b0x_2 = {
      "b0xAddress": b0x.address,
      "makerAddress": trader2_account, // lender
      "loanTokenAddress": loanToken2.address,
      "interestTokenAddress": interestToken2.address,
      "collateralTokenAddress": collateralToken2.address,
      "feeRecipientAddress": NULL_ADDRESS,
      "oracleAddress": oracle.address,
      "loanTokenAmount": web3.toWei(100000, "ether").toString(),
      "interestAmount": web3.toWei(2, "ether").toString(), // 2 token units per day
      "initialMarginAmount": "50", // 50%
      "maintenanceMarginAmount": "25", // 25%
      "lenderRelayFee": web3.toWei(0.001, "ether").toString(),
      "traderRelayFee": web3.toWei(0.0015, "ether").toString(),
      "expirationUnixTimestampSec": (web3.eth.getBlock("latest").timestamp+86400).toString(),
      "makerRole": "1", // 0=lender, 1=trader
      "salt": B0xJS.generatePseudoRandomSalt().toString()
    };
    console.log(OrderParams_b0x_2);
    let expectedHash = B0xJS.getLoanOrderHashHex(OrderParams_b0x_2);
    console.log("js hash: "+expectedHash);
    b0x.getLoanOrderHash.call(
      [
        OrderParams_b0x_2["makerAddress"],
        OrderParams_b0x_2["loanTokenAddress"],
        OrderParams_b0x_2["interestTokenAddress"],
        OrderParams_b0x_2["collateralTokenAddress"],
        OrderParams_b0x_2["feeRecipientAddress"],
        OrderParams_b0x_2["oracleAddress"]
      ],
      [
        new BN(OrderParams_b0x_2["loanTokenAmount"]),
        new BN(OrderParams_b0x_2["interestAmount"]),
        new BN(OrderParams_b0x_2["initialMarginAmount"]),
        new BN(OrderParams_b0x_2["maintenanceMarginAmount"]),
        new BN(OrderParams_b0x_2["lenderRelayFee"]),
        new BN(OrderParams_b0x_2["traderRelayFee"]),
        new BN(OrderParams_b0x_2["expirationUnixTimestampSec"]),
        new BN(OrderParams_b0x_2["makerRole"]),
        new BN(OrderParams_b0x_2["salt"])
    ]).then(function(orderHash) {
      console.log("sol hash: "+orderHash);
      OrderHash_b0x_2 = orderHash;
      assert.equal(orderHash, expectedHash, "expectedHash should equal returned loanOrderHash");
      done();
    }, function(error) {
      console.error(error);
      assert.equal(true, false);
      done();
    });
  });

  (run["should sign and verify orderHash (as trader2)"] ? it : it.skip)("should sign and verify orderHash (as trader2)", function(done) {
    const nodeVersion = web3.version.node;
    const isParityNode = _.includes(nodeVersion, 'Parity');
    const isTestRpc = _.includes(nodeVersion, 'TestRPC');

    if (isParityNode || isTestRpc) {
      // Parity and TestRpc nodes add the personalMessage prefix itself
      ECSignature_raw_2 = web3.eth.sign(trader2_account, OrderHash_b0x_2);
    }
    else {
      var orderHashBuff = ethUtil.toBuffer(OrderHash_b0x_2);
      var msgHashBuff = ethUtil.hashPersonalMessage(orderHashBuff);
      var msgHashHex = ethUtil.bufferToHex(msgHashBuff);
      ECSignature_raw_2 = web3.eth.sign(trader2_account, msgHashHex);
    }

    b0x.isValidSignature.call(
      trader2_account, // lender
      OrderHash_b0x_2,
      ECSignature_raw_2
    ).then(function(result) {
      assert.isOk(result);
      done();
    }, function(error) {
      console.error(error);
      assert.isOk(false);
      done();
    });
  });

  (run["should take sample loan order (as lender2)"] ? it : it.skip)("should take sample loan order (as lender2)", function(done) {
    b0x.takeLoanOrderAsLender(
      [
        OrderParams_b0x_2["makerAddress"],
        OrderParams_b0x_2["loanTokenAddress"],
        OrderParams_b0x_2["interestTokenAddress"],
        OrderParams_b0x_2["collateralTokenAddress"],
        OrderParams_b0x_2["feeRecipientAddress"],
        OrderParams_b0x_2["oracleAddress"]
      ],
      [
        new BN(OrderParams_b0x_2["loanTokenAmount"]),
        new BN(OrderParams_b0x_2["interestAmount"]),
        new BN(OrderParams_b0x_2["initialMarginAmount"]),
        new BN(OrderParams_b0x_2["maintenanceMarginAmount"]),
        new BN(OrderParams_b0x_2["lenderRelayFee"]),
        new BN(OrderParams_b0x_2["traderRelayFee"]),
        new BN(OrderParams_b0x_2["expirationUnixTimestampSec"]),
        new BN(OrderParams_b0x_2["makerRole"]),
        new BN(OrderParams_b0x_2["salt"])
      ],
      ECSignature_raw_2,
      {from: lender2_account, gas: 1000000, gasPrice: web3.toWei(30, "gwei")}).then(function(tx) {
        //console.log(tx);
        tx_obj = tx;
        return gasRefundEvent.get();
      }).then(function(caughtEvents) {
        console.log(txPrettyPrint(tx_obj,"should take sample loan order (as lender2)",caughtEvents));
        assert.isOk(tx_obj);
        done();
      }, function(error) {
        console.error("error: "+error);
        assert.isOk(false);
        done();
      });
  });




  (run["should generate 0x order"] ? it : it.skip)("should generate 0x order", async function() {
    OrderParams_0x = {
      "exchangeContractAddress": config["protocol"]["development"]["ZeroEx"]["Exchange"],
      "expirationUnixTimestampSec": (web3.eth.getBlock("latest").timestamp+86400).toString(),
      "feeRecipient": NULL_ADDRESS, //"0x1230000000000000000000000000000000000000",
      "maker": makerOf0xOrder_account,
      "makerFee": web3.toWei(0.002, "ether").toString(),
      "makerTokenAddress": maker0xToken1.address,
      "makerTokenAmount": web3.toWei(100, "ether").toString(),
      "salt": B0xJS.generatePseudoRandomSalt().toString(),
      "taker": NULL_ADDRESS,
      "takerFee": web3.toWei(0.0013, "ether").toString(),
      "takerTokenAddress": loanToken1.address,
      "takerTokenAmount": web3.toWei(20.1, "ether").toString(),
    };
    console.log(OrderParams_0x);

    OrderHash_0x = ZeroEx.getOrderHashHex(OrderParams_0x);

    assert.isOk(true);
  });

  (run["should sign and verify 0x order"] ? it : it.skip)("should sign and verify 0x order", function(done) {
    const nodeVersion = web3.version.node;
    const isParityNode = _.includes(nodeVersion, 'Parity');
    const isTestRpc = _.includes(nodeVersion, 'TestRPC');
    //console.log("isParityNode:" + isParityNode);
    //console.log("isTestRpc:" + isTestRpc);

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

    exchange_0x.isValidSignature.call(
      makerOf0xOrder_account,
      OrderHash_0x,
      ECSignature_0x["v"],
      ECSignature_0x["r"],
      ECSignature_0x["s"]
    ).then(function(result) {
      assert.isOk(result);
      done();
    }, function(error) {
      console.error(error);
      assert.isOk(false);
      done();
    });
  });

  (run["should open 0x position with borrowed funds"] ? it : it.skip)("should open 0x position with borrowed funds", function(done) {
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

    var textEvents;
    b0x.tradePositionWith0x(
      OrderHash_b0x_1,
      sample_order_tightlypacked,
      ECSignature_0x_raw,
      {from: trader1_account}).then(function(tx) {
        //console.log(tx);
        tx_obj = tx;
        return gasRefundEvent.get();
      }).then(function(caughtEvents) {
        console.log(txPrettyPrint(tx_obj,"should open 0x position with borrowed funds",caughtEvents));
        assert.isOk(true);
        done();
      }, function(error) {
        console.error(error);
        assert.isOk(false);
        done();
      });
  });


  /*(run["should test LoanOrder bytes"] ? it : it.skip)("should test LoanOrder bytes", function(done) {
    b0x.getLoanOrderByteData.call(
      OrderHash_b0x_1,
      {from: trader1_account, gas: 5000000, gasPrice: web3.toWei(8, "gwei")}).then(function(bts) {
        console.log(bts);
        b0x.getLoanOrderLog(
          bts,
          {from: trader1_account, gas: 5000000, gasPrice: web3.toWei(10, "gwei")}).then(function(tx) {
            tx_obj = tx;
            return gasRefundEvent.get();
          }).then(function(caughtEvents) {
            console.log(txPrettyPrint(tx_obj,"should test LoanOrder bytes",caughtEvents));
            assert.isOk(tx_obj);
            done();
          }, function(error) {
            console.error(error);
            assert.isOk(false);
            done();
          });
      });
  });


  (run["should test Loan bytes"] ? it : it.skip)("should test Loan bytes", function(done) {
    b0x.getLoanByteData.call(
      OrderHash_b0x_1,
      trader1_account,
      {from: trader1_account, gas: 5000000, gasPrice: web3.toWei(20, "gwei")}).then(function(bts) {
        console.log(bts);
        b0x.getLoanLog(
          bts,
          {from: trader1_account, gas: 5000000, gasPrice: web3.toWei(22, "gwei")}).then(function(tx) {
            tx_obj = tx;
            return gasRefundEvent.get();
          }).then(function(caughtEvents) {
            console.log(txPrettyPrint(tx_obj,"should test LoanOrder bytes",caughtEvents));
            assert.isOk(tx_obj);
            done();
          }, function(error) {
            console.error(error);
            assert.isOk(false);
            done();
          });
      });
  });


  (run["should test Position bytes"] ? it : it.skip)("should test Position bytes", function(done) {
    b0x.getPositionByteData.call(
      OrderHash_b0x_1,
      trader1_account,
      {from: trader1_account, gas: 5000000, gasPrice: web3.toWei(8, "gwei")}).then(function(bts) {
        console.log(bts);
        b0x.getPositionLog(
          bts,
          {from: trader1_account, gas: 5000000, gasPrice: web3.toWei(20, "gwei")}).then(function(tx) {
            tx_obj = tx;
            return gasRefundEvent.get();
          }).then(function(caughtEvents) {
            console.log(txPrettyPrint(tx_obj,"should test Position bytes",caughtEvents));
            assert.isOk(tx_obj);
            done();
          }, function(error) {
            console.error(error);
            assert.isOk(false);
            done();
          });
      });
  });*/




  function txPrettyPrint(tx, desc, events) {
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
      tx.logs = tx.logs.concat(events);

      if (tx.logs.length > 0) {
        ret = ret + "  LOGS --> "+"\n";
        for (var i=0; i < tx.logs.length; i++) {
          ret = ret + "  "+i+": "+tx.logs[i].event+" "+JSON.stringify(tx.logs[i].args);
          if (tx.logs[i].event == "GasRefund") {
            ret = ret + " -> Refund: "+(tx.logs[i].args.refundAmount/1e18*currentEthPrice).toFixed(2)+"USD @ "+currentEthPrice+"USD/ETH)\n";
          }
          else {
            ret = ret + "\n";
          }


        }
      }
    }
    return ret;
  }

  function printBalances(accounts) {
    accounts.forEach(function(ac, i) {
      console.log(accounts[i],": ", web3.fromWei(web3.eth.getBalance(ac), 'ether').toNumber());
    });
  }

  function getWeiBalance(account) {
    return web3.eth.getBalance(account).toNumber();
  }

  function encodeFunctionTxData(functionName, types, args) {
    var fullName = functionName + '(' + types.join() + ')';
    var signature = CryptoJS.SHA3(fullName, { outputLength: 256 }).toString(CryptoJS.enc.Hex).slice(0, 8);
    var dataHex = signature + coder.encodeParams(types, args);

    return dataHex;
  }
});
