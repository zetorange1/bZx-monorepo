/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.8;

import "../shared/openzeppelin-solidity/Ownable.sol";
import "../shared/openzeppelin-solidity/ERC20.sol";
import "./LoanTokenInterface.sol";


contract BZxBridge is Ownable
{
    bytes2 constant COLON = 0x3a20;

    bytes loanData;
    uint leverageAmount = 2000000000000000000;
    uint initialLoanDuration = 7884000; // standard 3 months
}
