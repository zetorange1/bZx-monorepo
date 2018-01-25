
pragma solidity 0.4.18;

// Interface to the 0xProject Exchange contract

contract Exchange_Interface {

    address public ZRX_TOKEN_CONTRACT;

    event LogError(uint8 indexed errorId, bytes32 indexed orderHash);

    function fillOrder(
          address[5] orderAddresses,
          uint[6] orderValues,
          uint fillTakerTokenAmount,
          bool shouldThrowOnInsufficientBalanceOrAllowance,
          uint8 v,
          bytes32 r,
          bytes32 s)
          public
          returns (uint filledTakerTokenAmount);

    function isValidSignature(
        address signer,
        bytes32 hash,
        uint8 v,
        bytes32 r,
        bytes32 s)
        public
        constant
        returns (bool);
}
