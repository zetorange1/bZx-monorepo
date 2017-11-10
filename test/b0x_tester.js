const BigNumber = require('bignumber.js');
const BN = require('bn.js');
const ethUtil = require('ethereumjs-util');
//const TestRPC = require('ethereumjs-testrpc');
//const Transaction = require('ethereumjs-tx');
//const coder = require('web3/lib/solidity/coder');
//const CryptoJS = require('crypto-js');
const Web3 = require('web3');

//var provider = TestRPC.provider();
//let web3 = new Web3(provider);
let web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"))


import { B0xJS } from '../src/B0xJS.js';
// require('../src/B0x.js');


let B0xVault = artifacts.require("./B0xVault.sol");
let B0xPrices = artifacts.require("./B0xPrices.sol");
let B0xSol = artifacts.require("./B0x.sol");
let LOANToken = artifacts.require("./LOANToken.sol");
let ERC20 = artifacts.require("./ERC20.sol"); // for testing with any ERC20 token

let TomToken = artifacts.require("./TomToken.sol");
let BeanToken = artifacts.require("./BeanToken.sol");

let testDepositAmount = web3.toWei(0.001, "ether");
let expected_LOANTokenTotalSupply = web3.toWei(20000000, "ether"); // 20MM LOAN

//let DexA = artifacts.require("./DexA.sol");
//let DexB = artifacts.require("./DexB.sol");
//let DexC = artifacts.require("./DexC.sol");

/*
let test_wallets = [
  "0x5409ED021D9299bf6814279A6A1411A7e866A631",
  "0x6Ecbe1DB9EF729CBe972C83Fb886247691Fb6beb",
  "0xE36Ea790bc9d7AB70C55260C66D52b1eca985f84",
  "0xE834EC434DABA538cd1b9Fe1582052B880BD7e63",
  "0x78dc5D2D739606d31509C31d654056A45185ECb6",
  "0xA8dDa8d7F5310E4A9E24F8eBA77E091Ac264f872",
  "0x06cEf8E666768cC40Cc78CF93d9611019dDcB628",
  "0x4404ac8bd8F9618D27Ad2f1485AA1B2cFD82482D",
  "0x7457d5E02197480Db681D3fdF256c7acA21bDc12",
  "0x91c987bf62D25945dB517BDAa840A6c661374402"
];
Mnemonic: concert load couple harbor equip island argue ramp clarify fence smart topic
*/

let account_privatekeys = [
  "f2f48ee19680706196e2e339e5da3491186e0c4c5030670656b0e0164837257d",
  "5d862464fe9303452126c8bc94274b8c5f9874cbd219789b3eb2128075a76f72",
  "df02719c4df8b9b8ac7f551fcb5d9ef48fa27eef7a66453879f4d8fdc6e78fb1",
  "ff12e391b79415e941a94de3bf3a9aee577aed0731e297d5cfa0b8a1e02fa1d0",
  "752dd9cf65e68cfaba7d60225cbdbc1f4729dd5e5507def72815ed0d8abc6249",
  "efb595a0178eb79a8df953f87c5148402a224cdf725e88c0146727c6aceadccd",
  "83c6d2cc5ddcf9711a6d59b417dc20eb48afd58d45290099e5987e3d768f328f",
  "bb2d3f7c9583780a7d3904a2f55d792707c345f21de1bacb2d389934d82796b2",
  "b2fd4d29c1390b71b8795ae81196bfd60293adf99f9d32a0aff06288fcdac55f",
  "23cb7121166b9a2f93ae0b7c05bde02eae50d64449b2cbb42bc84e9d38d6cc89"
];

