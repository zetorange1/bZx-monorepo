
//const BigNumber = require('bignumber.js');
const Web3 = require('web3')
let web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"))

let Broker0xVault = artifacts.require("./Broker0xVault.sol");
let Broker0x = artifacts.require("./Broker0x.sol");

var testEtherAmount = web3.toWei(0.001, "ether");

  //vault.addAuthorizedAddress(DeployedAddresses.Broker0x());
    //address expected = DeployedAddresses.Broker0x();
    //address[] authorities = vault.getAuthorizedAddresses();
    //Assert.equal(authorities[0], expected, "Broker0x contract should be the authorized address");


contract('Broker0xTest', function(accounts) {
  var vault;
  var broker;

  //printBalances(accounts);

  it("should retrive deployed Broker0xVault contract", function(done) {
    Broker0xVault.deployed().then(function(instance) {
      vault = instance;
      assert.isOk(vault);
      done();
    });
  });

  it("should retrive deployed Broker0x contract", function(done) {
    Broker0x.deployed().then(function(instance) {
      broker = instance;
      assert.isOk(vault);
      done();
    });
  });

  it("should add Broker0x as authorized address for Broker0xVault", function(done) {
    vault.addAuthorizedAddress(broker.address).then(function() {
      vault.getAuthorizedAddresses().then(function(authorities) {
        assert.equal(authorities[0], broker.address, "Broker0x contract should be the authorized address");
        done();
      });
    }, function(error) {
      // Force an error if callback fails.
      assert.equal(true, false);
      console.error(error);
      done();
    });
  });

  it("should deposit ether margin", function(done) {
    //var beforeWalletBalance = getWeiBalance(accounts[0]);
    vault.marginBalanceOf(0, accounts[0]).then(function(beforeBalance) {
      broker.depositEtherMargin({from: accounts[0], to: broker.address, value: testEtherAmount}).then(function(tx) {
        vault.marginBalanceOf(0, accounts[0]).then(function(afterBalance) {
          //var totalGas = new BigNumber(tx.receipt.cumulativeGasUsed) * web3.eth.gasPrice.toNumber();
          assert.equal(afterBalance.toNumber(), beforeBalance.add(testEtherAmount).toNumber(), "afterBalance should equal beforeBalance + testEtherAmountOwner");
          //assert.equal(getWeiBalance(accounts[0]), beforeWalletBalance-testEtherAmount-totalGas, "afterWalletBalance should equal beforeWalletBalance - testEtherAmountOwner - totalGas");
          done();
        });
      }, function(error) {
        // Force an error if callback fails.
        assert.equal(true, false);
        console.error(error);
        done();
      });
    });
  });

  it("should withdraw ether margin", function(done) {
    vault.marginBalanceOf(0, accounts[0]).then(function(beforeBalance) {
      broker.withdrawEtherMargin(testEtherAmount).then(function() {
        vault.marginBalanceOf(0, accounts[0]).then(function(afterBalance) {
          assert.equal(afterBalance.toNumber(), beforeBalance.sub(testEtherAmount).toNumber(), "afterBalance should equal beforeBalance - testEtherAmountOwner");
          done();
        });
      }, function(error) {
        // Force an error if callback fails.
        assert.equal(true, false);
        console.error(error);
        done();
      });
    });
  });

  it("should deposit ether funding", function(done) {
    vault.fundingBalanceOf(0, accounts[0]).then(function(beforeBalance) {
      broker.depositEtherFunding({from: accounts[0], to: broker.address, value: testEtherAmount}).then(function() {
        vault.fundingBalanceOf(0, accounts[0]).then(function(afterBalance) {
          assert.equal(afterBalance.toNumber(), beforeBalance.add(testEtherAmount).toNumber(), "afterBalance should equal beforeBalance + testEtherAmountOwner");
          done();
        });
      }, function(error) {
        // Force an error if callback fails.
        assert.equal(true, false);
        console.error(error);
        done();
      });
    });
  });

  it("should withdraw ether funding", function(done) {
    vault.fundingBalanceOf(0, accounts[0]).then(function(beforeBalance) {
      broker.withdrawEtherFunding(testEtherAmount).then(function() {
        vault.fundingBalanceOf(0, accounts[0]).then(function(afterBalance) {
          assert.equal(afterBalance.toNumber(), beforeBalance.sub(testEtherAmount).toNumber(), "afterBalance should equal beforeBalance - testEtherAmountOwner");
          done();
        });
      }, function(error) {
        // Force an error if callback fails.
        assert.equal(true, false);
        console.error(error);
        done();
      });
    });
  });

  // Utility function to display the balances of each account.
  function printBalances(accounts) {
    accounts.forEach(function(ac, i) {
      console.log(accounts[i],": ", web3.fromWei(web3.eth.getBalance(ac), 'ether').toNumber());
    });
  }

  function getWeiBalance(account) {
    return web3.eth.getBalance(account).toNumber();
  }
});


