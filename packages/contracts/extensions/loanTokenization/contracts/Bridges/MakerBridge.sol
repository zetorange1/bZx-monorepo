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
    address dai;
    address joinDAI;

    LoanTokenInterface iDai;
    CDPManager cdpManager;

    // TODO if there is no other way, then add setters for the following mappings:
    mapping(bytes32 => address) public joinAdapters; // ilk => join adapter address
    mapping(bytes32 => address) public tokens; // ilk => underlying token address

    constructor(address _dai, address _iDai, address _cdpManager, address _joinDAI) public {
        dai = _dai;
        joinDAI = _joinDAI;

        iDai = LoanTokenInterface(_iDai);
        cdpManager = CDPManager(_cdpManager);
    }

    function migrateLoan(
        uint[] calldata cdps,
        uint[] calldata darts, // DAI amounts
        uint[] calldata dinks // other amounts
    )
        external
    {
        require(cdps.length > 0);
        require(cdps.length == darts.length);
        require(darts.length == dinks.length);

        // TODO verify balance available to withdraw

        uint loanAmount;
        for (uint i = 0; i < darts.length; i++) {
            loanAmount += darts[i];
        }

        ERC20(dai).approve(joinDAI, loanAmount);

        iDai.flashBorrowToken(
            loanAmount,
            address(this),
            address(this),
            "",
            abi.encodeWithSignature(
                "_migrateLoan(address,uint256[],uint256[],uint256[])",
                msg.sender, cdps, darts, dinks
            )
        );
    }

    function _migrateLoan(
        address borrower,
        uint[] calldata cdps,
        uint[] calldata darts,
        uint[] calldata dinks
    )
        external
    {
        for (uint i = 0; i < cdps.length; i++) {
            uint cdp = cdps[i];
            uint dart = darts[i];
            require(
                cdpManager.cdpCan(borrower, cdp, address(this)),
                string(abi.encodePacked("cdp-not-allowed", COLON, i)) // TODO stringifyTruncated?
            );

            address urn = cdpManager.urns(cdp);
            JoinAdapter(joinDAI).join(urn, dart);

            cdpManager.frob(cdp, address(this), -int(dinks[i]), -int(dart));

            bytes32 ilk = cdpManager.ilks(cdp);
            JoinAdapter(joinAdapters[ilk]).exit(address(this), dinks[i]);

            address _borrower = borrower;
            ERC20(tokens[ilk]).approve(address(iDai), dinks[i]);
            iDai.borrowTokenFromDeposit(
                0,
                leverageAmount,
                initialLoanDuration,
                dinks[i],
                _borrower,
                tokens[ilk],
                loanData
            );
        }

        // TODO If there is excess collateral above a certain level, the rest is used to mint iTokens... ???
        // TODO borrowAmount param of borrowTokenFromDeposit should be manipulated for this
    }
}