contract('B0xTest', function(accounts) {
  var vault;
  var broker;
  var prices;
  var loan_token;
  var tom_token;
  var bean_token;
  var brokerjs;

  var orderParams;
  var sample_orderhash;
  var ECSignature;

  //printBalances(accounts);

  before(function() {
    new Promise((resolve, reject) => {
      console.log("before balance: "+web3.eth.getBalance(accounts[0]));
      const gasPrice = new BigNumber(web3.toWei(2, 'gwei'));
      brokerjs = new B0xJS(web3.currentProvider, { gasPrice });
      resolve(brokerjs);
    });
  });

  before('deploy all contracts', async function () {
    await Promise.all([
      (loan_token = await LOANToken.new()),
      (vault = await B0xVault.new()),
      (prices = await B0xPrices.new()),
      (tom_token = await TomToken.new()),
      (bean_token = await BeanToken.new())
    ]);
  
    await Promise.all([
      (broker = await B0xSol.new(loan_token.address,vault.address,prices.address)),
      tom_token.transfer(accounts[1], web3.toWei(2000000, "ether")),
      bean_token.transfer(accounts[2], web3.toWei(2000000, "ether"))
    ]);
  });

  after(function() {
    new Promise((resolve, reject) => {
      console.log("after balance: "+web3.eth.getBalance(accounts[0]));
    });
  });

    /*
    setup event listener
    var event = broker.LogErrorText(function(error, result) {
        if (!error)
            console.log(result);
    });
    */

  /*
  it("should retrieve deployed B0xVault contract", function(done) {
    B0xVault.deployed().then(function(instance) {
      vault = instance;
      assert.isOk(vault);
      done();
    });
  });

  it("should retrieve deployed B0xPrices contract", function(done) {
    B0xPrices.deployed().then(function(instance) {
      prices = instance;
      assert.isOk(vault);
      done();
    });
  });

  it("should retrieve deployed B0x contract", function(done) {
    B0xSol.deployed().then(function(instance) {
      broker = instance;
      //console.log(broker.address);
      assert.isOk(broker);
      done();
    });
  });

  it("should deploy LOANToken contract", function(done) {
    LOANToken.deployed().then(function(instance) {
      loan_token = instance;
      assert.isOk(loan_token);
      done();
    });
  });

  it("should retrieve deployed TomToken contract", function(done) {
    TomToken.deployed().then(function(instance) {
      tom_token = instance;
      assert.isOk(tom_token);
      done();
    });
  });

  it("should retrieve deployed BeanToken contract", function(done) {
    BeanToken.deployed().then(function(instance) {
      bean_token = instance;
      assert.isOk(bean_token);
      done();
    });
  });
  */

  /*it("should verify total LOANToken supply", function(done) {
    loan_token.totalSupply.call().then(function(totalSupply) {
      assert.equal(totalSupply.toNumber(), expected_LOANTokenTotalSupply, "totalSupply should equal LOANTokenTotalSupply");
      done();
    }, function(error) {
      console.error(error);
      assert.equal(true, false);
      done();
    });
  });
  */
  it("should add B0x as authorized address for B0xVault", function(done) {
    vault.addAuthorizedAddress(broker.address).then(function() {
      vault.getAuthorizedAddresses.call().then(function(authorities) {
        assert.equal(authorities[0], broker.address, "B0x contract should be the authorized address");
        done();
      });
    }, function(error) {
      console.error(error);
      assert.equal(true, false);
      done();
    });
  });
  
  it("should add B0x as authorized address for B0xPrices", function(done) {
    prices.addAuthorizedAddress(broker.address).then(function() {
      prices.getAuthorizedAddresses.call().then(function(authorities) {
        assert.equal(authorities[0], broker.address, "B0x contract should be the authorized address");
        done();
      });
    }, function(error) {
      console.error(error);
      assert.equal(true, false);
      done();
    });
  });
  
/*
  it("should deposit ether margin", function(done) {
    //var beforeWalletBalance = getWeiBalance(accounts[0]);
    vault.marginBalanceOf.call(0, accounts[0]).then(function(beforeBalance) {
      broker.depositEtherMargin({from: accounts[0], to: broker.address, value: testDepositAmount}).then(function(tx) {
        vault.marginBalanceOf.call(0, accounts[0]).then(function(afterBalance) {
          //var totalGas = new BigNumber(tx.receipt.cumulativeGasUsed) * web3.eth.gasPrice.toNumber();
          assert.equal(afterBalance.toNumber(), beforeBalance.add(testDepositAmount).toNumber(), "afterBalance should equal beforeBalance + testDepositAmount");
          //assert.equal(getWeiBalance(accounts[0]), beforeWalletBalance-testDepositAmount-totalGas, "afterWalletBalance should equal beforeWalletBalance - testDepositAmount - totalGas");
          done();
        });
      }, function(error) {
        console.error(error);
        assert.equal(true, false);
        done();
      });
    });
  });

  it("should withdraw ether margin", function(done) {
    vault.marginBalanceOf.call(0, accounts[0]).then(function(beforeBalance) {
      broker.withdrawEtherMargin(testDepositAmount, {from: accounts[0]}).then(function() {
        vault.marginBalanceOf.call(0, accounts[0]).then(function(afterBalance) {
          assert.equal(afterBalance.toNumber(), beforeBalance.sub(testDepositAmount).toNumber(), "afterBalance should equal beforeBalance - testDepositAmount");
          done();
        });
      }, function(error) {
        console.error(error);
        assert.equal(true, false);
        done();
      });
    });
  });

  it("should deposit ether funding", function(done) {
    vault.fundingBalanceOf.call(0, accounts[0]).then(function(beforeBalance) {
      broker.depositEtherFunding({from: accounts[0], to: broker.address, value: testDepositAmount}).then(function() {
        vault.fundingBalanceOf.call(0, accounts[0]).then(function(afterBalance) {
          assert.equal(afterBalance.toNumber(), beforeBalance.add(testDepositAmount).toNumber(), "afterBalance should equal beforeBalance + testDepositAmount");
          done();
        });
      }, function(error) {
        console.error(error);
        assert.equal(true, false);
        done();
      });
    });
  });

  it("should withdraw ether funding", function(done) {
    vault.fundingBalanceOf.call(0, accounts[0]).then(function(beforeBalance) {
      broker.withdrawEtherFunding(testDepositAmount, {from: accounts[0]}).then(function() {
        vault.fundingBalanceOf.call(0, accounts[0]).then(function(afterBalance) {
          assert.equal(afterBalance.toNumber(), beforeBalance.sub(testDepositAmount).toNumber(), "afterBalance should equal beforeBalance - testDepositAmount");
          done();
        });
      }, function(error) {
        console.error(error);
        assert.equal(true, false);
        done();
      });
    });
  });



  it("should approve LOAN Token transfer", function(done) {
    let tmp_loan = new ERC20(loan_token.address);
    tmp_loan.approve(broker.address, testDepositAmount*2, {from: accounts[0]}).then(function(tx) {
      tmp_loan.allowance.call(accounts[0], broker.address).then(function(allowance) {
        assert.equal(allowance, testDepositAmount*2, "allowance should equal testDepositAmount");
        done();
      });
      //assert.isOk(tx.receipt);
      //done();
    }, function(error) {
      console.error(error);
      assert.equal(true, false);
      done();
    });
  });
  
  it("should deposit LOAN Token margin", function(done) {
    vault.marginBalanceOf.call(loan_token.address, accounts[0]).then(function(beforeBalance) {
      broker.depositTokenMargin(loan_token.address, testDepositAmount, {from: accounts[0]}).then(function() {
        vault.marginBalanceOf.call(loan_token.address, accounts[0]).then(function(afterBalance) {
          assert.equal(afterBalance.toNumber(), beforeBalance.add(testDepositAmount).toNumber(), "afterBalance should equal beforeBalance + testDepositAmount");
          done();
        });
      }, function(error) {
        console.error(error);
        assert.equal(true, false);
        done();
      });
    });
  });

  it("should withdraw LOAN Token margin", function(done) {
    loan_token.balanceOf.call(accounts[0]).then(function(beforeBalance) {
      broker.withdrawTokenMargin(loan_token.address, testDepositAmount, {from: accounts[0]}).then(function() {
        loan_token.balanceOf.call(accounts[0]).then(function(afterBalance) {
          assert.equal(afterBalance.toNumber(), beforeBalance.add(testDepositAmount).toNumber(), "afterBalance should equal beforeBalance + testDepositAmount");
          done();
        });
      }, function(error) {
        console.error(error);
        assert.equal(true, false);
        done();
      });
    });
  });

  it("should deposit LOAN Token funding", function(done) {
    vault.fundingBalanceOf.call(loan_token.address, accounts[0]).then(function(beforeBalance) {
      broker.depositTokenFunding(loan_token.address, testDepositAmount, {from: accounts[0]}).then(function() {
        vault.fundingBalanceOf.call(loan_token.address, accounts[0]).then(function(afterBalance) {
          assert.equal(afterBalance.toNumber(), beforeBalance.add(testDepositAmount).toNumber(), "afterBalance should equal beforeBalance + testDepositAmount");
          done();
        });
      }, function(error) {
        console.error(error);
        assert.equal(true, false);
        done();
      });
    });
  });

  it("should withdraw LOAN Token funding", function(done) {
    loan_token.balanceOf.call(accounts[0]).then(function(beforeBalance) {
      broker.withdrawTokenFunding(loan_token.address, testDepositAmount, {from: accounts[0]}).then(function() {
        loan_token.balanceOf.call(accounts[0]).then(function(afterBalance) {
          assert.equal(afterBalance.toNumber(), beforeBalance.add(testDepositAmount).toNumber(), "afterBalance should equal beforeBalance + testDepositAmount");
          done();
        });
      }, function(error) {
        console.error(error);
        assert.equal(true, false);
        done();
      });
    });
  });
*/

  it("should transfer LOANToken to accounts[1] and accounts[1] deposit to funding (for lender)", function(done) {
    var amount = web3.toWei(100000, "ether");
    loan_token.transfer(accounts[1], amount, {from: accounts[0]}).then(function(result) {
      loan_token.approve(broker.address, amount, {from: accounts[1]}).then(function(tx) {
        
        /*loan_token.allowance.call(accounts[1],broker.address).then(function(allowance) {
          console.log("allowance: "+allowance);
        });*/
        
        vault.fundingBalanceOf.call(loan_token.address, accounts[1]).then(function(beforeBalance) {
          //console.log("beforeBalance: "+beforeBalance);
          broker.depositTokenFunding(loan_token.address, amount, {from: accounts[1]}).then(function() {
            vault.fundingBalanceOf.call(loan_token.address, accounts[1]).then(function(afterBalance) {
              
              /*vault.getAuthorizedAddresses.call().then(function(addrs) {
                console.log(addrs);
                console.log(broker.address);
              });*/

              assert.equal(afterBalance.toNumber(), beforeBalance.add(amount).toNumber(), "afterBalance should equal beforeBalance + 100000");
              done();
              
            });
          }, function(error) {
            console.error("inner: "+error);
            assert.equal(true, false);
            done();
          });
        });
      });
    }, function(error) {
      console.error("outer: "+error);
      assert.equal(true, false);
      done();
    });
  });

  it("should transfer LOANToken to accounts[2] and accounts[2] deposit to margin (for trader)", function(done) {
    var amount = web3.toWei(100000, "ether");
    loan_token.transfer(accounts[2], amount, {from: accounts[0]}).then(function(result) {
      loan_token.approve(broker.address, amount, {from: accounts[2]}).then(function(tx) {
        vault.marginBalanceOf.call(loan_token.address, accounts[2]).then(function(beforeBalance) {
          broker.depositTokenMargin(loan_token.address, amount, {from: accounts[2]}).then(function() {
            vault.marginBalanceOf.call(loan_token.address, accounts[2]).then(function(afterBalance) {
              assert.equal(afterBalance.toNumber(), beforeBalance.add(amount).toNumber(), "afterBalance should equal beforeBalance + 100000");
              done();
            });
          }, function(error) {
            console.error("inner: "+error);
            assert.equal(true, false);
            done();
          });
        });
      });
    }, function(error) {
      console.error("outer: "+error);
      assert.equal(true, false);
      done();
    });
  });

  it("should deposit Tom Token funding", async function() {
    var amount = web3.toWei(1000000, "ether");
    try
    {
      var tx1 = await tom_token.approve(broker.address, amount, {from: accounts[1]});
      assert.isOk(tx1.receipt);
      //console.log(tx1.receipt);
      var tx2 = await broker.depositTokenFunding.call(tom_token.address, amount, {from: accounts[1]});
      //console.log(tx2);
      assert.isOk(true);
      //assert.isOk(tx2.receipt);
    } catch (error) {
      console.error("outer: "+error);
      assert.isOk(false);
    }
  });

  it("should generate lendOrderHash", function(done) {
    var salt = generatePseudoRandomSalt().toString();
    salt = salt.substring(0,salt.length-10);
  
    orderParams = {
      "b0x": broker.address, 
      "maker": accounts[1], // lender
      "taker": "0x0000000000000000000000000000000000000000",
      "lendTokenAddress": tom_token.address,
      "marginTokenAddress": loan_token.address, 
      "feeRecipientAddress": accounts[9], 
      "lendTokenAmount": web3.toWei(1000000, "ether").toString(), 
      "interestAmount": web3.toWei(2, "ether").toString(), // 2 token units per day
      "initialMarginAmount": "50", // 50% 
      "liquidationMarginAmount": "25", // 25% 
      "lenderRelayFee": web3.toWei(0.001, "ether").toString(), 
      "traderRelayFee": web3.toWei(0.0015, "ether").toString(), 
      "expirationUnixTimestampSec": (web3.eth.getBlock("latest").timestamp+86400).toString(), 
      "salt": salt
    };
    //console.log(orderParams);
    let expectedHash = brokerjs.getLendOrderHashHex(orderParams);
    //console.log("js hash: "+expectedHash);
    //console.log(salt);
    //console.log(expirationUnixTimestampSec);
    //console.log(orderParams);
    broker.getLendOrderHash.call(
      [
        orderParams["maker"],
        orderParams["taker"],
        orderParams["lendTokenAddress"],
        orderParams["marginTokenAddress"],
        orderParams["feeRecipientAddress"]
      ],
      [
        new BN(orderParams["lendTokenAmount"]),
        new BN(orderParams["interestAmount"]),
        new BN(orderParams["initialMarginAmount"]),
        new BN(orderParams["liquidationMarginAmount"]),
        new BN(orderParams["lenderRelayFee"]),
        new BN(orderParams["traderRelayFee"]),
        new BN(orderParams["expirationUnixTimestampSec"]),
        new BN(orderParams["salt"])
    ]).then(function(orderHash) {
      //console.log("sol hash: "+orderHash);
      sample_orderhash = orderHash;
      assert.equal(orderHash, expectedHash, "expectedHash should equal returned lendOrderHash");
      done();
    }, function(error) {
      console.error(error);
      assert.equal(true, false);
      done();
    });
  });

  it("should sign and verify orderHash", function(done) {
    var msgHashHex;
    const nodeVersion = web3.version.node;
    const isParityNode = _.includes(nodeVersion, 'Parity');
    const isTestRpc = _.includes(nodeVersion, 'TestRPC');
    //console.log("isParityNode:" + isParityNode);
    //console.log("isTestRpc:" + isTestRpc);
    
    if (isParityNode || isTestRpc) {
      // Parity and TestRpc nodes add the personalMessage prefix itself
      msgHashHex = sample_orderhash;
    }
    else {
      var orderHashBuff = ethUtil.toBuffer(sample_orderhash);
      var msgHashBuff = ethUtil.hashPersonalMessage(orderHashBuff);
      msgHashHex = ethUtil.bufferToHex(msgHashBuff);
    }

    var signedOrderHash = web3.eth.sign(accounts[1], msgHashHex);
    //console.log(signedOrderHash);

    ECSignature = {
      "v": parseInt(signedOrderHash.substring(130,132))+27,
      "r": "0x"+signedOrderHash.substring(2,66),
      "s": "0x"+signedOrderHash.substring(66,130)
    };

    broker.isValidSignature.call(
      accounts[1], // lender
      msgHashHex,
      ECSignature["v"],
      ECSignature["r"],
      ECSignature["s"]
    ).then(function(result) {
      assert.isOk(result);
      done();
    }, function(error) {
      console.error(error);
      assert.isOk(false);
      done();
    });
  });

  it("should send sample prices for LOAN", function(done) {
    var expectedPrice = web3.toWei("0.00025998", "ether");
    broker.testSendPriceUpdate(
      loan_token.address, 
      expectedPrice,
      {from: accounts[0]}).then(function(tx) {
        /*if (tx.logs[0] !== undefined)
          console.log(tx.logs[0].args);
        else
          console.log(tx);*/
        
        prices.getTokenPrice(loan_token.address).then(function(currentPrice) {
          assert.equal(currentPrice, expectedPrice, "expectedPrice should equal returned currentPrice");
          done();
        }, function(error) {
          console.error("inner: "+error);
          assert.isOk(false);
          done();
        });
    }, function(error) {
      console.error("outer: "+error);
      assert.isOk(false);
      done();
    });
  });

  it("should send sample prices for BEAN", function(done) {
    var expectedPrice = web3.toWei("1.2", "ether");
    broker.testSendPriceUpdate(
      bean_token.address, 
      expectedPrice,
      {from: accounts[0]}).then(function(tx) {
        prices.getTokenPrice(bean_token.address).then(function(currentPrice) {
          assert.equal(currentPrice, expectedPrice, "expectedPrice should equal returned currentPrice");
          done();
        }, function(error) {
          console.error("inner: "+error);
          assert.isOk(false);
          done();
        });
    }, function(error) {
      console.error("outer: "+error);
      assert.isOk(false);
      done();
    });
  });

  it("should send sample prices for Tom", function(done) {
    var expectedPrice = web3.toWei((0.32+0.75)/2, "ether");
    broker.testSendPriceUpdate(
      tom_token.address, 
      web3.toWei(0.32, "ether"), // simulate price from one source
      {from: accounts[0]}).then(function(tx) {
        //console.log(tx);
        prices.getTokenPrice(tom_token.address).then(function(currentPrice) {
          //console.log(currentPrice.toString());
          broker.testSendPriceUpdate(
            tom_token.address, 
            web3.toWei(0.75, "ether"), // simulate price from another source
            {from: accounts[7]}).then(function(tx) {
              //console.log(tx);
              prices.getTokenPrice(tom_token.address).then(function(currentPrice) {
                currentPrice = currentPrice.toString();
                //console.log(currentPrice);
                assert.equal(currentPrice, expectedPrice, "expectedPrice should equal returned currentPrice");
                done();
              }, function(error) {
                console.error("inner 2: "+error);
                assert.isOk(false);
                done();
              });
            }, function(error) {
              console.error("inner 1: "+error);
              assert.isOk(false);
              done();
            });
          });
    }, function(error) {
      console.error("outer: "+error);
      assert.isOk(false);
      done();
    });
  });

  it("should take sample trade as trader", function(done) {
    broker.takeLendOrderAsTrader(
      [
        orderParams["maker"],
        orderParams["taker"],
        orderParams["lendTokenAddress"],
        orderParams["marginTokenAddress"],
        orderParams["feeRecipientAddress"]
      ],
      [
        new BN(orderParams["lendTokenAmount"]),
        new BN(orderParams["interestAmount"]),
        new BN(orderParams["initialMarginAmount"]),
        new BN(orderParams["liquidationMarginAmount"]),
        new BN(orderParams["lenderRelayFee"]),
        new BN(orderParams["traderRelayFee"]),
        new BN(orderParams["expirationUnixTimestampSec"]),
        new BN(orderParams["salt"])
      ],
      web3.toWei(15, "ether"),
      ECSignature["v"],
      ECSignature["r"],
      ECSignature["s"],
      {from: accounts[2]}).then(function(tx) {
        if (tx.logs !== undefined) {
          for (var i=0; i < tx.logs.length; i++) {
            console.log(tx.logs[i].args);
          }
        } else
          console.log(tx);
        assert.isOk(tx);
        done();
    }, function(error) {
      console.error(error);
      assert.isOk(false);
      done();
    });
  });


  /*it('is should create sample prices for tokens', async function () {
    
    const DexA_LOAN = await fundRaise.address

    await fundRaise.pause()

    try {
        await fundRaise.sendTransaction({ value: 1e+18, from: donor })
        assert.fail()
    } catch (error) {
        assert(error.toString().includes('invalid opcode'), error.toString())
    }
    const fundRaiseAddress = await fundRaise.address
    assert.equal(web3.eth.getBalance(fundRaiseAddress).toNumber(), 0)

    await fundRaise.unpause()
    await fundRaise.sendTransaction({ value: 1e+18, from: donor })
    assert.equal(web3.eth.getBalance(fundRaiseAddress).toNumber(), 1e+18)
  })*/



  function printBalances(accounts) {
    accounts.forEach(function(ac, i) {
      console.log(accounts[i],": ", web3.fromWei(web3.eth.getBalance(ac), 'ether').toNumber());
    });
  }

  function getWeiBalance(account) {
    return web3.eth.getBalance(account).toNumber();
  }

  function generatePseudoRandomSalt() {
    // BigNumber.random returns a pseudo-random number between 0 & 1 with a passed in number of decimal places.
    // Source: https://mikemcl.github.io/bignumber.js/#random
    let MAX_DIGITS_IN_UNSIGNED_256_INT = 78;
    var randomNumber = BigNumber.random(MAX_DIGITS_IN_UNSIGNED_256_INT);
    var factor = new BigNumber(10).pow(MAX_DIGITS_IN_UNSIGNED_256_INT - 1);
    var salt = randomNumber.times(factor).round();
    return salt;
  };

  function encodeFunctionTxData(functionName, types, args) {
    var fullName = functionName + '(' + types.join() + ')';
    var signature = CryptoJS.SHA3(fullName, { outputLength: 256 }).toString(CryptoJS.enc.Hex).slice(0, 8);
    var dataHex = signature + coder.encodeParams(types, args);
  
    return dataHex;
  }
});
