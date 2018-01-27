
pragma solidity 0.4.18;

interface B0xTo0x_Interface {

   function take0xTrade(
        bytes32 loanOrderHash, // b0x will only pass in a valid loanOrderHash, so no check needed
        address oracleAddress,
        uint loanTokenAmountToUse,
        bytes orderData0x, // 0x order arguments converted to hex, padded to 32 bytes, and concatenated
        bytes signature)
        public
        returns (
            address tradeTokenAddress,
            uint tradeTokenAmount,
            uint loanTokenUsedAmount);
}
