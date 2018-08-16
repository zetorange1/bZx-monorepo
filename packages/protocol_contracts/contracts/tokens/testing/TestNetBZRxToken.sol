
pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "../BaseToken.sol";


contract TestNetBZRxToken is Ownable, BaseToken( // solhint-disable-line no-empty-blocks
    10**(50+18),
    "BZRX Protocol Token", 
    18,
    "BZRX"
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