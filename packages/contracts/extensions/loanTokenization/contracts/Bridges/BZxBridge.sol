/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.8;

import "../shared/openzeppelin-solidity/Ownable.sol";
import "../shared/openzeppelin-solidity/ERC20.sol";
import "./LoanTokenInterface.sol";


contract BZxBridge is Ownable
{
    uint256 constant ASCII_ZERO = 48; // '0'
    bytes2 constant COLON = 0x3a20;

    bytes loanData;
    uint leverageAmount = 2000000000000000000;
    uint initialLoanDuration = 7884000; // standard 3 months

    function requireThat(bool must, string memory reason, uint payload) internal pure {
        if (!must) {
            revert(
                string(
                    abi.encodePacked(
                        reason,
                        COLON,
                        stringify(payload)
                    )
                )
            );
        }
    }

    function stringify(
        uint256 input
    )
        private
        pure
        returns (bytes memory)
    {
        if (input == 0) {
            return "0";
        }

        // get the final string length
        uint256 j = input;
        uint256 length;
        while (j != 0) {
            length++;
            j /= 10;
        }

        // allocate the string
        bytes memory bstr = new bytes(length);

        // populate the string starting with the least-significant character
        j = input;
        for (uint256 i = length; i > 0; ) {
            // reverse-for-loops with unsigned integer
            /* solium-disable-next-line security/no-modify-for-iter-var */
            i--;

            // take last decimal digit
            bstr[i] = byte(uint8(ASCII_ZERO + (j % 10)));

            // remove the last decimal digit
            j /= 10;
        }

        return bstr;
    }
}
