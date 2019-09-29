/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./ENSLoanOwnerStorage.sol";
import "../UserContract/UserContractRegistry.sol";


interface iBasicToken {
    function transfer(
        address to,
        uint256 value)
        external
        returns (bool);

    function approve(
        address spender,
        uint256 value)
        external
        returns (bool);

    function balanceOf(
        address user)
        external
        view
        returns (uint256 balance);

    function allowance(
        address owner,
        address spender)
        external
        view
        returns (uint256 value);
}

contract ENSLoanOwnerLogic is ENSLoanOwnerStorage {

    function()
        external
    {
        revert("fallback not allowed");
    }

    function initialize(
        address _userContractRegistry,
        address _ensAddr,
        address _resolverAddr)
        public
        onlyOwner
    {
        userContractRegistry = _userContractRegistry;
        ENSContract = ENSSimple(_ensAddr);
        ResolverContract = ResolverSimple(_resolverAddr);
    }

    function setControllers(
        address[] memory controller,
        bool[] memory toggle)
        public
        onlyOwner
    {
        require(controller.length == toggle.length, "count mismatch");

        for (uint256 i=0; i < controller.length; i++) {
            controllers[controller[i]] = toggle[i];
        }
    }

    function setupUser(
        address user)
        public
    {
        UserContractRegistry registry = UserContractRegistry(userContractRegistry);
        UserContract userContract = registry.userContracts(user);
        if (address(userContract) == address(0)) {
            userContract = new UserContract(user, address(this));
            registry.setContract(user, userContract);
        }

        string memory addrStr = addressToString(user);
        (bytes32 newNamehash, bytes32 newLabel) = computeNamehash(tokenloanHash, addrStr);
        address currentAddress = ResolverContract.addr(newNamehash);
        address newAddress = address(userContract);
        if (currentAddress != newAddress) {
            ENSContract.setSubnodeOwner(tokenloanHash, newLabel, address(this));
            ENSContract.setResolver(newNamehash, address(ResolverContract));
            ResolverContract.setAddr(newNamehash, newAddress);
        }
    }

    function removeUserContract(
        address user)
        public
    {
        require(msg.sender == owner || msg.sender == user);
        UserContractRegistry(userContractRegistry).setContract(user, UserContract(address(0)));
    }

    function removeUserENS(
        address user)
        public
    {
        require(msg.sender == owner || msg.sender == user);
        string memory addrStr = addressToString(user);
        (bytes32 newNamehash, bytes32 newLabel) = computeNamehash(tokenloanHash, addrStr);
        if (ResolverContract.addr(newNamehash) != address(0)) {
            ResolverContract.setAddr(newNamehash, address(0));
            ENSContract.setResolver(newNamehash, address(0));
            ENSContract.setSubnodeOwner(tokenloanHash, newLabel, address(0));
        }
    }

    function checkUserSetup(
        address user)
        public
        view
        returns(address)
    {
        UserContract userContract = UserContractRegistry(userContractRegistry).userContracts(user);
        if (address(userContract) == address(0)) {
            return address(0);
        }

        string memory addrStr = addressToString(user);
        (bytes32 newNamehash,) = computeNamehash(tokenloanHash, addrStr);
        if (ResolverContract.addr(newNamehash) == address(0)) {
            return address(0);
        }

        return address(userContract);
    }

    function getUserContract(
        address user)
        public
        view
        returns (address)
    {
        return address(UserContractRegistry(userContractRegistry).userContracts(user));
    }

    function getNodeOwner(
        bytes32 node)
        public
        view
        returns (address)
    {
        return ENSContract.owner(node);
    }

    function computeNamehash(
        bytes32 rootHash,
        string memory labelStr)
        public
        pure
        returns (bytes32 namehash, bytes32 label)
    {
        label = keccak256(abi.encodePacked(labelStr));
        namehash = keccak256(
            abi.encodePacked(rootHash, label)
        );
    }

    function addressToString(
        address addr)
        public
        pure
        returns(string memory)
    {
        bytes32 value = bytes32(uint256(addr));
        bytes memory alphabet = "0123456789abcdef";

        bytes memory str = new bytes(42);
        str[0] = '0';
        str[1] = 'x';
        for (uint i = 0; i < 20; i++) {
            str[2+i*2] = alphabet[uint(uint8(value[i + 12] >> 4))];
            str[3+i*2] = alphabet[uint(uint8(value[i + 12] & 0x0f))];
        }

        return string(str);
    }

    function transferNodeOwnership(
        address newOwner)
        public
        onlyOwner
    {
        require(newOwner != address(0), "0 address");
        ENSContract.setOwner(tokenloanHash, newOwner);
    }

    function setupAssetENSAndSubNodes(
        string memory assetNodeStr, // ex: dai (dai.tokenloan.eth)
        address assetNodeAddr,
        string[] memory subNodes, // ex: repay (repay.dai.tokenloan.eth)
        address[] memory subAddrs)
        public
        onlyOwner
    {
        require(subNodes.length == subAddrs.length);

        (bytes32 assetHash, bytes32 assetLabel) = computeNamehash(tokenloanHash, assetNodeStr);
        ENSContract.setSubnodeOwner(tokenloanHash, assetLabel, address(this));
        ENSContract.setResolver(assetHash, address(ResolverContract));
        ResolverContract.setAddr(assetHash, assetNodeAddr);

        for (uint256 i=0; i < subNodes.length; i++) {
            (bytes32 subHash, bytes32 subLabel) = computeNamehash(assetHash, subNodes[i]);
            ENSContract.setSubnodeOwner(assetHash, subLabel, address(this));
            ENSContract.setResolver(subHash, address(ResolverContract));
            ResolverContract.setAddr(subHash, subAddrs[i]);
        }
    }

    function recoverToken(
        address tokenAddress,
        address receiver,
        uint256 amount)
        public
        onlyOwner
    {
        iBasicToken token = iBasicToken(tokenAddress);

        uint256 balance = token.balanceOf(address(this));
        if (balance < amount)
            amount = balance;

        require(token.transfer(
            receiver,
            amount),
            "transfer failed"
        );
    }
}
