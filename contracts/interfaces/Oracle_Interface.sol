
pragma solidity 0.4.18;

interface Oracle_Interface {

    // Called by b0x automatically, but can be called outside b0x
    // Appropriate security logic (ex: ownerOnly) should be put in place if appropriate
    // loanOrderHash is provided and can be used to reference the order in b0x.
    // gasUsed can be provided for optional gas refunds.
    function didTakeOrder(
        address taker,
        bytes32 loanOrderHash,
        uint gasUsed)
        public;

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
        public;

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
        public;

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
        public;

    // Called by b0x automatically, but can be called outside b0x
    // Appropriate security logic (ex: ownerOnly) should be put in place if appropriate
    // loanOrderHash is provided and can be used to reference the order in b0x.
    // gasUsed can be provided for optional gas refunds.
    function didDepositCollateral(
        address taker,
        bytes32 loanOrderHash,
        uint gasUsed)
        public;

    // Called by b0x automatically, but can be called outside b0x
    // Appropriate security logic (ex: ownerOnly) should be put in place if appropriate
    // loanOrderHash is provided and can be used to reference the order in b0x.
    // gasUsed can be provided for optional gas refunds.
    function didChangeCollateral(
        address taker,
        bytes32 loanOrderHash,
        uint gasUsed)
        public;



    // A trader calls this to close their own trade at any time
    function closeTrade(
        bytes32 loanOrderHash)
        public
        returns (bool);

    // Anyone can call this to liquidate the trade.
    // Logic should be added to check if the trade meets the requirments for liquidation.
    function liquidateTrade(
        bytes32 loanOrderHash,
        address trader)
        public
        returns (bool);

    // Returns True is the trade should be liquidated immediately
    function shouldLiquidate(
        bytes32 loanOrderHash,
        address trader)
        public
        view
        returns (bool);

    function getTokenPrice(
        address sourceTokenAddress,
        address destTokenAddress)
        public
        view 
        returns (uint rate);
}
