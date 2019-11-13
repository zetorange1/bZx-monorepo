/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "../shared/openzeppelin-solidity/ERC20.sol";
import "../shared/openzeppelin-solidity/Ownable.sol";
import "./solo/SoloMargin.sol";
import "./solo/lib/Account.sol";
import "./LoanTokenInterface.sol";

contract SoloBridge is Ownable
{
    bytes loanData;
    uint leverageAmount = 2000000000000000000;
    uint initialLoanDuration = 7884000; // standard 3 months

    address sm; // SoloMargin contract address
    mapping(uint => address) public tokens; // Solo market id => iToken

    event NewToken(uint marketId, address iToken);

    constructor(address soloMargin, uint[] memory marketIds, address[] memory iTokens) public {
        sm = soloMargin;
        setTokens(marketIds, iTokens);
    }

    function migrateLoan(
        Account.Info calldata account,
        uint marketId, // Solo market id
        uint loanAmount, // the amount of underlying tokens being migrated
        uint[] calldata marketIds, // collateral market ids
        uint[] calldata amounts // collateral amounts
    )
        external
    {
        require(loanAmount > 0);
        require(marketIds.length > 0);
        require(marketIds.length == amounts.length);

        Types.Wei memory accountWei = SoloMargin(sm).getAccountWei(account, marketId);
        require(!accountWei.sign && accountWei.value >= loanAmount);

        // TODO verify collateralization ratio
        // TODO verify if collateral may be redeemed

        LoanTokenInterface iToken = LoanTokenInterface(tokens[marketId]);

        iToken.flashBorrowToken(
            loanAmount,
            address(this),
            address(this),
            abi.encodeWithSignature(
                "_migrateLoan(address,uint,address[],uint[])", // TODO change signature
                account, marketId, loanAmount, marketIds, amounts
            )
        );
    }

    function _migrateLoan(
        Account.Info calldata account,
        uint marketId,
        uint loanAmount,
        uint[] calldata marketIds,
        uint[] calldata amounts
    )
        external
    {
        LoanTokenInterface iToken = LoanTokenInterface(tokens[marketId]);

        // TODO repay borrow
        // SoloMargin(sm).operate();

        for (uint i = 0; i < marketIds.length; i++) {
            // TODO withdraw (this contract should be added as operator of sender's Solo account)
            // SoloMargin(sm).operate();

            uint amountUnderlying = loanAmount; // TODO are you sure?

            if (marketIds[i] == 0) { // 0 is ETH market
                iToken.borrowTokenFromDeposit.value(amountUnderlying)(
                    0,
                    leverageAmount,
                    initialLoanDuration,
                    0,
                    msg.sender,
                    address(0),
                    loanData
                );
            } else {
                iToken.borrowTokenFromDeposit(
                    0,
                    leverageAmount,
                    initialLoanDuration,
                    amountUnderlying,
                    msg.sender,
                    iToken.loanTokenAddress(),
                    loanData
                );
            }
        }

        // TODO If there is excess collateral above a certain level, the rest is used to mint iTokens...
        // TODO borrowAmount param of borrowTokenFromDeposit should be manipulated for this
    }

    function setTokens(uint[] memory marketIds, address[] memory iTokens) public onlyOwner
    {
        require(marketIds.length == iTokens.length);

        for (uint i = 0; i < marketIds.length; i++) {
            tokens[marketIds[i]] = iTokens[i];
            emit NewToken(marketIds[i], iTokens[i]);
        }
    }
}
