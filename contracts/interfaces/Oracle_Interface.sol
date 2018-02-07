
pragma solidity ^0.4.19;

interface Oracle_Interface {

    // Called by b0x automatically, but can be called outside b0x
    // Appropriate security logic (ex: ownerOnly) should be put in place if appropriate
    // loanOrderHash is provided and can be used to reference the order in b0x.
    // gasUsed can be provided for optional gas refunds.
    function didTakeOrder(
        address taker,
        bytes32 loanOrderHash,
        uint gasUsed)
        public
        returns (bool);

    // Called by b0x automatically, but can be called outside b0x
    // Appropriate security logic (ex: ownerOnly) should be put in place if appropriate
    // loanOrderHash is provided and can be used to reference the order in b0x.
    // Details of the trade are provided.
    // usedGas can be provided for optional gas refunds.
    function didOpenTrade(
        bytes32 loanOrderHash,
        address trader,
        address tradeTokenAddress,
        uint tradeTokenAmount,
        uint gasUsed)
        public
        returns (bool);

    // Called by b0x to tell the oracle that interest has been sent to the oracle
    // Appropriate security logic (ex: ownerOnly) should be put in place if appropriate
    // loanOrderHash is provided and can be used to reference the order in b0x.
    // usedGas can be provided for optional gas refunds.
    function didPayInterest(
        bytes32 loanOrderHash,
        address trader,
        address lender,
        address interestTokenAddress,
        uint amount,
        uint gasUsed)
        public
        returns (bool);

    // Called by b0x automatically, but can be called outside b0x
    // Appropriate security logic (ex: ownerOnly) should be put in place if appropriate
    // loanOrderHash is provided and can be used to reference the order in b0x.
    // isLiquidation is True if the trade was liquidated by a 3rd party, or False if closed by the trader.
    // usedGas can be provided for optional gas refunds.
    function didCloseTrade(
        bytes32 loanOrderHash,
        address trader,
        bool isLiquidation,
        uint gasUsed)
        public
        returns (bool);

    // Called by b0x automatically, but can be called outside b0x
    // Appropriate security logic (ex: ownerOnly) should be put in place if appropriate
    // loanOrderHash is provided and can be used to reference the order in b0x.
    // gasUsed can be provided for optional gas refunds.
    function didDepositCollateral(
        address taker,
        bytes32 loanOrderHash,
        uint gasUsed)
        public
        returns (bool);

    // Called by b0x automatically, but can be called outside b0x
    // Appropriate security logic (ex: ownerOnly) should be put in place if appropriate
    // loanOrderHash is provided and can be used to reference the order in b0x.
    // gasUsed can be provided for optional gas refunds.
    function didChangeCollateral(
        address taker,
        bytes32 loanOrderHash,
        uint gasUsed)
        public
        returns (bool);

    // Called by b0x automatically, but can be called outside b0x
    // Appropriate security logic (ex: ownerOnly) should be put in place if appropriate    
    // This attmpts to trade the token using some on-chain method if the conditions for trading are met
    function verifyAndDoTrade(
        bytes32 loanOrderHash,
        address trader,
        address sourceTokenAddress,
        address destTokenAddress,
        uint sourceTokenAmount,
        bool isLiquidation)
        public
        returns (uint);

    // Returns True is the trade should be liquidated immediately
    function shouldLiquidate(
        bytes32 loanOrderHash,
        address trader)
        public
        view
        returns (bool);

    function getTradeRate(
        address sourceTokenAddress,
        address destTokenAddress)
        public
        view 
        returns (uint);

    function isTradeSupported(
        address sourceTokenAddress,
        address destTokenAddress)
        public
        view 
        returns (bool);
}
