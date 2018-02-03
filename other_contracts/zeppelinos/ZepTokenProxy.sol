
pragma solidity 0.4.18;

import './ZepUpgradeabilityProxy.sol';
import './ZepTokenStorage.sol';

contract ZepTokenProxy is ZepUpgradeabilityProxy, ZepTokenStorage {}
