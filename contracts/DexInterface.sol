// Sample dex integration contract
// this is the interfact for a custom contract contains custom api code for interacting with a particular dex

pragma solidity ^0.4.9;

import '../oz_contracts/ownership/Ownable.sol';
import '../oz_contracts/math/SafeMath.sol';

/**
 * @title Dex interface
 */
contract DexInterface is Ownable {
    using SafeMath for uint256;

    address public dexContract;

    mapping (address => uint) public latest_prices; // mapping of token address to the last market price (price in amount per Wei)

    function setDexAddress(address dexAddress_) onlyOwner public;

    // TODO: This currently for testing purposes. Remove later!
    function setTokenPrice(address token_, uint price_) onlyOwner public;

    // updates the latest token price in wei per 1 token (it updates the price each time it's called)
    // TODO: This currently creates bogus data for testing purposes! Obviously, update this later.
    function genTokenPrice(address token_) public returns (bool);

    // return token price in wei per 1 token
    function getTokenPrice(address token_) public constant returns (uint);

    // returns number of giveToken_ units requred to buy 1 getToken_ unit (x giveToken_/getToken+)
    function getTradePrice(address giveToken_, address getToken_) public constant returns (uint);
}
