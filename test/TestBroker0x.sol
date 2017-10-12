pragma solidity ^0.4.2;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/Broker0x.sol";
import "../contracts/Broker0xVault.sol";

contract TestBroker0x {

  Broker0xVault vault;
  Broker0x broker;

  function beforeEach() {
    vault = Broker0xVault(DeployedAddresses.Broker0xVault());
    broker = Broker0x(DeployedAddresses.Broker0x());

    vault.addAuthorizedAddress(DeployedAddresses.Broker0x());
    /*address expected = DeployedAddresses.Broker0x();
    address[] authorities = vault.getAuthorizedAddresses();
    Assert.equal(authorities[0], expected, "Broker0x contract should be the authorized address");*/
  }

  /*function testDepositEtherMargin() {
    uint etherAmount = 10 ether;
    
    uint beforeBalance = vault.marginBalanceOf(0,msg.sender);
    broker.depositEtherMargin.value(etherAmount)();
    uint afterBalance = vault.marginBalanceOf(0,msg.sender);

    Assert.equal(afterBalance, beforeBalance+etherAmount, "afterBalance should equal beforeBalance + etherAmountOwner");
  }*/

/*
  function testInitialBalanceWithNewMetaCoin() {
    Broker0x broker = Broker0x();

    //uint expected = 10000;

    //Assert.equal(meta.getBalance(tx.origin), expected, "Owner should have 10000 MetaCoin initially");
  }

  function testItStoresAValue() {
    SimpleStorage simpleStorage = SimpleStorage(DeployedAddresses.SimpleStorage());

    simpleStorage.set(89);

    uint expected = 89;

    Assert.equal(simpleStorage.get(), expected, "It should store the value 89.");
  }
*/
}
