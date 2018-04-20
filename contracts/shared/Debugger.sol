
pragma solidity ^0.4.23;

contract Debugger {
    
    bool public DEBUG_MODE = false;
    
    event DebugLine(uint lineNumber);

    /*
    event DebugLog(string logMessage, uint logValue, address logAddress, bytes32 logData);

    function debugLog(
        string logMsg)
        internal
    {
        if (!DEBUG_MODE)
            return;
        
        emit DebugLog(logMsg, 0, 0x0, 0x0);
    }
    
    function debugLog(
        string logMsg,
        uint logValue)
        internal
    {
        if (!DEBUG_MODE)
            return;

        emit DebugLog(logMsg, logValue, 0x0, 0x0);
    }
    
    function debugLog(
        string logMsg,
        address logAddr)
        internal
    {
        if (!DEBUG_MODE)
            return;

        emit DebugLog(logMsg, 0, logAddr, 0x0);
    }
    
    function debugLog(
        string logMsg,
        bytes32 logData)
        internal
    {
        if (!DEBUG_MODE)
            return;

        emit DebugLog(logMsg, 0, 0x0, logData);
    }

    function debugLog(
        string logMsg,
        uint logValue,
        bytes32 logData)
        internal
    {
        if (!DEBUG_MODE)
            return;

        emit DebugLog(logMsg, logValue, 0x0, logData);
    }

    function debugLog(
        string logMsg,
        uint logValue,
        address logAddr,
        bytes32 logData)
        internal
    {
        if (!DEBUG_MODE)
            return;

        emit DebugLog(logMsg, logValue, logAddr, logData);
    }
    */

    function voidOrRevert(uint lineno) 
        internal
    {
        if (!DEBUG_MODE) {
            revert();
        }

        emit DebugLine(lineno);
        return;
    }
    
    function intOrRevert(uint retVal, uint lineno) 
        internal 
        returns (uint)
    {
        if (!DEBUG_MODE) {
            revert();
        }

        emit DebugLine(lineno);
        return retVal;
    }

    function boolOrRevert(bool retVal, uint lineno) 
        internal 
        returns (bool)
    {
        if (!DEBUG_MODE) {
            revert();
        }

        emit DebugLine(lineno);
        return retVal;
    }
}