/*
var SimpleStorage = artifacts.require("./SimpleStorage.sol");

contract('SimpleStorage', function(accounts) {

  it("...should store the value 89.", function() {
    return SimpleStorage.deployed().then(function(instance) {
      simpleStorageInstance = instance;

      return simpleStorageInstance.set(89, {from: accounts[0]});
    }).then(function() {
      return simpleStorageInstance.get.call();
    }).then(function(storedData) {
      assert.equal(storedData, 89, "The value 89 was not stored.");
    });
  });

});
*/
/*
contract('Broker0x', function(accounts) {
  it("should put 10000 Broker0x in the first account", function() {
    return Broker0x.deployed().then(function(instance) {
      return instance.getBalance.call(accounts[0]);
    }).then(function(balance) {
      assert.equal(balance.valueOf(), 10000, "10000 wasn't in the first account");
    });
  });
  it("should call a function that depends on a linked library", function() {
    var meta;
    var broker0xBalance;
    var broker0xEthBalance;

    return Broker0x.deployed().then(function(instance) {
      meta = instance;
      return meta.getBalance.call(accounts[0]);
    }).then(function(outCoinBalance) {
      broker0xBalance = outCoinBalance.toNumber();
      return meta.getBalanceInEth.call(accounts[0]);
    }).then(function(outCoinBalanceEth) {
      broker0xEthBalance = outCoinBalanceEth.toNumber();
    }).then(function() {
      assert.equal(broker0xEthBalance, 2 * broker0xBalance, "Library function returned unexpeced function, linkage may be broken");
    });
  });

  it("should send coin correctly", function() {
    var meta;

    //    Get initial balances of first and second account.
    var account_one = accounts[0];
    var account_two = accounts[1];

    var account_one_starting_balance;
    var account_two_starting_balance;
    var account_one_ending_balance;
    var account_two_ending_balance;

    var amount = 10;

    return Broker0x.deployed().then(function(instance) {
      meta = instance;
      return meta.getBalance.call(account_one);
    }).then(function(balance) {
      account_one_starting_balance = balance.toNumber();
      return meta.getBalance.call(account_two);
    }).then(function(balance) {
      account_two_starting_balance = balance.toNumber();
      return meta.sendCoin(account_two, amount, {from: account_one});
    }).then(function() {
      return meta.getBalance.call(account_one);
    }).then(function(balance) {
      account_one_ending_balance = balance.toNumber();
      return meta.getBalance.call(account_two);
    }).then(function(balance) {
      account_two_ending_balance = balance.toNumber();

      assert.equal(account_one_ending_balance, account_one_starting_balance - amount, "Amount wasn't correctly taken from the sender");
      assert.equal(account_two_ending_balance, account_two_starting_balance + amount, "Amount wasn't correctly sent to the receiver");
    });
  });
});
*/