
pragma solidity ^0.4.23;

/**
 * @title EIP20/ERC20 wrapper using low-level calls
 * @dev see https://github.com/ethereum/EIPs/issues/20
 */
contract EIP20Wrapper {

    function eip20Transfer(
        address token,
        address to,
        uint256 value)
        internal
        returns (bool) {

        // bytes4(keccak256("transfer(address,uint256)")) == 0xa9059cbb
        require(token.call(0xa9059cbb, to, value));
        return true;
    }

    function eip20TransferFrom(
        address token,
        address from,
        address to,
        uint256 value)
        internal
        returns (bool) {

        // bytes4(keccak256("transferFrom(address,address,uint256)")) == 0x23b872dd
        require(token.call(0x23b872dd, from, to, value));
        return true;
    }

    function eip20Approve(
        address token,
        address spender,
        uint256 value)
        internal
        returns (bool) {

        // bytes4(keccak256("approve(address,uint256)")) == 0x095ea7b3
        require(token.call(0x095ea7b3, spender, value));
        return true;
    }
}
