pragma solidity ^0.4.4;

//import './HumanStandardToken.sol';
import './ERC20_AlwaysOwned.sol';

// 20 million tokens (18 decimal places), 20 * 10**24
contract BEANToken is ERC20_AlwaysOwned(
	10000000000000000000000000,
	"Bean Token", 
	18, 
	"BEAN"
) {}