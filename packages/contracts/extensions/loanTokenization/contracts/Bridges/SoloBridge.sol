/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./BZxBridge.sol";


library Account {
    struct Info {
        address owner;
        uint256 number;
    }
}

library Types {
    struct Wei {
        bool sign; // true if positive
        uint256 value;
    }

    enum AssetDenomination {
        Wei, // the amount is denominated in wei
        Par  // the amount is denominated in par
    }

    enum AssetReference {
        Delta, // the amount is given as a delta from the current value
        Target // the amount is given as an exact number to end up at
    }

    struct AssetAmount {
        bool sign; // true if positive
        AssetDenomination denomination;
        AssetReference ref;
        uint256 value;
    }
}

library Actions {
    enum ActionType {
        Deposit,   // supply tokens
        Withdraw  // borrow tokens
    }

    struct ActionArgs {
        ActionType actionType;
        uint256 accountId;
        Types.AssetAmount amount;
        uint256 primaryMarketId;
        uint256 secondaryMarketId;
        address otherAddress;
        uint256 otherAccountId;
        bytes data;
    }
}

contract SoloMargin {
    function operate(Account.Info[] memory accounts, Actions.ActionArgs[] memory actions) public;
    function getAccountWei(Account.Info memory account, uint256 marketId) public view returns (Types.Wei memory);
}

contract SoloBridge is BZxBridge
{
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
        uint[] calldata marketIds, // collateral market ids8812
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
                "_migrateLoan(Account.Info,uint,uint,uint[],uint[])",
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

        Account.Info[] memory accounts = new Account.Info[](1);
        accounts[0] = account;

        bytes memory data;

        Actions.ActionArgs[] memory actions = new Actions.ActionArgs[](marketIds.length + 1);
        actions[0] = Actions.ActionArgs({
            actionType: Actions.ActionType.Deposit,
            amount: Types.AssetAmount({
                sign: true,
                denomination: Types.AssetDenomination.Wei,
                ref: Types.AssetReference.Delta,
                value: loanAmount
            }),
            primaryMarketId: marketId,
            otherAddress: address(this),
            accountId: 0,
            secondaryMarketId: 0,
            otherAccountId: 0,
            data: data
        });

        for (uint i = 0; i < marketIds.length; i++) {
            actions[i + 1] = Actions.ActionArgs({
                actionType: Actions.ActionType.Withdraw,
                amount: Types.AssetAmount({
                    sign: false,
                    denomination: Types.AssetDenomination.Wei,
                    ref: Types.AssetReference.Delta,
                    value: amounts[i]
                }),
                primaryMarketId: marketIds[i],
                otherAddress: address(this),
                accountId: 0,
                secondaryMarketId: 0,
                otherAccountId: 0,
                data: data
            });
        }

        SoloMargin(sm).operate(accounts, actions);

        for (uint i = 0; i < marketIds.length; i++) {
            if (marketIds[i] == 0) { // 0 is ETH market
                // TODO unwrap ETH?
                iToken.borrowTokenFromDeposit.value(loanAmount)(
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
                    loanAmount,
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
