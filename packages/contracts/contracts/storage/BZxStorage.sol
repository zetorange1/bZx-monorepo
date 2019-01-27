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
    mapping (bytes32 => uint256) public orderFilledAmounts; // mapping of loanOrderHash to loanTokenAmount filled
    mapping (bytes32 => uint256) public orderCancelledAmounts; // mapping of loanOrderHash to loanTokenAmount cancelled
    mapping (bytes32 => address) public orderLender; // mapping of loanOrderHash to lender (only one lender per order)

    // Loan Positions
    mapping (uint256 => LoanPosition) public loanPositions; // mapping of position ids to loanPositions
    mapping (bytes32 => mapping (address => uint256)) public loanPositionsIds; // mapping of loanOrderHash to mapping of trader address to position id

    // Lists
    mapping (address => bytes32[]) public orderList; // mapping of lenders and trader addresses to array of loanOrderHashes
    mapping (bytes32 => mapping (address => ListIndex)) public orderListIndex; // mapping of loanOrderHash to mapping of lenders and trader addresses to ListIndex objects

    mapping (bytes32 => uint256[]) public orderPositionList; // mapping of loanOrderHash to array of order position ids

    PositionRef[] public positionList; // array of loans that need to be checked for liquidation or expiration
    mapping (uint256 => ListIndex) public positionListIndex; // mapping of position ids to ListIndex objects

    // Interest
    mapping (address => mapping (address => uint256)) public tokenInterestOwed; // mapping of lender address to mapping of interest token address to amount of interest owed for all loans (assuming they go to full term)
    mapping (address => mapping (address => mapping (address => LenderInterest))) public lenderOracleInterest; // mapping of lender address to mapping of oracle to mapping of interest token to LenderInterest objects
    mapping (bytes32 => LenderInterest) public lenderOrderInterest; // mapping of loanOrderHash to LenderInterest objects
    mapping (uint256 => TraderInterest) public traderLoanInterest; // mapping of position ids to TraderInterest objects

    // Other Storage
    mapping (address => address) public oracleAddresses; // mapping of oracles to their current logic contract
    mapping (bytes32 => mapping (address => bool)) public preSigned; // mapping of hash => signer => signed
    mapping (address => mapping (address => bool)) public allowedValidators; // mapping of signer => validator => approved

    // General Purpose
    mapping (bytes => uint256) internal dbUint256;
    mapping (bytes => uint256[]) internal dbUint256Array;
    mapping (bytes => address) internal dbAddress;
    mapping (bytes => address[]) internal dbAddressArray;
    mapping (bytes => bool) internal dbBool;
    mapping (bytes => bool[]) internal dbBoolArray;
    mapping (bytes => bytes32) internal dbBytes32;
    mapping (bytes => bytes32[]) internal dbBytes32Array;
    mapping (bytes => bytes) internal dbBytes;
    mapping (bytes => bytes[]) internal dbBytesArray;
}
