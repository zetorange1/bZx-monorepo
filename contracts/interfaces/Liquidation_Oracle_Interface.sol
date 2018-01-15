pragma solidity ^0.4.9;

contract Liquidation_Oracle_Interface {
    
    // Percentage of interest retained as fee
    // Must be between 0 and 100
    uint8 public interestFeeRate;

    // Address of the b0x contract
    address public B0X_CONTRACT;

    // Address of the b0x vault contract.
    address public VAULT_CONTRACT;

    // A trader calls this to close their own trade at any time
    function closeTrade(
        bytes32 lendOrderHash)
        public
        returns (bool);

    // Anyone can call this to liquidate the trade
    // Logic should be added to check if the trade meets the requirments for liquidation
    function liquidateTrade(
        bytes32 lendOrderHash,
        address trader)
        public
        returns (bool);

    // Should return a ratio of currentMarginAmount / liquidationMarginAmount
    function getMarginRatio(
        bytes32 lendOrderHash,
        address trader)
        public
        view
        returns (uint);

    // Returns True is the trade should be liquidated
    // Note: This can make use of the getMarginRatio() function, but it doesn't have to
    function shouldLiquidate(
        bytes32 lendOrderHash,
        address trader)
        public
        view
        returns (bool);

    function getRateData(
        address lendTokenAddress,
        address marginTokenAddress,
        address tradeTokenAddress)
        public 
        view 
        returns (uint marginToLendRate, uint tradeToMarginRate);
}
