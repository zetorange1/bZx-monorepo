/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
 
pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./shared/openzeppelin-solidity/SafeMath.sol";
import "./shared/openzeppelin-solidity/ERC20.sol";
import "./shared/openzeppelin-solidity/Ownable.sol";
import "./shared/WETHInterface.sol";


interface ILoanToken {
    function mint(
        address receiver,
        uint256 depositAmount)
        external
        returns (uint256 mintAmount);

    function burn(
        address receiver,
        uint256 burnAmount)
        external
        returns (uint256 loanAmountPaid);

    function claimLoanToken()
        external
        returns (uint256 claimedAmount);

    function donateAsset(
        address tokenAddress)
        external
        returns (bool);
}

interface IPositionToken {
    function mintWithEther(
        address receiver)
        external
        payable
        returns (uint256);

    function mintWithToken(
        address receiver,
        address depositTokenAddress,
        uint256 depositAmount)
        external
        returns (uint256);

    function burnToEther(
        address payable receiver,
        uint256 burnAmount)
        external
        returns (uint256);

    function burnToToken(
        address receiver,
        address burnTokenAddress,
        uint256 burnAmount)
        external
        returns (uint256);

    function donateAsset(
        address tokenAddress)
        external
        returns (bool);
}

contract iTokenizedRegistry {
    struct TokenMetadata {
        address token;
        address asset;
        string name;
        string symbol;
        uint256 tokenType; // 0=no type set, 1=iToken, 2=pToken
        uint256 index;
    }

    function getTokenByAddress(
        address _token)
        external
        view
        returns (TokenMetadata memory);
}

contract TokenizedRouter is Ownable {
    using SafeMath for uint256;

    uint256 internal constant MAX_UINT = 2**256 - 1;

    address public tokenRegistry;
    address public wethContract;

    constructor(
        address _tokenRegistry,
        address _wethContract) 
        public
    {
        tokenRegistry = _tokenRegistry;
        wethContract = _wethContract;
    }

    function() 
        external
    {
        revert();
    }


    /* Public functions */

    function iTokenMint(
        address[] calldata iTokensAddresses,
        address[] calldata receivers,
        uint256[] calldata depositAmounts)
        external
        payable
        returns (uint256 totalCompleted)
    {
        require(iTokensAddresses.length == receivers.length 
                && receivers.length == depositAmounts.length, "array length mismatch");

        uint256 wethBalanceBefore;
        if (msg.value > 0) {
            // remaining ETH is refunded at the end
            WETHInterface(wethContract).deposit.value(msg.value)();
            wethBalanceBefore = ERC20(wethContract).balanceOf(address(this));
        }

        bool success;
        bytes memory data;
        for(uint256 i=0; i < iTokensAddresses.length; i++) {
            require (iTokensAddresses[i] != address(0), "token address is 0");
            iTokenizedRegistry.TokenMetadata memory iToken = iTokenizedRegistry(tokenRegistry).getTokenByAddress(iTokensAddresses[i]);
            require(iToken.token == iTokensAddresses[i], "invalid token address");
            require(iToken.tokenType == 1, "not a registered iToken");
            
            uint256 assetBalanceBefore = ERC20(iToken.asset).balanceOf(address(this));
            // deposit asset
            (success,) = iToken.asset.call(
                abi.encodeWithSignature(
                    "transferFrom(address,address,uint256)",
                    msg.sender,
                    address(this),
                    depositAmounts[i]
                )
            );
            if (!success) {
                continue;
            }

            // set approve on iToken if needed
            _checkApproval(
                iToken.asset,
                iTokensAddresses[i],
                depositAmounts[i]
            );

            // call mint on itoken
            (success, data) = iTokensAddresses[i].call(
                abi.encodeWithSignature(
                    "mint(address,uint256)",
                    receivers[i],
                    depositAmounts[i]
                )
            );
            if (success) {
                uint256 amount;
                assembly {
                    amount := mload(add(data, 32))
                }
                if (amount > 0)
                    totalCompleted++;
            }

            uint256 assetBalanceAfter = ERC20(iToken.asset).balanceOf(address(this));
            if (assetBalanceAfter > assetBalanceBefore) {
                // refund remaining asset
                require(ERC20(iToken.asset).transfer(
                    msg.sender,
                    assetBalanceAfter - assetBalanceBefore
                ), "refund of asset failed");
            } else if (assetBalanceAfter < assetBalanceBefore) {
                revert("too much asset used");
            }
        }

        if (msg.value > 0) {
            uint256 wethBalanceAfter = ERC20(wethContract).balanceOf(address(this));
            if (wethBalanceAfter > wethBalanceBefore) {
                // refund remaining ETH
                WETHInterface(wethContract).withdraw(wethBalanceAfter - wethBalanceBefore);
                require(msg.sender.send(wethBalanceAfter - wethBalanceBefore), "refund of ETH failed");
            } else if (wethBalanceAfter < wethBalanceBefore) {
                revert("too much ETH used");
            }
        }

        return totalCompleted;
    }


    /* Internal functions */

    function _checkApproval(
        address _asset,
        address _spender,
        uint256 _amount)
        internal
    {
        uint256 tempAllowance = ERC20(_asset).allowance(address(this), _spender);
        if (tempAllowance < _amount) {
            if (tempAllowance > 0) {
                // reset approval to 0
                require(ERC20(_asset).approve(_spender, 0), "approval reset of loanToken failed");
            }

            require(ERC20(_asset).approve(_spender, MAX_UINT), "approval of loanToken failed");
        }
    }


    /* Owner-Only functions */

    function setTokenRegistry(
        address _tokenRegistry)
        public
        onlyOwner
    {
        tokenRegistry = _tokenRegistry;
    }

    function setWethContract(
        address _wethContract)
        public
        onlyOwner
    {
        wethContract = _wethContract;
    }

    function transferEther(
        address payable to,
        uint256 value)
        public
        onlyOwner
        returns (bool)
    {
        uint256 amount = value;
        if (amount > address(this).balance) {
            amount = address(this).balance;
        }

        return (to.send(amount));
    }

    function transferToken(
        address tokenAddress,
        address to,
        uint256 value)
        public
        onlyOwner
        returns (bool)
    {
        uint256 balance = ERC20(tokenAddress).balanceOf(address(this));
        if (value > balance) {
            return ERC20(tokenAddress).transfer(
                to,
                balance
            );
        } else {
            return ERC20(tokenAddress).transfer(
                to,
                value
            );
        }
    }
}
