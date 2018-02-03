
pragma solidity ^0.4.19;

interface KyberNetwork_Interface {

    /// @dev returns number of reserves
    /// @return number of reserves
    function getNumReserves() public constant returns(uint);


    /// @notice use token address ETH_TOKEN_ADDRESS for ether
    /// @dev information on conversion rate from source to dest in specific reserve manager
    /// @param source Source token
    /// @param dest   Destinatoin token
    /// @return (conversion rate,experation block,dest token balance of reserve)
    function getRate( address source, address dest, uint reserveIndex ) public constant returns(uint rate, uint expBlock, uint balance);


    /// @notice use token address ETH_TOKEN_ADDRESS for ether
    /// @dev information on conversion rate to a front end application
    /// @param source Source token
    /// @param dest   Destinatoin token
    /// @return rate. If not available returns 0.
    function getPrice( address source, address dest ) public constant returns(uint);


    /// @notice use token address ETH_TOKEN_ADDRESS for ether
    /// @dev makes a trade between source and dest token and send dest token to destAddress
    /// @param source Source token
    /// @param srcAmount amount of source tokens
    /// @param dest   Destinatoin token
    /// @param destAddress Address to send tokens to
    /// @param maxDestAmount A limit on the amount of dest tokens
    /// @param minConversionRate The minimal conversion rate. If actual rate is lower, trade is canceled.
    /// @param throwOnFailure if true and trade is not completed, then function throws.
    /// @return amount of actual dest tokens
    function trade( address source, uint srcAmount,
                    address dest, address destAddress, uint maxDestAmount,
                    uint minConversionRate,
                    bool throwOnFailure ) public payable returns(uint);
}
