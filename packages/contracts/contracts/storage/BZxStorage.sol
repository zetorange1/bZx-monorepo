/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
 
pragma solidity 0.5.2;

import "../openzeppelin-solidity/ReentrancyGuard.sol";
import "../openzeppelin-solidity/Ownable.sol";
import "../modifiers/GasTracker.sol";

import "./BZxObjects.sol";
import "./BZxEvents.sol";


// bZx shared storage
contract BZxStorage is BZxObjects, BZxEvents, ReentrancyGuard, Ownable, GasTracker {
    uint256 internal constant MAX_UINT = 2**256 - 1;

/* solhint-disable var-name-mixedcase */
    address public bZRxTokenContract;
    address public bZxEtherContract;
    address public wethContract;
    address payable public vaultContract;
    address public oracleRegistryContract;
    address public bZxTo0xContract;
    address public bZxTo0xV2Contract;
    bool public DEBUG_MODE = false;
/* solhint-enable var-name-mixedcase */

    // Loan Orders
    mapping (bytes32 => LoanOrder) public orders; // mapping of loanOrderHash to on chain loanOrders
    mapping (bytes32 => LoanOrderAux) public orderAux; // mapping of loanOrderHash to on chain loanOrder auxiliary parameters
    mapping (bytes32 => uint) public orderFilledAmounts; // mapping of loanOrderHash to loanTokenAmount filled
    mapping (bytes32 => uint) public orderCancelledAmounts; // mapping of loanOrderHash to loanTokenAmount cancelled
    mapping (bytes32 => address) public orderLender; // mapping of loanOrderHash to lender (only one lender per order)

    // Loan Positions
    mapping (uint256 => LoanPosition) public loanPositions; // mapping of position ids to loanPositions
    mapping (bytes32 => mapping (address => uint)) public loanPositionsIds; // mapping of loanOrderHash to mapping of trader address to position id

    // Lists
    mapping (address => bytes32[]) public orderList; // mapping of lenders and trader addresses to array of loanOrderHashes
    mapping (bytes32 => mapping (address => ListIndex)) public orderListIndex; // mapping of loanOrderHash to mapping of lenders and trader addresses to ListIndex objects

    mapping (bytes32 => uint256[]) public orderPositionList; // mapping of loanOrderHash to array of order position ids

    PositionRef[] public positionList; // array of loans that need to be checked for liquidation or expiration
    mapping (uint256 => ListIndex) public positionListIndex; // mapping of position ids to ListIndex objects

    // Interest
    mapping (uint256 => uint) public interestTotal; // mapping of position ids to total interest escrowed when the loan opens
    mapping (uint256 => uint) public interestPaid; // mapping of position ids to amount of interest paid so far to a lender
    mapping (uint256 => uint) public interestRefunded; // mapping of position ids to amount of interest refunded to the trader
    mapping (uint256 => uint) public interestPaidDate; // mapping of position ids to timestamp of last interest pay date

    // Other Storage
    mapping (address => address) public oracleAddresses; // mapping of oracles to their current logic contract
    mapping (bytes32 => mapping (address => bool)) public preSigned; // mapping of hash => signer => signed
    mapping (address => mapping (address => bool)) public allowedValidators; // mapping of signer => validator => approved
    mapping (bytes => bytes) internal db; // general use storage container
}
