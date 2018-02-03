
pragma solidity 0.4.18;

import './ZepProxy.sol';
import './ZepUpgradeabilityStorage.sol';

contract ZepUpgradeabilityProxy is ZepProxy, ZepUpgradeabilityStorage {
  event Upgraded(string version, address indexed implementation);

  function upgradeTo(string version, address implementation) public {
    require(_implementation != implementation);
    _version = version;
    _implementation = implementation;
    Upgraded(version, implementation);
  }
}
