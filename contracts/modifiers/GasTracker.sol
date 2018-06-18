
pragma solidity ^0.4.24; // solhint-disable-line compiler-fixed


contract GasTracker {

    uint internal gasUsed;

    modifier tracksGas() {
        gasUsed = gasleft();

        _; // modified function body inserted here

        gasUsed = 0; // zero out the storage so we don't persist anything
    }
}
