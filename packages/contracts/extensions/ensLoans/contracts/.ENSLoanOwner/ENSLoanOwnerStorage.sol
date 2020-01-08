/**
 * Copyright 2017-2020, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.8;

import "../shared/openzeppelin-solidity/Ownable.sol";
import "../shared/ENS.sol";


contract ENSLoanOwnerStorage is Ownable {
    // tokenloan ens hash
    bytes32 public tokenloanHash = 0x412c2f8803a30232df76357316f10634835ba4cd288f6002d1d70cb72fac904b;

    address public userContractRegistry;

    // ENS
    ENSSimple public ENSContract;
    ResolverSimple public ResolverContract;

    mapping (address => bool) public controllers;
}
