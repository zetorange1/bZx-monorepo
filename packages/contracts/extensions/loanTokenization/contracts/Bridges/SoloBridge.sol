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
    function getIsLocalOperator(address owner, address operator) public view returns (bool);
    function getAccountWei(Account.Info memory account, uint256 marketId) public view returns (Types.Wei memory);

    function operate(Account.Info[] memory accounts, Actions.ActionArgs[] memory actions) public;
}

contract SoloBridge is BZxBridge
{
    SoloMargin sm;
    mapping(uint => address) public tokens; // Solo market id => iToken

    event NewToken(uint marketId, address iToken);

    constructor(address soloMargin, uint[] memory marketIds, address[] memory iTokens) public {
        sm = SoloMargin(soloMargin);
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

        require(sm.getIsLocalOperator(msg.sender, address(this)), "Bridge is not an operator");

        Types.Wei memory accountWei = sm.getAccountWei(account, marketId);
        require(!accountWei.sign && accountWei.value >= loanAmount);

        // TODO verify collateralization ratio
        // TODO verify if collateral may be redeemed

        LoanTokenInterface iToken = LoanTokenInterface(tokens[marketId]);

        iToken.flashBorrowToken(
            loanAmount,
            address(this),
            address(this),
            "",
            abi.encodeWithSignature(
                "_migrateLoan(address,uint256,uint256,uint256,uint256[],uint256[])",
                msg.sender, account.number, marketId, loanAmount, marketIds, amounts
            )
        );
    }

    function _migrateLoan(
        address borrower,
        uint account,
        uint marketId,
        uint loanAmount,
        uint[] calldata marketIds,
        uint[] calldata amounts
    )
        external
    {
        LoanTokenInterface iToken = LoanTokenInterface(tokens[marketId]);

        Account.Info[] memory accounts = new Account.Info[](1);
        accounts[0] = Account.Info(borrower, account);

        bytes memory data;

        ERC20(iToken.loanTokenAddress()).approve(address(sm), loanAmount);

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

        sm.operate(accounts, actions);

        address _borrower = borrower;
        for (uint i = 0; i < marketIds.length; i++) {
            uint market = marketIds[i];
            address underlying = LoanTokenInterface(tokens[market]).loanTokenAddress();
            ERC20(underlying).approve(address(iToken), amounts[i]);
            iToken.borrowTokenFromDeposit(
                0,
                leverageAmount,
                initialLoanDuration,
                amounts[i],
                _borrower,
                underlying,
                loanData
            );
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
