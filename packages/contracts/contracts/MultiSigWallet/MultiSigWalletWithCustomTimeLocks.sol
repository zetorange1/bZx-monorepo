/*

  Copyright 2018 bZeroX, LLC
  Adapted from MultiSigWalletWithTimeLock.sol, Copyright 2017 ZeroEx Intl.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.

*/

pragma solidity 0.4.24;

import "./MultiSigWallet.sol";

contract MultiSigWalletWithCustomTimeLocks is MultiSigWallet {

    event ConfirmationTimeSet(uint indexed transactionId, uint confirmationTime);
    event TimeLockDefaultChange(uint secondsTimeLockedDefault);
    event TimeLockCustomChange(string funcHeader, uint secondsTimeLockedCustom);
    event TimeLockCustomRemove(string funcHeader);

    struct CustomTimeLock {
        uint secondsTimeLocked;
        bool isSet;
    }
    
    uint public secondsTimeLockedDefault; // default timelock for functions without a custom setting
    mapping (bytes4 => CustomTimeLock) public customTimeLocks; // mapping of function headers to CustomTimeLock structs
    string[] public customTimeLockFunctions; // array of functions with custom values

    mapping (uint => uint) public confirmationTimes;

    modifier notFullyConfirmed(uint transactionId) {
        require(!isConfirmed(transactionId));
        _;
    }

    modifier fullyConfirmed(uint transactionId) {
        require(isConfirmed(transactionId));
        _;
    }

    modifier pastTimeLock(uint transactionId) {
        uint timelock = getSecondsTimeLockedByTx(transactionId);
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
    constructor(address[] _owners, uint _required, uint _secondsTimeLockedDefault)
        public
        MultiSigWallet(_owners, _required)
    {
        secondsTimeLockedDefault = _secondsTimeLockedDefault;

        customTimeLockFunctions.push("transferOwnership(address)");
        customTimeLocks[0xf2fde38b].isSet = true;
        customTimeLocks[0xf2fde38b].secondsTimeLocked = 2419200; // 28 days

        customTimeLockFunctions.push("transferBZxOwnership(address)");
        customTimeLocks[0x72e98a79].isSet = true;
        customTimeLocks[0x72e98a79].secondsTimeLocked = 2419200;

        customTimeLockFunctions.push("replaceContract(address)");
        customTimeLocks[0xfb08fdaa].isSet = true;
        customTimeLocks[0xfb08fdaa].secondsTimeLocked = 2419200;

        customTimeLockFunctions.push("setTarget(string,address)");
        customTimeLocks[0xc11296fc].isSet = true;
        customTimeLocks[0xc11296fc].secondsTimeLocked = 2419200;

        customTimeLockFunctions.push("setBZxAddresses(address,address,address,address)");
        customTimeLocks[0x0dc2e439].isSet = true;
        customTimeLocks[0x0dc2e439].secondsTimeLocked = 2419200;

        customTimeLockFunctions.push("setVault(address)");
        customTimeLocks[0x6817031b].isSet = true;
        customTimeLocks[0x6817031b].secondsTimeLocked = 2419200;

        customTimeLockFunctions.push("changeDefaultTimeLock(uint256)");
        customTimeLocks[0x98257d84].isSet = true;
        customTimeLocks[0x98257d84].secondsTimeLocked = 2419200;

        customTimeLockFunctions.push("changeCustomTimeLock(string,uint256)");
        customTimeLocks[0xa2035fef].isSet = true;
        customTimeLocks[0xa2035fef].secondsTimeLocked = 2419200;

        customTimeLockFunctions.push("removeCustomTimeLock(string)");
        customTimeLocks[0x64df19da].isSet = true;
        customTimeLocks[0x64df19da].secondsTimeLocked = 2419200;

        customTimeLockFunctions.push("toggleTargetPause(string,bool)");
        customTimeLocks[0x48fcc6db].isSet = true;
        customTimeLocks[0x48fcc6db].secondsTimeLocked = 0;

        customTimeLockFunctions.push("toggleDebug(bool)");
        customTimeLocks[0x4491645b].isSet = true;
        customTimeLocks[0x4491645b].secondsTimeLocked = 0;
    }

    /// @dev Changes the default duration of the time lock for transactions.
    /// @param _secondsTimeLockedDefault Default duration needed after a transaction is confirmed and before it becomes executable, in seconds.
    function changeDefaultTimeLock(uint _secondsTimeLockedDefault)
        public
        onlyWallet
    {
        secondsTimeLockedDefault = _secondsTimeLockedDefault;
        emit TimeLockDefaultChange(_secondsTimeLockedDefault);
    }

    /// @dev Changes the custom duration of the time lock for transactions to a specific function.
    /// @param _funcId example: "functionName(address[6],uint256[10],address,uint256,bytes)"
    /// @param _secondsTimeLockedCustom Custom duration needed after a transaction is confirmed and before it becomes executable, in seconds.
    function changeCustomTimeLock(string _funcId, uint _secondsTimeLockedCustom)
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
    /// @param _funcId example: "functionName(address[6],uint256[10],address,uint256,bytes)"
    function removeCustomTimeLock(string _funcId)
        public
        onlyWallet
    {
        bytes4 f = bytes4(keccak256(abi.encodePacked(_funcId)));
        if (!customTimeLocks[f].isSet)
            revert();

        for (uint i=0; i < customTimeLockFunctions.length; i++) {
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
    function confirmTransaction(uint transactionId)
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
    function revokeConfirmation(uint transactionId)
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
    function executeTransaction(uint transactionId)
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
        returns (uint)
    {
        if (customTimeLocks[_funcId].isSet)
            return customTimeLocks[_funcId].secondsTimeLocked;
        else
            return secondsTimeLockedDefault;
    }

    /// @dev Returns the custom timelock for a function, or the default timelock if a custom value isn't set
    /// @param _funcId Function signature (complete string)
    /// @return Timelock value
    function getSecondsTimeLockedByString(string _funcId)
        public
        view
        returns (uint)
    {
        return (getSecondsTimeLocked(bytes4(keccak256(abi.encodePacked(_funcId)))));
    }

    /// @dev Returns the custom timelock for a transaction, or the default timelock if a custom value isn't set
    /// @param transactionId Transaction ID.
    /// @return Timelock value
    function getSecondsTimeLockedByTx(uint transactionId)
        public
        view
        returns (uint)
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
    function getTimeLockSecondsRemaining(uint transactionId)
        public
        view
        returns (uint)
    {
        uint timelock = getSecondsTimeLockedByTx(transactionId);
        if (timelock > 0 && confirmationTimes[transactionId] > 0) {
            uint timelockEnding = confirmationTimes[transactionId] + timelock;
            if (timelockEnding > block.timestamp)
                return timelockEnding - block.timestamp;
        }
        return 0;
    }

    /*
     * Internal functions
     */

    /// @dev Sets the time of when a submission first passed.
    function setConfirmationTime(uint transactionId, uint confirmationTime)
        internal
    {
        confirmationTimes[transactionId] = confirmationTime;
        emit ConfirmationTimeSet(transactionId, confirmationTime);
    }
}
