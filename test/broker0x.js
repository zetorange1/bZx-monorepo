
//const BigNumber = require('bignumber.js');
const Web3 = require('web3')
let web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"))

let Broker0xVault = artifacts.require("./Broker0xVault.sol");
let Broker0x = artifacts.require("./Broker0x.sol");
let RESTToken = artifacts.require("./RESTToken.sol");
let ERC20 = artifacts.require("./ERC20.sol"); // for testing with any ERC20 token

let testDepositAmount = web3.toWei(0.001, "ether");
let expected_RESTTokenTotalSupply = web3.toWei(20000000, "ether"); // 20MM REST


contract('Broker0xTest', function(accounts) {
  var vault;
  var broker;
  var rest_token;

  //printBalances(accounts);

  it("should retrieve deployed Broker0xVault contract", function(done) {
    Broker0xVault.deployed().then(function(instance) {
      vault = instance;
      assert.isOk(vault);
      done();
    });
  });

  it("should retrieve deployed Broker0x contract", function(done) {
    Broker0x.deployed().then(function(instance) {
      broker = instance;
      assert.isOk(vault);
      done();
    });
  });

  it("should retrieve deployed RESTToken contract", function(done) {
    RESTToken.deployed().then(function(instance) {
      rest_token = instance;
      assert.isOk(vault);
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

  function printBalances(accounts) {
    accounts.forEach(function(ac, i) {
      console.log(accounts[i],": ", web3.fromWei(web3.eth.getBalance(ac), 'ether').toNumber());
    });
  }

  function getWeiBalance(account) {
    return web3.eth.getBalance(account).toNumber();
  }

});
