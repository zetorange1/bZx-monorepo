pragma solidity ^0.4.9;

contract Helpers {
    
    bool public DEBUG_MODE = false;
    
    function voidOrRevert() 
        internal
        view
    {
        if (!DEBUG_MODE) {
            revert();
        }

        return;
    }
    
    function intOrRevert(uint retVal) 
        internal
        view 
        returns (uint)
    {
        if (!DEBUG_MODE) {
            revert();
        }

        return retVal;
    }

    function boolOrRevert(bool retVal) 
        internal
        view 
        returns (bool)
    {
        if (!DEBUG_MODE) {
            revert();
        }

        return retVal;
    }
}
