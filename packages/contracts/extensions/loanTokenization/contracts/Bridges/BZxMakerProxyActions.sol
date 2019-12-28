/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.8;


contract MakerBridge {
    function migrateLoan(
        uint[] memory cdps, // ids
        uint[] memory darts, // DAI amounts
        uint[] memory dinks, // other amounts
        uint[] memory collateralDinks, // will be used for borrow on bZx
        uint[] memory borrowAmounts // the amounts of underlying tokens for each new Torque loan
    )
        public;
}

contract BZxMakerProxyActions {
    function migrateLoan(
        address bridge,
        uint[] memory cdps, // ids
        uint[] memory darts, // DAI amounts
        uint[] memory dinks, // other amounts
        uint[] memory collateralDinks, // will be used for borrow on bZx
        uint[] memory borrowAmounts // the amounts of underlying tokens for each new Torque loan
    )
        public 
    {
        MakerBridge(bridge).migrateLoan(cdps, darts, dinks, collateralDinks, borrowAmounts);
    }
}
