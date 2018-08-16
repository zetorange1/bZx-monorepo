
pragma solidity 0.4.24;


contract GasTracker {

    uint internal gasUsed;

    modifier tracksGas() {
        // tx call 21k gas
        gasUsed = gasleft() + 21000;

        _; // modified function body inserted here

        gasUsed = 0; // zero out the storage so we don't persist anything
    }
}
