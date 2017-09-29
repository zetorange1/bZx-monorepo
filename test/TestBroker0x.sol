pragma solidity ^0.4.2;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/Broker0x.sol";

contract TestBroker0x {

  function testInitialBalanceUsingDeployedContract() {
    Broker0x broker = Broker0x(DeployedAddresses.Broker0x());

    //uint expected = 10000;

    //Assert.equal(meta.getBalance(tx.origin), expected, "Owner should have 10000 MetaCoin initially");
  }

  function testInitialBalanceWithNewMetaCoin() {
    Broker0x broker = Broker0x();

    //uint expected = 10000;

    //Assert.equal(meta.getBalance(tx.origin), expected, "Owner should have 10000 MetaCoin initially");
  }

}
