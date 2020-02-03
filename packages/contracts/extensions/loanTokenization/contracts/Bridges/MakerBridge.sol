/**
 * Copyright 2017-2019, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

pragma solidity 0.5.8;

import "./BZxBridge.sol";


interface CDPManager {
    function ilks(uint cdp) external view returns (bytes32);
    function vat() external view returns (address);
    function urns(uint cdp) external view returns(address);
    function cdpCan(address owner, uint cdp, address allowed) external view returns(bool);
    function owns(uint cdp) external view returns(address);

    function frob(uint cdp, int dink, int dart) external;
    function flux(uint cdp, address dst, uint wad) external;
    
    function cdpAllow(
        uint cdp,
        address usr,
        uint ok
    ) external;
}

interface Vat {
    function ilks(bytes32) external view returns (uint, uint, uint, uint, uint);
    function dai(address) external view returns (uint);
    function urns(bytes32, address) external view returns (uint, uint);
}

interface JoinAdapter {
    function ilk() external view returns (bytes32);
    function gem() external view returns (address);

    function join(address urn, uint dart) external;
    function exit(address usr, uint wad) external;
}

contract DSProxyFactory {
    mapping(address => bool) public isProxy;
}

contract InstaRegistry {
    mapping(address => address) public proxies;
}

contract DSProxy {
    address public owner;
}

contract MakerBridge is BZxBridge
{
    address public dai;
    address public joinDAI;
    address public vat;

    LoanTokenInterface public iDai;
    CDPManager public cdpManager;
    DSProxyFactory public proxyFactory;
    InstaRegistry public instaRegistry;

    mapping(bytes32 => address) public joinAdapters; // ilk => join adapter address
    mapping(bytes32 => address) public gems; // ilk => underlying token address
    mapping(bytes32 => address) public tokens; // ilk => iToken address

    event NewAddresses(bytes32 ilk, address joinAdapter, address iToken);

    constructor(
        address _iDai,
        address _cdpManager,
        address _joinDAI,
        address _proxyFactory,
        address _instaRegistry,
        address[] memory _joinAdapters,
        address[] memory iTokens
    ) public {
        joinDAI = _joinDAI;

        iDai = LoanTokenInterface(_iDai);
        dai = iDai.loanTokenAddress();

        cdpManager = CDPManager(_cdpManager);
        proxyFactory = DSProxyFactory(_proxyFactory);
        instaRegistry = InstaRegistry(_instaRegistry);
        
        vat = cdpManager.vat();

        setAddresses(_joinAdapters, iTokens);
    }

    function migrateLoan(
        uint[] memory cdps, // ids
        uint[] memory darts, // DAI amounts
        uint[] memory dinks, // other amounts
        uint[] memory collateralDinks, // will be used for borrow on bZx
        uint[] memory borrowAmounts // the amounts of underlying tokens for each new Torque loan
    )
        public
    {
        require(cdps.length > 0, "Invalid cdps");
        require(cdps.length == darts.length, "Invalid darts");
        require(darts.length == dinks.length, "Invalid dinks");
        require(collateralDinks.length == dinks.length, "Invalid collateral dinks");
        require(collateralDinks.length == borrowAmounts.length, "Invalid borrow amounts length");

        uint loanAmount;
        uint totalBorrowAmount;
        for (uint i = 0; i < darts.length; i++) {
            loanAmount += darts[i];
            totalBorrowAmount += borrowAmounts[i];
        }
        require(totalBorrowAmount == loanAmount, "Invalid borrow amounts value");

        bytes memory data = abi.encodeWithSignature(
            "_migrateLoan(address,uint256[],uint256[],uint256[],uint256[],uint256,uint256[])",
            msg.sender, cdps, darts, dinks, collateralDinks, loanAmount, borrowAmounts
        );

        iDai.flashBorrowToken(loanAmount, address(this), address(this), "", data);
    }
    
    function toInt(uint x) internal pure returns (int y) {
        y = int(x);
        require(y >= 0, "int-overflow");
    }

    function _migrateLoan(
        address owner,
        uint[] memory cdps,
        uint[] memory darts,
        uint[] memory dinks,
        uint[] memory collateralDinks,
        uint loanAmount,
        uint[] memory borrowAmounts
    )
        public
    {
        ERC20(dai).approve(joinDAI, loanAmount);

        address borrower = owner;
        if (proxyFactory.isProxy(owner)) {
            borrower = DSProxy(owner).owner();
        }
        
        address _owner = owner;
        address _borrower = borrower;
        for (uint i = 0; i < cdps.length; i++) {
            uint cdp = cdps[i];
            uint dart = darts[i];
            uint dink = dinks[i];
            uint collateralDink = collateralDinks[i];
            
            address cdpOwner = cdpManager.owns(cdp);
            requireThat(cdpOwner == _owner || instaRegistry.proxies(_owner) == cdpOwner, "Invalid owner", i);
            requireThat(cdpManager.cdpCan(cdpOwner, cdp, address(this)), "cdp-not-allowed", i);
            requireThat(collateralDink <= dink, "Collateral amount exceeds total value (dink)", i);

            address urn = cdpManager.urns(cdp);
            bytes32 ilk = cdpManager.ilks(cdp);
            JoinAdapter(joinDAI).join(urn, dart);

            cdpManager.frob(cdp, -toInt(dink), _getWipeDart(Vat(vat).dai(urn), urn, ilk));
            cdpManager.flux(cdp, address(this), dink);

            JoinAdapter(joinAdapters[ilk]).exit(address(this), dink);

            address gem = gems[ilk];

            ERC20(gem).approve(address(iDai), dink);

            iDai.borrowTokenFromDeposit(
                borrowAmounts[i],
                leverageAmount,
                initialLoanDuration,
                collateralDink,
                _borrower,
                address(this),
                gem,
                loanData
            );

            uint excess = dink - collateralDink;
            if (excess > 0) {
                LoanTokenInterface iCollateral = LoanTokenInterface(tokens[ilk]);
                ERC20(gem).approve(address(iCollateral), excess);
                iCollateral.mint(_borrower, excess);
            }
        }

        // repaying flash borrow
        ERC20(dai).transfer(address(iDai), loanAmount);
    }
    
    function _getWipeDart(
        uint daiValue,
        address urn,
        bytes32 ilk
    ) internal view returns (int dart) {
        // Gets actual rate from the vat
        (, uint rate,,,) = Vat(vat).ilks(ilk);
        // Gets actual art value of the urn
        (, uint art) = Vat(vat).urns(ilk, urn);

        // Uses the whole dai balance in the vat to reduce the debt
        dart = toInt(daiValue / rate);
        // Checks the calculated dart is not higher than urn.art (total debt), otherwise uses its value
        dart = uint(dart) <= art ? - dart : - toInt(art);
    }

    function setAddresses(address[] memory _joinAdapters, address[] memory iTokens) public onlyOwner
    {
        for (uint i = 0; i < _joinAdapters.length; i++) {
            JoinAdapter ja = JoinAdapter(_joinAdapters[i]);
            bytes32 ilk = ja.ilk();
            joinAdapters[ilk] = address(ja);
            gems[ilk] = ja.gem();

            LoanTokenInterface iToken = LoanTokenInterface(iTokens[i]);
            requireThat(iToken.loanTokenAddress() == gems[ilk], "Incompatible join adapter", i);

            tokens[ilk] = address(iToken);
            emit NewAddresses(ilk, address(ja), address(iToken));
        }
    }
}
