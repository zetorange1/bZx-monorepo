/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
 
pragma solidity 0.5.3;
pragma experimental ABIEncoderV2;

import "./OracleNotifierInterface.sol";


contract OracleNotifier {

    mapping (bytes32 => address) public takeOrderNotifier; // external contract that is called when a loan is filled
    mapping (bytes32 => address) public tradePositionNotifier; // external contract that is called when trade is placed by a borrower
    mapping (bytes32 => address) public payInterestNotifier; // external contract that is called when interest is paid to the lender
    mapping (bytes32 => address) public closeLoanNotifier; // external contract that is called when part or all of a loan is closed

    function _setNotifications(
        bytes32 notifyHash,
        bytes memory oracleData)
        internal
    {
        address notifier;
        if (oracleData.length >= 20) {
            assembly {
                notifier := mload(add(oracleData, 20))
            }
            takeOrderNotifier[notifyHash] = notifier;
        }
        if (oracleData.length >= 40) {
            assembly {
                notifier := mload(add(oracleData, 40))
            }
            tradePositionNotifier[notifyHash] = notifier;
        }
        if (oracleData.length >= 60) {
            assembly {
                notifier := mload(add(oracleData, 60))
            }
            payInterestNotifier[notifyHash] = notifier;
        }
        if (oracleData.length >= 80) {
            assembly {
                notifier := mload(add(oracleData, 80))
            }
            closeLoanNotifier[notifyHash] = notifier;
        }
    }
}
