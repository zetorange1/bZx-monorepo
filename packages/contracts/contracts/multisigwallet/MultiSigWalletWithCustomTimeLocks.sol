/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Adapted from MultiSigWalletWithTimeLock.sol, Copyright 2017 ZeroEx Intl.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.2;

import "./MultiSigWallet.sol";


contract MultiSigWalletWithCustomTimeLocks is MultiSigWallet {

    event ConfirmationTimeSet(uint256 indexed transactionId, uint256 confirmationTime);
    event TimeLockDefaultChange(uint256 secondsTimeLockedDefault);
    event TimeLockCustomChange(string funcHeader, uint256 secondsTimeLockedCustom);
    event TimeLockCustomRemove(string funcHeader);

    struct CustomTimeLock {
        uint256 secondsTimeLocked;
        bool isSet;
    }
    
    uint256 public secondsTimeLockedDefault; // default timelock for functions without a custom setting
    mapping (bytes4 => CustomTimeLock) public customTimeLocks; // mapping of function headers to CustomTimeLock structs
    string[] public customTimeLockFunctions; // array of functions with custom values

    mapping (uint256 => uint) public confirmationTimes;

    modifier notFullyConfirmed(uint256 transactionId) {
        require(!isConfirmed(transactionId));
        _;
    }

    modifier fullyConfirmed(uint256 transactionId) {
        require(isConfirmed(transactionId));
        _;
    }

    modifier pastTimeLock(uint256 transactionId) {
        uint256 timelock = getSecondsTimeLockedByTx(transactionId);
        require(timelock == 0 || block.timestamp >= confirmationTimes[transactionId] + timelock);
        _;
    }

    /*
     * Public functions
     */

    /// @dev Contract constructor sets initial owners, required number of confirmations, and time lock.
    /// @param _owners List of initial owners.
    /// @param _required Number of required confirmations.
    /// @param _secondsTimeLockedDefault Default duration needed after a transaction is confirmed and before it becomes executable, in seconds.
    constructor(address[] memory _owners, uint256 _required, uint256 _secondsTimeLockedDefault)
        public
        MultiSigWallet(_owners, _required)
    {
        secondsTimeLockedDefault = _secondsTimeLockedDefault;

        customTimeLockFunctions.push("transferOwnership(address)");
        customTimeLocks[bytes4(keccak256("transferOwnership(address)"))].isSet = true;
        customTimeLocks[bytes4(keccak256("transferOwnership(address)"))].secondsTimeLocked = 2419200; // 28 days

        customTimeLockFunctions.push("transferBZxOwnership(address)");
        customTimeLocks[bytes4(keccak256("transferBZxOwnership(address)"))].isSet = true;
        customTimeLocks[bytes4(keccak256("transferBZxOwnership(address)"))].secondsTimeLocked = 2419200;

        customTimeLockFunctions.push("replaceContract(address)");
        customTimeLocks[bytes4(keccak256("replaceContract(address)"))].isSet = true;
        customTimeLocks[bytes4(keccak256("replaceContract(address)"))].secondsTimeLocked = 2419200;

        customTimeLockFunctions.push("setTarget(string,address)");
        customTimeLocks[bytes4(keccak256("setTarget(string,address)"))].isSet = true;
        customTimeLocks[bytes4(keccak256("setTarget(string,address)"))].secondsTimeLocked = 2419200;

        customTimeLockFunctions.push("setBZxAddresses(address,address,address,address,address)");
        customTimeLocks[bytes4(keccak256("setBZxAddresses(address,address,address,address,address)"))].isSet = true;
        customTimeLocks[bytes4(keccak256("setBZxAddresses(address,address,address,address,address)"))].secondsTimeLocked = 2419200;

        customTimeLockFunctions.push("setVault(address)");
        customTimeLocks[bytes4(keccak256("setVault(address)"))].isSet = true;
        customTimeLocks[bytes4(keccak256("setVault(address)"))].secondsTimeLocked = 2419200;

        customTimeLockFunctions.push("changeDefaultTimeLock(uint256)");
        customTimeLocks[bytes4(keccak256("changeDefaultTimeLock(uint256)"))].isSet = true;
        customTimeLocks[bytes4(keccak256("changeDefaultTimeLock(uint256)"))].secondsTimeLocked = 2419200;

        customTimeLockFunctions.push("changeCustomTimeLock(string,uint256)");
        customTimeLocks[bytes4(keccak256("changeCustomTimeLock(string,uint256)"))].isSet = true;
        customTimeLocks[bytes4(keccak256("changeCustomTimeLock(string,uint256)"))].secondsTimeLocked = 2419200;

        customTimeLockFunctions.push("removeCustomTimeLock(string)");
        customTimeLocks[bytes4(keccak256("removeCustomTimeLock(string)"))].isSet = true;
        customTimeLocks[bytes4(keccak256("removeCustomTimeLock(string)"))].secondsTimeLocked = 2419200;

        customTimeLockFunctions.push("toggleTargetPause(string,bool)");
        customTimeLocks[bytes4(keccak256("toggleTargetPause(string,bool)"))].isSet = true;
        customTimeLocks[bytes4(keccak256("toggleTargetPause(string,bool)"))].secondsTimeLocked = 0;

        customTimeLockFunctions.push("toggleDebug(bool)");
        customTimeLocks[bytes4(keccak256("toggleDebug(bool)"))].isSet = true;
        customTimeLocks[bytes4(keccak256("toggleDebug(bool)"))].secondsTimeLocked = 0;
    }

    /// @dev Changes the default duration of the time lock for transactions.
    /// @param _secondsTimeLockedDefault Default duration needed after a transaction is confirmed and before it becomes executable, in seconds.
    function changeDefaultTimeLock(uint256 _secondsTimeLockedDefault)
        public
        onlyWallet
    {
        secondsTimeLockedDefault = _secondsTimeLockedDefault;
        emit TimeLockDefaultChange(_secondsTimeLockedDefault);
    }

    /// @dev Changes the custom duration of the time lock for transactions to a specific function.
    /// @param _funcId example: "functionName(address[8],uint256[11],bytes,address,uint256,bytes)"
    /// @param _secondsTimeLockedCustom Custom duration needed after a transaction is confirmed and before it becomes executable, in seconds.
    function changeCustomTimeLock(string memory _funcId, uint256 _secondsTimeLockedCustom)
        public
        onlyWallet
    {
        bytes4 f = bytes4(keccak256(abi.encodePacked(_funcId)));
        if (!customTimeLocks[f].isSet) {
            customTimeLocks[f].isSet = true;
            customTimeLockFunctions.push(_funcId);
        }
        customTimeLocks[f].secondsTimeLocked = _secondsTimeLockedCustom;
        emit TimeLockCustomChange(_funcId, _secondsTimeLockedCustom);
    }

    /// @dev Removes the custom duration of the time lock for transactions to a specific function.
    /// @param _funcId example: "functionName(address[8],uint256[11],bytes,address,uint256,bytes)"
    function removeCustomTimeLock(string memory _funcId)
        public
        onlyWallet
    {
        bytes4 f = bytes4(keccak256(abi.encodePacked(_funcId)));
        if (!customTimeLocks[f].isSet)
            revert();

        for (uint256 i=0; i < customTimeLockFunctions.length; i++) {
            if (keccak256(bytes(customTimeLockFunctions[i])) == keccak256(bytes(_funcId))) {
                if (i < customTimeLockFunctions.length - 1)
                    customTimeLockFunctions[i] = customTimeLockFunctions[customTimeLockFunctions.length - 1];
                customTimeLockFunctions.length--;

                customTimeLocks[f].secondsTimeLocked = 0;
                customTimeLocks[f].isSet = false;

                emit TimeLockCustomRemove(_funcId);

                break;
            }
        }
    }

    /// @dev Allows an owner to confirm a transaction.
    /// @param transactionId Transaction ID.
    function confirmTransaction(uint256 transactionId)
        public
        ownerExists(msg.sender)
        transactionExists(transactionId)
        notConfirmed(transactionId, msg.sender)
        notFullyConfirmed(transactionId)
    {
        confirmations[transactionId][msg.sender] = true;
        emit Confirmation(msg.sender, transactionId);
        if (getSecondsTimeLockedByTx(transactionId) > 0 && isConfirmed(transactionId)) {
            setConfirmationTime(transactionId, block.timestamp);
        }
    }

    /// @dev Allows an owner to revoke a confirmation for a transaction.
    /// @param transactionId Transaction ID.
    function revokeConfirmation(uint256 transactionId)
        public
        ownerExists(msg.sender)
        confirmed(transactionId, msg.sender)
        notExecuted(transactionId)
        notFullyConfirmed(transactionId)
    {
        confirmations[transactionId][msg.sender] = false;
        emit Revocation(msg.sender, transactionId);
    }

    /// @dev Allows anyone to execute a confirmed transaction.
    /// @param transactionId Transaction ID.
    function executeTransaction(uint256 transactionId)
        public
        notExecuted(transactionId)
        fullyConfirmed(transactionId)
        pastTimeLock(transactionId)
    {
        Transaction storage txn = transactions[transactionId];
        txn.executed = true;
        if (external_call(txn.destination, txn.value, txn.data.length, txn.data))
            emit Execution(transactionId);
        else {
            emit ExecutionFailure(transactionId);
            txn.executed = false;
        }
    }

    /// @dev Returns the custom timelock for a function, or the default timelock if a custom value isn't set
    /// @param _funcId Function signature (encoded bytes)
    /// @return Timelock value
    function getSecondsTimeLocked(bytes4 _funcId)
        public
        view
        returns (uint256)
    {
        if (customTimeLocks[_funcId].isSet)
            return customTimeLocks[_funcId].secondsTimeLocked;
        else
            return secondsTimeLockedDefault;
    }

    /// @dev Returns the custom timelock for a function, or the default timelock if a custom value isn't set
    /// @param _funcId Function signature (complete string)
    /// @return Timelock value
    function getSecondsTimeLockedByString(string memory _funcId)
        public
        view
        returns (uint256)
    {
        return (getSecondsTimeLocked(bytes4(keccak256(abi.encodePacked(_funcId)))));
    }

    /// @dev Returns the custom timelock for a transaction, or the default timelock if a custom value isn't set
    /// @param transactionId Transaction ID.
    /// @return Timelock value
    function getSecondsTimeLockedByTx(uint256 transactionId)
        public
        view
        returns (uint256)
    {
        Transaction memory txn = transactions[transactionId];
        bytes memory data = txn.data;
        bytes4 funcId;
        assembly {
            funcId := mload(add(data, 32))
        }
        return (getSecondsTimeLocked(funcId));
    }

    /// @dev Returns the number of seconds until a fully confirmed transaction can be executed
    /// @param transactionId Transaction ID.
    /// @return Seconds in the timelock remaining
    function getTimeLockSecondsRemaining(uint256 transactionId)
        public
        view
        returns (uint256)
    {
        uint256 timelock = getSecondsTimeLockedByTx(transactionId);
        if (timelock > 0 && confirmationTimes[transactionId] > 0) {
            uint256 timelockEnding = confirmationTimes[transactionId] + timelock;
            if (timelockEnding > block.timestamp)
                return timelockEnding - block.timestamp;
        }
        return 0;
    }

    /*
     * Internal functions
     */

    /// @dev Sets the time of when a submission first passed.
    function setConfirmationTime(uint256 transactionId, uint256 confirmationTime)
        internal
    {
        confirmationTimes[transactionId] = confirmationTime;
        emit ConfirmationTimeSet(transactionId, confirmationTime);
    }
}
