
pragma solidity ^0.4.24; // solhint-disable-line compiler-fixed

import "./tokens/EIP20Wrapper.sol";
import "./modifiers/B0xOwnable.sol";


contract B0xVault is EIP20Wrapper, B0xOwnable {

    // Only the b0x contract can directly deposit ether
    function() public payable onlyB0x {}

    function withdrawEther(
        address to,
        uint value)
        public
        onlyB0x
        returns (bool)
    {
        uint amount = value;
        if (amount > address(this).balance) {
            amount = address(this).balance;
        }

        return (to.send(amount)); // solhint-disable-line check-send-result, multiple-sends
    }

    function depositToken(
        address token,
        address from,
        uint tokenAmount)
        public
        onlyB0x
        returns (bool)
    {
        if (tokenAmount == 0) {
            return false;
        }
        
        eip20TransferFrom(
            token,
            from,
            this,
            tokenAmount);

        return true;
    }

    function withdrawToken(
        address token,
        address to,
        uint tokenAmount)
        public
        onlyB0x
        returns (bool)
    {
        if (tokenAmount == 0) {
            return false;
        }
        
        eip20Transfer(
            token,
            to,
            tokenAmount);

        return true;
    }

    function transferTokenFrom(
        address token,
        address from,
        address to,
        uint tokenAmount)
        public
        onlyB0x
        returns (bool)
    {
        if (tokenAmount == 0) {
            return false;
        }
        
        eip20TransferFrom(
            token,
            from,
            to,
            tokenAmount);

        return true;
    }
}
