
pragma solidity ^0.4.21;

contract GasTracker {

    uint internal gasUsed;

    modifier tracksGas() {
        gasUsed = gasleft();

        _; // modified function body inserted here

        gasUsed = 0; // zero out the storage so we don't persist anything
    }
}
