const BigNumber = require('bignumber.js');
const BN = require('bn.js');
const Web3 = require('web3')
let web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"))

import { Broker0x } from '../src/Broker0x.js';
// require('../src/Broker0x.js');


let Broker0xVault = artifacts.require("./Broker0xVault.sol");
let Broker0xSol = artifacts.require("./Broker0x.sol");
let RESTToken = artifacts.require("./RESTToken.sol");
let ERC20 = artifacts.require("./ERC20.sol"); // for testing with any ERC20 token

let TomToken = artifacts.require("./TomToken.sol");
let BeanToken = artifacts.require("./BeanToken.sol");

let testDepositAmount = web3.toWei(0.001, "ether");
let expected_RESTTokenTotalSupply = web3.toWei(20000000, "ether"); // 20MM REST

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

contract('Broker0xTest', function(accounts) {
  var vault;
  var broker;
  var rest_token;
  var tom_token;
  var bean_token;
  var brokerjs;

  //printBalances(accounts);

  before(function() {
    new Promise((resolve, reject) => {
      const gasPrice = new BigNumber(web3.toWei(2, 'gwei'));
      brokerjs = new Broker0x(web3.currentProvider, { gasPrice });
      resolve(brokerjs);
    });
  });

  it("should retrieve deployed Broker0xVault contract", function(done) {
    Broker0xVault.deployed().then(function(instance) {
      vault = instance;
      assert.isOk(vault);
      done();
    });
  });

  it("should retrieve deployed Broker0x contract", function(done) {
    Broker0xSol.deployed().then(function(instance) {
      broker = instance;
      assert.isOk(broker);
      done();
    });
  });

  it("should retrieve deployed RESTToken contract and transfer to test accounts", function(done) {
    RESTToken.deployed().then(function(instance) {
      rest_token = instance;
      assert.isOk(rest_token);
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

  it("should verify total RESTToken supply", function(done) {
    rest_token.totalSupply.call().then(function(totalSupply) {
      assert.equal(totalSupply.toNumber(), expected_RESTTokenTotalSupply, "totalSupply should equal RESTTokenTotalSupply");
      done();
    }, function(error) {
      console.error(error);
      assert.equal(true, false);
      done();
    });
  });

  it("should add Broker0x as authorized address for Broker0xVault", function(done) {
    vault.addAuthorizedAddress(broker.address).then(function() {
      vault.getAuthorizedAddresses.call().then(function(authorities) {
        assert.equal(authorities[0], broker.address, "Broker0x contract should be the authorized address");
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



  it("should approve REST Token transfer", function(done) {
    let tmp_rest = new ERC20(rest_token.address);
    tmp_rest.approve(broker.address, testDepositAmount*2, {from: accounts[0]}).then(function(tx) {
      tmp_rest.allowance.call(accounts[0], broker.address).then(function(allowance) {
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
  
  it("should deposit REST Token margin", function(done) {
    vault.marginBalanceOf.call(rest_token.address, accounts[0]).then(function(beforeBalance) {
      broker.depositTokenMargin(rest_token.address, testDepositAmount, {from: accounts[0]}).then(function() {
        vault.marginBalanceOf.call(rest_token.address, accounts[0]).then(function(afterBalance) {
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

  it("should withdraw REST Token margin", function(done) {
    rest_token.balanceOf.call(accounts[0]).then(function(beforeBalance) {
      broker.withdrawTokenMargin(rest_token.address, testDepositAmount, {from: accounts[0]}).then(function() {
        rest_token.balanceOf.call(accounts[0]).then(function(afterBalance) {
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

  it("should deposit REST Token funding", function(done) {
    vault.fundingBalanceOf.call(rest_token.address, accounts[0]).then(function(beforeBalance) {
      broker.depositTokenFunding(rest_token.address, testDepositAmount, {from: accounts[0]}).then(function() {
        vault.fundingBalanceOf.call(rest_token.address, accounts[0]).then(function(afterBalance) {
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

  it("should withdraw REST Token funding", function(done) {
    rest_token.balanceOf.call(accounts[0]).then(function(beforeBalance) {
      broker.withdrawTokenFunding(rest_token.address, testDepositAmount, {from: accounts[0]}).then(function() {
        rest_token.balanceOf.call(accounts[0]).then(function(afterBalance) {
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
  it("should transfer RESTToken to accounts[1] and accounts[1] deposit to funding", function(done) {
    rest_token.transfer(accounts[1], web3.toWei(100000, "ether"), {from: accounts[0]}).then(function(result) {
      rest_token.approve(broker.address, web3.toWei(100000, "ether"), {from: accounts[1]}).then(function(tx) {
        vault.fundingBalanceOf.call(rest_token.address, accounts[1]).then(function(beforeBalance) {
          broker.depositTokenFunding(rest_token.address, testDepositAmount, {from: accounts[1]}).then(function() {
            vault.fundingBalanceOf.call(rest_token.address, accounts[1]).then(function(afterBalance) {
              assert.equal(afterBalance.toNumber(), beforeBalance.add(testDepositAmount).toNumber(), "afterBalance should equal beforeBalance + 100000");
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

  it("should transfer RESTToken to accounts[2] and accounts[2] deposit to margin", function(done) {
    rest_token.transfer(accounts[2], web3.toWei(100000, "ether"), {from: accounts[0]}).then(function(result) {
      rest_token.approve(broker.address, web3.toWei(100000, "ether"), {from: accounts[2]}).then(function(tx) {
        vault.marginBalanceOf.call(rest_token.address, accounts[2]).then(function(beforeBalance) {
          broker.depositTokenMargin(rest_token.address, testDepositAmount, {from: accounts[2]}).then(function() {
            vault.marginBalanceOf.call(rest_token.address, accounts[2]).then(function(afterBalance) {
              assert.equal(afterBalance.toNumber(), beforeBalance.add(testDepositAmount).toNumber(), "afterBalance should equal beforeBalance + 100000");
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

  it("should deposit Tom Token funding", function(done) {
    tom_token.approve(broker.address, web3.toWei(1000000, "ether"), {from: accounts[1]}).then(function(tx) {
      broker.depositTokenFunding(tom_token.address, web3.toWei(1000000, "ether"), {from: accounts[1]}).then(function(tx) {
        assert.isOk(tx.receipt);
        done();
      }, function(error) {
        console.error("inner: "+error);
        assert.equal(true, false);
        done();
      });
    }, function(error) {
      console.error("outer: "+error);
      assert.equal(true, false);
      done();
    });
  });


  it("should generate orderHash as lender", function(done) {
    let salt =  6.5812139555116479528032937647857030113604075300193028100254936553142961334085; //generatePseudoRandomSalt().toString();
    let expirationUnixTimestampSec = 1510862552; //Math.floor(Date.now() / 1000) + 2592000; // 30 days from now
    
    var orderParams = {
      "broker0xContractAddress": broker.address, 
      "maker": accounts[1], 
      "makerTokenAddress": '0x549764eec43711c57f2074853e69e586b78628d6', //tom_token.address, 
      "interestTokenAddress": '0x1f527b402f429912abe97bb6775380c89936f640', //rest_token.address, 
      "oracleAddress": "0x0000000000000000000000000000000000000000", 
      "feeRecipient": accounts[9], 
      "makerTokenAmount": web3.toWei(1000000, "ether").toString(), 
      "lendingLengthSec": "432000", // 5 day
      "interestAmount": web3.toWei(2, "ether").toString(), // 2 token units per day
      "initialMarginAmount": "50", // 50% 
      "liquidationMarginAmount": "25", // 25% 
      "lenderRelayFee": web3.toWei(0.001, "ether").toString(), 
      "borrowerRelayFee": web3.toWei(0.0015, "ether").toString(), 
      "expirationUnixTimestampSec": expirationUnixTimestampSec.toString(), 
      "reinvestAllowed": "1", 
      "salt": salt.toString()
    };
    //console.log(orderParams);
    let expectedHash = brokerjs.getTradeOrderHashHex(orderParams);

    //console.log(salt);
    //console.log(expirationUnixTimestampSec);
    //console.log(orderParams);
    broker.getTradeOrderHash.call([
      orderParams["maker"],
      orderParams["makerTokenAddress"],
      orderParams["interestTokenAddress"],
      orderParams["oracleAddress"],
      orderParams["feeRecipient"],
      ],
      [
        new BN(orderParams["makerTokenAmount"]),
        new BN(orderParams["lendingLengthSec"]),
        new BN(orderParams["interestAmount"]),
        new BN(orderParams["initialMarginAmount"]),
        new BN(orderParams["liquidationMarginAmount"]),
        new BN(orderParams["lenderRelayFee"]),
        new BN(orderParams["borrowerRelayFee"]),
        new BN(orderParams["expirationUnixTimestampSec"]),
        new BN(orderParams["reinvestAllowed"]),
        new BN(orderParams["salt"])
    ]).then(function(orderHash) {
      //console.log("sol hash: "+orderHash);
      assert.equal(orderHash, expectedHash, "expectedHash should equal returned orderHash");
      done();
    }, function(error) {
      console.error(error);
      assert.equal(true, false);
      done();
    });
  });

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
});
