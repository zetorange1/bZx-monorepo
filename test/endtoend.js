
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
let B0x = artifacts.require("B0x");
let B0xToken = artifacts.require("B0xToken");
let ERC20 = artifacts.require("ERC20"); // for testing with any ERC20 token
let BaseToken = artifacts.require("BaseToken");
let Exchange0x = artifacts.require("Exchange_Interface");

let currentGasPrice = 20000000000; // 20 gwei
let currentEthPrice = 1000; // USD

const MAX_UINT = new BigNumber(2).pow(256).minus(1);

const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";
const NONNULL_ADDRESS = "0x0000000000000000000000000000000000000001";

contract('B0xTest', function(accounts) {
  var vault;
  var b0x;
  var oracle;
  var b0x_token;
  var b0xTo0x;

  var test_tokens = [];

  var gasRefundEvent;
  var logErrorEvent0x;

  var tx_obj;

  var zrx_token;
  var exchange_0x;

  var OrderParams_b0x;
  var OrderHash_b0x;
  var ECSignature_raw;
  var ECSignature;

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

  before('watch events', function () {
    gasRefundEvent = oracle.MarginCalc();
    logErrorEvent0x = b0xTo0x.LogErrorUint();
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

  it("should verify approval", async function() {
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

  it("should generate loanOrderHash (as lender)", function(done) {

    OrderParams_b0x = {
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
      "salt": B0xJS.generatePseudoRandomSalt().toString()
    };
    console.log(OrderParams_b0x);
    let expectedHash = B0xJS.getLoanOrderHashHex(OrderParams_b0x);
    console.log("js hash: "+expectedHash);
    b0x.getLoanOrderHash.call(
      [
        OrderParams_b0x["makerAddress"],
        OrderParams_b0x["loanTokenAddress"],
        OrderParams_b0x["interestTokenAddress"],
        OrderParams_b0x["collateralTokenAddress"],
        OrderParams_b0x["feeRecipientAddress"],
        OrderParams_b0x["oracleAddress"]
      ],
      [
        new BN(OrderParams_b0x["loanTokenAmount"]),
        new BN(OrderParams_b0x["interestAmount"]),
        new BN(OrderParams_b0x["initialMarginAmount"]),
        new BN(OrderParams_b0x["maintenanceMarginAmount"]),
        new BN(OrderParams_b0x["lenderRelayFee"]),
        new BN(OrderParams_b0x["traderRelayFee"]),
        new BN(OrderParams_b0x["expirationUnixTimestampSec"]),
        new BN(OrderParams_b0x["salt"])
    ]).then(function(orderHash) {
      console.log("sol hash: "+orderHash);
      OrderHash_b0x = orderHash;
      assert.equal(orderHash, expectedHash, "expectedHash should equal returned loanOrderHash");
      done();
    }, function(error) {
      console.error(error);
      assert.equal(true, false);
      done();
    });
  });

  it("should sign and verify orderHash", function(done) {
    const nodeVersion = web3.version.node;
    const isParityNode = _.includes(nodeVersion, 'Parity');
    const isTestRpc = _.includes(nodeVersion, 'TestRPC');

    if (isParityNode || isTestRpc) {
      // Parity and TestRpc nodes add the personalMessage prefix itself
      ECSignature_raw = web3.eth.sign(lender1_account, OrderHash_b0x);
    }
    else {
      var orderHashBuff = ethUtil.toBuffer(OrderHash_b0x);
      var msgHashBuff = ethUtil.hashPersonalMessage(orderHashBuff);
      var msgHashHex = ethUtil.bufferToHex(msgHashBuff);
      ECSignature_raw = web3.eth.sign(lender1_account, msgHashHex);
    }

    b0x.isValidSignature.call(
      lender1_account, // lender
      OrderHash_b0x,
      ECSignature_raw
    ).then(function(result) {
      assert.isOk(result);
      done();
    }, function(error) {
      console.error(error);
      assert.isOk(false);
      done();
    });
  });

  it("should take sample loan order as trader", function(done) {
    b0x.takeLoanOrderAsTrader(
      [
        OrderParams_b0x["makerAddress"],
        OrderParams_b0x["loanTokenAddress"],
        OrderParams_b0x["interestTokenAddress"],
        OrderParams_b0x["collateralTokenAddress"],
        OrderParams_b0x["feeRecipientAddress"],
        OrderParams_b0x["oracleAddress"]
      ],
      [
        new BN(OrderParams_b0x["loanTokenAmount"]),
        new BN(OrderParams_b0x["interestAmount"]),
        new BN(OrderParams_b0x["initialMarginAmount"]),
        new BN(OrderParams_b0x["maintenanceMarginAmount"]),
        new BN(OrderParams_b0x["lenderRelayFee"]),
        new BN(OrderParams_b0x["traderRelayFee"]),
        new BN(OrderParams_b0x["expirationUnixTimestampSec"]),
        new BN(OrderParams_b0x["salt"])
      ],
      collateralToken1.address,
      web3.toWei(12.3, "ether"),
      ECSignature_raw,
      {from: trader1_account, gas: 1000000, gasPrice: web3.toWei(30, "gwei")}).then(function(tx) {
        //console.log(tx);
        tx_obj = tx;
        return gasRefundEvent.get();
      }).then(function(caughtEvents) {
        console.log(txPrettyPrint(tx_obj,"should take sample loan order as trader",caughtEvents));
        assert.isOk(tx_obj);
        done();
      }, function(error) {
        console.error("error: "+error);
        assert.isOk(false);
        done();
      });
  });

  it("should generate 0x order", async function() {
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

  it("should sign and verify 0x order", function(done) {
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

  it("should open 0x trade with borrowed funds", function(done) {
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
    b0x.open0xTrade(
      OrderHash_b0x,
      sample_order_tightlypacked + ECSignature_0x_raw.substring(2),
      {from: trader1_account}).then(function(tx) {
        //console.log(tx);
        tx_obj = tx;
        return gasRefundEvent.get();
      }).then(function(caughtEvents) {
        console.log(txPrettyPrint(tx_obj,"should open 0x trade with borrowed funds",caughtEvents));
        assert.isOk(true);
        done();
      }, function(error) {
        console.error(error);
        assert.isOk(false);
        done();
      });
  });


  /*it("should test LoanOrder bytes", function(done) {
    b0x.getLoanOrderByteData.call(
      OrderHash_b0x,
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


  it("should test Loan bytes", function(done) {
    b0x.getLoanByteData.call(
      OrderHash_b0x,
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


  it("should test Trade bytes", function(done) {
    b0x.getTradeByteData.call(
      OrderHash_b0x,
      trader1_account,
      {from: trader1_account, gas: 5000000, gasPrice: web3.toWei(8, "gwei")}).then(function(bts) {
        console.log(bts);
        b0x.getTradeLog(
          bts,
          {from: trader1_account, gas: 5000000, gasPrice: web3.toWei(20, "gwei")}).then(function(tx) {
            tx_obj = tx;
            return gasRefundEvent.get();
          }).then(function(caughtEvents) {
            console.log(txPrettyPrint(tx_obj,"should test Trade bytes",caughtEvents));
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
