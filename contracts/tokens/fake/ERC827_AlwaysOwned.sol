
pragma solidity ^0.4.22;

import './ERC20_AlwaysOwned.sol';


/**
* @title FAKE ERC827 token
*
* @dev FAKE ERC827 token where all accounts contain the total supply of the coin (a paradox).
* @dev Note this is only to facilitate easier testing and should only be used in a private dev network!
*/
contract ERC827_AlwaysOwned is ERC20_AlwaysOwned {

    function approve(address _spender, uint256 _value, bytes _data) public returns (bool) {
        require(_spender != address(this));

        super.approve(_spender, _value);

        require(_spender.call(_data));
        return true;
    }

    function transfer(address _to, uint256 _value, bytes _data) public returns (bool) {
        require(_to != address(this));

        super.transfer(_to, _value);

        require(_to.call(_data));
        return true;
    }

    function transferFrom(address _from, address _to, uint256 _value, bytes _data) public returns (bool) {
        require(_to != address(this));

        super.transferFrom(_from, _to, _value);

        require(_to.call(_data));
        return true;
    }

    function increaseApproval(address _spender, uint _addedValue, bytes _data) public returns (bool) {
        require(_spender != address(this));

        super.increaseApproval(_spender, _addedValue);

        require(_spender.call(_data));

        return true;
    }

    function decreaseApproval(address _spender, uint _subtractedValue, bytes _data) public returns (bool) {
        require(_spender != address(this));

        super.decreaseApproval(_spender, _subtractedValue);

        require(_spender.call(_data));

        return true;
    }
}
