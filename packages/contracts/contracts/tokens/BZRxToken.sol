
pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/DetailedERC20.sol";
import "./UnlimitedAllowanceToken.sol";


contract BZRxToken is UnlimitedAllowanceToken, DetailedERC20, Ownable {

    event Mint(address indexed to, uint256 amount);
    event MintFinished();
    event LockingFinished();

    address public wethContractAddress;

    uint public ethRate = 320;

    bool public mintingFinished = false;
    bool public lockingFinished = false;

    mapping (address => bool) public minters;

    modifier canMint() {
        require(!mintingFinished);
        _;
    }

    modifier hasMintPermission() {
        require(minters[msg.sender]);
        _;
    }

    modifier isLocked() {
        require(!lockingFinished);
        _;
    }

    constructor(
        address _wethContractAddress,
        address _bZxContractAddress)
        public
        DetailedERC20(
            "BZRX Protocol Token",
            "BZRX", 
            18
        )
    {
        wethContractAddress = _wethContractAddress;
        
        minters[msg.sender] = true;
        minters[_bZxContractAddress] = true;
    }

    /// @dev ERC20 transferFrom, modified such that an allowance of MAX_UINT represents an unlimited allowance.
    /// @param _from Address to transfer from.
    /// @param _to Address to transfer to.
    /// @param _value Amount to transfer.
    /// @return Success of transfer.
    function transferFrom(
        address _from,
        address _to,
        uint256 _value)
        public
        returns (bool)
    {
        if (lockingFinished) {
            return super.transferFrom(
                _from,
                _to,
                _value
            );
        }

        if (minters[msg.sender]) {
            if (_value > allowed[_from][msg.sender]) {
                uint wethValue = _value.mul(73).div(1000).div(ethRate);
                require(StandardToken(wethContractAddress).transferFrom(
                    _from,
                    this,
                    wethValue
                ));
                return mint(
                    _to,
                    _value
                );
            } else {
                return super.transferFrom(
                    _from,
                    _to,
                    _value
                );
            }
        }

        revert("this token is locked for transfers");
    }

    /**
    * @dev Transfer token for a specified address
    * @param _to The address to transfer to.
    * @param _value The amount to be transferred.
    */
    function transfer(
        address _to, 
        uint256 _value) 
        public 
        returns (bool)
    {
        if (lockingFinished || minters[msg.sender]) {
            return super.transfer(
                _to,
                _value
            );
        }

        revert("this token is locked for transfers");
    }


    /**
    * @dev Function to mint tokens
    * @param _to The address that will receive the minted tokens.
    * @param _amount The amount of tokens to mint.
    * @return A boolean that indicates if the operation was successful.
    */
    function mint(
        address _to,
        uint256 _amount
    )
        public
        hasMintPermission
        canMint
        returns (bool)
    {
        totalSupply_ = totalSupply_.add(_amount);
        balances[_to] = balances[_to].add(_amount);
        emit Mint(_to, _amount);
        emit Transfer(address(0), _to, _amount);
        return true;
    }

    /**
    * @dev Function to stop minting new tokens.
    * @return True if the operation was successful.
    */
    function finishMinting() 
        public 
        onlyOwner 
        canMint 
        returns (bool)
    {
        mintingFinished = true;
        emit MintFinished();
        return true;
    }

    /**
    * @dev Function to stop minting new tokens.
    * @return True if the operation was successful.
    */
    function finishLocking() 
        public 
        onlyOwner 
        isLocked 
        returns (bool)
    {
        lockingFinished = true;
        emit LockingFinished();
        return true;
    }

    function addMinter(
        address _minter) 
        public 
        onlyOwner 
        canMint 
        returns (bool)
    {
        minters[_minter] = true;
        return true;
    }

    function removeMinter(
        address _minter) 
        public 
        onlyOwner 
        canMint 
        returns (bool)
    {
        minters[_minter] = false;
        return true;
    }

    function changeWethContract(
        address _wethContractAddress) 
        public 
        onlyOwner 
        returns (bool)
    {
        wethContractAddress = _wethContractAddress;
        return true;
    }

    function changeEthRate(
        uint _ethRate) 
        public 
        onlyOwner 
        returns (bool)
    {
        ethRate = _ethRate;
        return true;
    }
}