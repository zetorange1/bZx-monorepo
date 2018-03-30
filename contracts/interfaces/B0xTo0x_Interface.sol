
pragma solidity ^0.4.21;

interface B0xTo0x_Interface {

   function take0xTrade(
        address trader,
        address vaultAddress,
        uint sourceTokenAmountToUse,
        bytes orderData0x, // 0x order arguments, converted to hex, padded to 32 bytes and concatenated
        bytes signiture0x) // ECDSA of the 0x order
        public
        returns (
            address destTokenAddress,
            uint destTokenAmount,
            uint sourceTokenUsedAmount);
}
