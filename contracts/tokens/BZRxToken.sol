
pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "./BaseToken.sol";


// 1 billion tokens (18 decimal places)
contract BZRxToken is Ownable, BaseToken( // solhint-disable-line no-empty-blocks
    1000000000000000000000000000,
    "BZRX-Fake Protocol Token", 
    18,
    "BZRXFAKE"
) {
    function renameToken(
        string _newName,
        string _newSymbol
        )
        public
        onlyOwner
    {
        name = _newName;
        symbol = _newSymbol;
    }
}