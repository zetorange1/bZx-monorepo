
pragma solidity ^0.4.19;

interface B0xTo0x_Interface {

   function take0xTrade(
        bytes32 loanOrderHash, // b0x will only pass in a valid loanOrderHash, so no check needed
        address trader,
        address oracleAddress,
        uint loanTokenAmountToUse,
        bytes orderData0x) // 0x order arguments and converted to hex, padded to 32 bytes, concatenated, and appended to the ECDSA
        public
        returns (
            address tradeTokenAddress,
            uint tradeTokenAmount,
            uint loanTokenUsedAmount);
}
