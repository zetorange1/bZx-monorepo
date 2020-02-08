/**
 * Copyright 2017-2020, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.3;

interface iZeroXConnector {
    function trade(
        address sourceToken,
        address destToken,
        address receiver,
        uint256 sourceTokenAmount,
        uint256 destTokenAmount,
        bytes calldata loanDataBytes)
        external
        payable
        returns (uint256 destTokenAmountReceived, uint256 sourceTokenAmountUsed);
}

contract ZeroXAPIUser {
    // Mainnet and Kovan
    iZeroXConnector public constant zeroXConnector = iZeroXConnector(0xc231a724886c8e68d5Def6456bC861184CbC291a);
}
