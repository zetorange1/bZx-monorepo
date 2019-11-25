/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.8;

import "./BZxBridge.sol";


interface CDPManager {
    function ilks(uint cdp) external view returns (bytes32);
    function urns(uint cdp) external view returns(address);
    function cdpCan(address owner, uint cdp, address allowed) external view returns(bool);

    function frob(uint cdp, address usr, int dink, int dart) external; // TODO why example has 4 arguments? frob on release failed to me
}

interface JoinAdapter {
    function join(address urn, uint dart) external;
    function exit(address usr, uint wad) external;
}

contract MakerBridge is BZxBridge
{
    address public dai;
    address public joinDAI;

    LoanTokenInterface public iDai;
    CDPManager public cdpManager;

    mapping(bytes32 => address) public joinAdapters; // ilk => join adapter address
    mapping(bytes32 => address) public tokens; // ilk => underlying token address

    event NewAddresses(bytes32 ilk, address joinAdapter, address token);

    constructor(
        address _dai,
        address _iDai,
        address _cdpManager,
        address _joinDAI,
        bytes32[] memory ilks,
        address[] memory _joinAdapters,
        address[] memory _tokens
    ) public {
        dai = _dai;
        joinDAI = _joinDAI;

        iDai = LoanTokenInterface(_iDai);
        cdpManager = CDPManager(_cdpManager);

        setJoinAdaptersAndTokens(ilks, _joinAdapters, _tokens);
    }

    function migrateLoan(
        uint[] calldata cdps, // ids
        uint[] calldata darts, // DAI amounts
        uint[] calldata dinks, // other amounts
        uint[] calldata collateralDinks // will be used for borrow on bZx
    )
        external
    {
        require(cdps.length > 0, "Invalid cdps");
        require(cdps.length == darts.length, "Invalid darts");
        require(darts.length == dinks.length, "Invalid dinks");
        require(collateralDinks.length == dinks.length, "Invalid collateral dinks");

        uint loanAmount;
        for (uint i = 0; i < darts.length; i++) {
            loanAmount += darts[i];
        }

        ERC20(dai).approve(joinDAI, loanAmount);

        bytes memory data = abi.encodeWithSignature(
            "_migrateLoan(address,uint256[],uint256[],uint256[],uint256[],uint)",
            msg.sender, cdps, darts, dinks, collateralDinks, loanAmount
        );

        iDai.flashBorrowToken(loanAmount, address(this), address(this), "", data);
    }

    function _migrateLoan(
        address borrower,
        uint[] calldata cdps,
        uint[] calldata darts,
        uint[] calldata dinks,
        uint[] calldata collateralDinks,
        uint loanAmount
    )
        external
    {
        address _borrower = borrower;
        uint excess = 0;
        for (uint i = 0; i < cdps.length; i++) {
            uint cdp = cdps[i];
            uint dart = darts[i];
            uint dink = dinks[i];
            uint collateralDink = collateralDinks[i];
            
            requireThat(cdpManager.cdpCan(_borrower, cdp, address(this)), "cdp-not-allowed", i);
            requireThat(collateralDink <= dink, "Collateral amount exceeds total value (dink)", i);

            address urn = cdpManager.urns(cdp);
            JoinAdapter(joinDAI).join(urn, dart);

            cdpManager.frob(cdp, address(this), -int(dink), -int(dart));

            bytes32 ilk = cdpManager.ilks(cdp);
            JoinAdapter(joinAdapters[ilk]).exit(address(this), dink);

            ERC20(tokens[ilk]).approve(address(iDai), dink);
            iDai.borrowTokenFromDeposit(
                0,
                leverageAmount,
                initialLoanDuration,
                collateralDink,
                _borrower,
                tokens[ilk],
                loanData
            );

            excess += dink - collateralDink;
        }
        if (excess > 0) {
            ERC20(dai).approve(address(iDai), excess);
            iDai.mint(_borrower, excess);
        }

        // repaying flash borrow
        ERC20(dai).transfer(address(iDai), loanAmount);
    }

    function setJoinAdaptersAndTokens(
        bytes32[] memory ilks,
        address[] memory _joinAdapters,
        address[] memory _tokens
    )
        public
        onlyOwner
    {
        require(ilks.length == _joinAdapters.length);
        require(ilks.length == _tokens.length);

        for (uint i = 0; i < ilks.length; i++) {
            bytes32 ilk = ilks[i];
            joinAdapters[ilk] = _joinAdapters[i];
            tokens[ilk] = _tokens[i];
            emit NewAddresses(ilk, joinAdapters[ilk], tokens[ilks[i]]);
        }
    }
}
