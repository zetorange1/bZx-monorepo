/*

  Copyright 2018 b0x, LLC
  Parts copyright 2017 ZeroEx Intl.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.

*/

pragma solidity ^0.4.9;

import './B0xTypes.sol';

contract B0x_Interface is B0xTypes {
    
    uint public emaValue;

    mapping (bytes32 => uint) public filled; // mapping of orderHash to loanTokenAmount filled
    mapping (bytes32 => uint) public cancelled; // mapping of orderHash to loanTokenAmount cancelled
    mapping (bytes32 => LoanOrder) public orders; // mapping of orderHash to taken loanOrders
    mapping (bytes32 => mapping (address => Loan)) public loans; // mapping of orderHash to mapping of traders to loanOrder fills
    mapping (bytes32 => mapping (address => Trade)) public trades; // mapping of orderHash to mapping of traders to active trades

    mapping (bytes32 => mapping (address => uint)) public interestPaid; // mapping of orderHash to mapping of traders to amount of interest paid so far to a lender

    mapping (address => bytes32) public orderList;
    mapping (address => bytes32) public tradeList;

    function getLoanOrder (
        bytes32 loanOrderHash
    )
        public
        view
        returns (address[6],uint[7]);

}
