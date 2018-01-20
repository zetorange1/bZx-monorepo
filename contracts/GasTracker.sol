pragma solidity ^0.4.18;

contract GasTracker {

    uint internal gasUsed;

    modifier tracksGas() {
        gasUsed = msg.gas;

        _; // modified function body inserted here

        gasUsed = 0; // zero out the storage so we don't persist anything
    }
}
