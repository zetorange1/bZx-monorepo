
pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/math/Math.sol";

import "./BZxStorage.sol";
import "./BZxProxyContracts.sol";
import "../shared/InternalFunctions.sol";

import "../BZxVault.sol";
import "../oracle/OracleRegistry.sol";
import "../oracle/OracleInterface.sol";


contract BZxOrderTaking is BZxStorage, Proxiable, InternalFunctions {
    using SafeMath for uint256;

    // Allowed 0x signature types.
    enum SignatureType {
        Illegal,         // 0x00, default value
        Invalid,         // 0x01
        EIP712,          // 0x02
        EthSign,         // 0x03
        Caller,          // 0x04
        Wallet,          // 0x05
        Validator,       // 0x06
        PreSigned,       // 0x07
        Trezor,          // 0x08
        NSignatureTypes  // 0x09, number of signature types. Always leave at end.
    }

    constructor() public {}

    function initialize(
        address _target)
        public
        onlyOwner
    {
        targets[0x8fbbe7a2] = _target; // bytes4(keccak256("takeLoanOrderAsTrader(address[6],uint256[9],address,uint256,bytes)"))
        targets[0x30769736] = _target; // bytes4(keccak256("takeLoanOrderAsLender(address[6],uint256[9],bytes)"))
        targets[0xfee20c18] = _target; // bytes4(keccak256("pushLoanOrderOnChain(address[6],uint256[9],bytes)"))
        targets[0x60e2fbe3] = _target; // bytes4(keccak256("takeLoanOrderOnChainAsTrader(bytes32,address,uint256)"))
        targets[0xd6cc0c14] = _target; // bytes4(keccak256("takeLoanOrderOnChainAsLender(bytes32)"))
        targets[0xde5d838e] = _target; // bytes4(keccak256("cancelLoanOrder(address[6],uint256[9],uint256)"))
        targets[0x8c0a1d7c] = _target; // bytes4(keccak256("cancelLoanOrder(bytes32,uint256)"))
        targets[0x03efed44] = _target; // bytes4(keccak256("getLoanOrderHash(address[6],uint256[9])"))
        targets[0x238a4d1e] = _target; // bytes4(keccak256("isValidSignature(address,bytes32,bytes)"))
        targets[0x8823d53c] = _target; // bytes4(keccak256("getInitialCollateralRequired(address,address,address,uint256,uint256)"))
        targets[0x08e3857c] = _target; // bytes4(keccak256("getUnavailableLoanTokenAmount(bytes32)"))
    }

    /// @dev Takes the order as trader
    /// @param orderAddresses Array of order's makerAddress, loanTokenAddress, interestTokenAddress, collateralTokenAddress, feeRecipientAddress, oracleAddress.
    /// @param orderValues Array of order's loanTokenAmount, interestAmount, initialMarginAmount, maintenanceMarginAmount, lenderRelayFee, traderRelayFee, expirationUnixTimestampSec, makerRole (0=lender, 1=trader), and salt.
    /// @param collateralTokenFilled Desired address of the collateralTokenAddress the trader wants to use.
    /// @param loanTokenAmountFilled Desired amount of loanToken the trader wants to borrow.
    /// @param signature ECDSA signature in raw bytes (rsv).
    /// @return Total amount of loanToken borrowed (uint).
    /// @dev Traders can take a portion of the total coin being lended (loanTokenAmountFilled).
    /// @dev Traders also specify the token that will fill the margin requirement if they are taking the order.
    function takeLoanOrderAsTrader(
        address[6] orderAddresses,
        uint[9] orderValues,
        address collateralTokenFilled,
        uint loanTokenAmountFilled,
        bytes signature)
        external
        nonReentrant
        tracksGas
        returns (uint)
    {
        bytes32 loanOrderHash = _addLoanOrder(
            orderAddresses,
            orderValues,
            signature);

        return _takeLoanOrder(
            loanOrderHash,
            collateralTokenFilled,
            loanTokenAmountFilled,
            1 // takerRole
        );
    }

    /// @dev Takes the order as lender
    /// @param orderAddresses Array of order's makerAddress, loanTokenAddress, interestTokenAddress, collateralTokenAddress, feeRecipientAddress, oracleAddress.
    /// @param orderValues Array of order's loanTokenAmount, interestAmount, initialMarginAmount, maintenanceMarginAmount, lenderRelayFee, traderRelayFee, expirationUnixTimestampSec, makerRole (0=lender, 1=trader), and salt.
    /// @param signature ECDSA signature in raw bytes (rsv).
    /// @return Total amount of loanToken borrowed (uint).
    /// @dev Lenders have to fill the entire desired amount the trader wants to borrow.
    /// @dev This makes loanTokenAmountFilled = loanOrder.loanTokenAmount.
    function takeLoanOrderAsLender(
        address[6] orderAddresses,
        uint[9] orderValues,
        bytes signature)
        external
        nonReentrant
        tracksGas
        returns (uint)
    {
        bytes32 loanOrderHash = _addLoanOrder(
            orderAddresses,
            orderValues,
            signature);

        // lenders have to fill the entire uncanceled loanTokenAmount
        return _takeLoanOrder(
            loanOrderHash,
            orderAddresses[3], // collateralTokenFilled
            orderValues[0].sub(getUnavailableLoanTokenAmount(loanOrderHash)), // loanTokenAmountFilled
            0 // takerRole
        );
    }

    /// @dev Pushes an order on chain
    /// @param orderAddresses Array of order's makerAddress, loanTokenAddress, interestTokenAddress, collateralTokenAddress, feeRecipientAddress, oracleAddress.
    /// @param orderValues Array of order's loanTokenAmount, interestAmount, initialMarginAmount, maintenanceMarginAmount, lenderRelayFee, traderRelayFee, expirationUnixTimestampSec, makerRole (0=lender, 1=trader), and salt.
    /// @param signature ECDSA signature in raw bytes (rsv).
    /// @return A unique hash representing the loan order.
    function pushLoanOrderOnChain(
        address[6] orderAddresses,
        uint[9] orderValues,
        bytes signature)        
        external
        nonReentrant
        //tracksGas
        returns (bytes32)
    {
        bytes32 loanOrderHash = _addLoanOrder(
            orderAddresses,
            orderValues,
            signature);

        if (!orderIndexes[loanOrderHash].active) {
            // record of fillable (non-expired, unfilled) orders
            orderList[address(0)].push(loanOrderHash);
            orderIndexes[loanOrderHash] = LoanOrderIndex({
                index: orderList[address(0)].length-1,
                active: true
            });
        }

        return loanOrderHash;
    }

    /// @dev Takes the order as trader that's already pushed on chain
    /// @param loanOrderHash A unique hash representing the loan order.
    /// @return Total amount of loanToken borrowed (uint).
    /// @dev Traders can take a portion of the total coin being lended (loanTokenAmountFilled).
    /// @dev Traders also specify the token that will fill the margin requirement if they are taking the order.
    function takeLoanOrderOnChainAsTrader(
        bytes32 loanOrderHash,
        address collateralTokenFilled,
        uint loanTokenAmountFilled)
        external
        nonReentrant
        tracksGas
        returns (uint)
    {
        return _takeLoanOrder(
            loanOrderHash,
            collateralTokenFilled,
            loanTokenAmountFilled,
            1 // takerRole
        );
    }

    /// @dev Takes the order as lender that's already pushed on chain
    /// @param loanOrderHash A unique hash representing the loan order.
    /// @return Total amount of loanToken borrowed (uint).
    /// @dev Lenders have to fill the entire desired amount the trader wants to borrow.
    /// @dev This makes loanTokenAmountFilled = loanOrder.loanTokenAmount.
    function takeLoanOrderOnChainAsLender(
        bytes32 loanOrderHash)
        external
        nonReentrant
        tracksGas
        returns (uint)
    {
        // lenders have to fill the entire uncanceled loanTokenAmount
        return _takeLoanOrder(
            loanOrderHash,
            orders[loanOrderHash].collateralTokenAddress,
            orders[loanOrderHash].loanTokenAmount.sub(getUnavailableLoanTokenAmount(loanOrderHash)),
            0 // takerRole
        );
    }

    /// @dev Cancels remaining (untaken) loan
    /// @param orderAddresses Array of order's makerAddress, loanTokenAddress, interestTokenAddress, collateralTokenAddress, feeRecipientAddress, oracleAddress.
    /// @param orderValues Array of order's loanTokenAmount, interestAmount, initialMarginAmount, maintenanceMarginAmount, lenderRelayFee, traderRelayFee, expirationUnixTimestampSec, makerRole (0=lender, 1=trader), and salt.
    /// @param cancelLoanTokenAmount The amount of remaining unloaned token to cancel.
    /// @return The amount of loan token canceled.
    function cancelLoanOrder(
        address[6] orderAddresses,
        uint[9] orderValues,
        uint cancelLoanTokenAmount)
        external
        nonReentrant
        tracksGas
        returns (uint)
    {
        return _cancelLoanOrder(
            getLoanOrderHash(orderAddresses, orderValues), 
            cancelLoanTokenAmount
        );
    }

    /// @dev Cancels remaining (untaken) loan
    /// @param loanOrderHash A unique hash representing the loan order.
    /// @param cancelLoanTokenAmount The amount of remaining unloaned token to cancel.
    /// @return The amount of loan token canceled.
    function cancelLoanOrder(
        bytes32 loanOrderHash,
        uint cancelLoanTokenAmount)
        external
        nonReentrant
        tracksGas
        returns (uint)
    {
        return _cancelLoanOrder(
            loanOrderHash, 
            cancelLoanTokenAmount
        );
    }

    /// @dev Calculates Keccak-256 hash of order with specified parameters.
    /// @param orderAddresses Array of order's makerAddress, loanTokenAddress, interestTokenAddress, collateralTokenAddress, feeRecipientAddress, oracleAddress.
    /// @param orderValues Array of order's loanTokenAmount, interestAmount, initialMarginAmount, maintenanceMarginAmount, lenderRelayFee, traderRelayFee, expirationUnixTimestampSec, makerRole (0=lender, 1=trader), and salt.
    /// @return Keccak-256 hash of loanOrder.
    function getLoanOrderHash(
        address[6] orderAddresses,
        uint[9] orderValues)
        public
        view
        returns (bytes32)
    {
        return(keccak256(abi.encodePacked(
            address(this),
            orderAddresses,
            orderValues
        )));
    }

    /// @dev Verifies that an order signature is valid.
    /// @param signer address of signer.
    /// @param hash Signed Keccak-256 hash.
    /// @param signature ECDSA signature in raw bytes (rsv) + signatureType.
    /// @return Validity of order signature.
    function isValidSignature(
        address signer,
        bytes32 hash,
        bytes signature)
        public
        pure
        returns (bool)
    {
        return _isValidSignature(
            signer,
            hash,
            signature);
    }

    /// @dev Calculates the initial collateral required to open the loan.
    /// @param collateralTokenAddress The collateral token used by the trader.
    /// @param oracleAddress The oracle address specified in the loan order.
    /// @param loanTokenAmountFilled The amount of loan token borrowed.
    /// @param initialMarginAmount The initial margin percentage amount (i.e. 50 == 50%)
    /// @return The minimum collateral requirement to open the loan.
    function getInitialCollateralRequired(
        address loanTokenAddress,
        address collateralTokenAddress,
        address oracleAddress,
        uint loanTokenAmountFilled,
        uint initialMarginAmount)
        public
        view
        returns (uint collateralTokenAmount)
    {
        collateralTokenAmount = _getInitialCollateralRequired(
            loanTokenAddress,
            collateralTokenAddress,
            oracleAddress,
            loanTokenAmountFilled,
            initialMarginAmount);
    }

    /// @dev Calculates the sum of values already filled and cancelled for a given loanOrder.
    /// @param loanOrderHash A unique hash representing the loan order.
    /// @return Sum of values already filled and cancelled.
    function getUnavailableLoanTokenAmount(bytes32 loanOrderHash)
        public
        view
        returns (uint)
    {
        return orderFilledAmounts[loanOrderHash].add(orderCancelledAmounts[loanOrderHash]);
    }


    /*
    * Internal functions
    */

    function _buildLoanOrderStruct(
        bytes32 loanOrderHash,
        address[6] addrs,
        uint[9] uints) 
        internal
        pure
        returns (LoanOrder) {

        return LoanOrder({
            maker: addrs[0],
            loanTokenAddress: addrs[1],
            interestTokenAddress: addrs[2],
            collateralTokenAddress: addrs[3],
            oracleAddress: addrs[5],
            loanTokenAmount: uints[0],
            interestAmount: uints[1],
            initialMarginAmount: uints[2],
            maintenanceMarginAmount: uints[3],
            expirationUnixTimestampSec: uints[6],
            makerRole: uints[7],
            loanOrderHash: loanOrderHash
        });
    }

    /*function _buildLoanPositionStruct(
        address[4] addrs,
        uint[5] uints)
        internal
        pure
        returns (Loan) {

        return LoanPosition({            
            lender: addrs[0],
            trader: addrs[1],
            collateralTokenAddressFilled: addrs[2],
            positionTokenAddressFilled: addrs[3],
            loanTokenAmountFilled: uints[0],
            collateralTokenAmountFilled: uints[1],
            positionTokenAmountFilled: uints[2],
            loanStartUnixTimestampSec: uints[3],
            active: uints[4] != 0
        });
    }*/

    function _addLoanOrder(
        address[6] orderAddresses,
        uint[9] orderValues,
        bytes signature)
        internal
        returns (bytes32 loanOrderHash)
    {
        loanOrderHash = getLoanOrderHash(orderAddresses, orderValues);
        if (orders[loanOrderHash].maker == address(0)) {
            LoanOrder memory loanOrder = _buildLoanOrderStruct(loanOrderHash, orderAddresses, orderValues);
            
            if (!_verifyNewLoanOrder(
                loanOrder,
                signature
            )) {
                revert("BZxOrderTaking::_addLoanOrder: loan verification failed");
            }
            
            orders[loanOrderHash] = loanOrder;
            
            orderFees[loanOrderHash] = LoanOrderFees({
                feeRecipientAddress: orderAddresses[4],
                lenderRelayFee: orderValues[4],
                traderRelayFee: orderValues[5]
            });
            
            emit LogLoanAdded (
                loanOrderHash,
                msg.sender,
                loanOrder.maker,
                orderAddresses[4],
                orderValues[4],
                orderValues[5],
                loanOrder.expirationUnixTimestampSec,
                loanOrder.makerRole
            );
        }

        return loanOrderHash;
    }

    function _takeLoanOrder(
        bytes32 loanOrderHash,
        address collateralTokenFilled,
        uint loanTokenAmountFilled,
        uint takerRole) // (0=lender, 1=trader)
        internal
        returns (uint)
    {
        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.maker == address(0)) {
            revert("BZxOrderTaking::_takeLoanOrder: loanOrder.maker == address(0)");
        }

        if (!_verifyExistingLoanOrder(
            loanOrder, 
            collateralTokenFilled, 
            loanTokenAmountFilled
        )) {
            revert("BZxOrderTaking::_takeLoanOrder: loan verification failed");
        }

        address lender;
        address trader;
        if (takerRole == 1) { // trader
            lender = loanOrder.maker;
            trader = msg.sender;
        } else { // lender
            lender = msg.sender;
            trader = loanOrder.maker;
        }

        // makerRole and takerRole must not be equal and must have a value <= 1
        if (loanOrder.makerRole > 1 || takerRole > 1 || loanOrder.makerRole == takerRole) {
            revert("BZxOrderTaking::_takeLoanOrder: makerRole > 1 || takerRole > 1 || makerRole == takerRole");
        }

        if (orderLender[loanOrder.loanOrderHash] == address(0)) {
            orderList[lender].push(loanOrder.loanOrderHash);
            orderLender[loanOrder.loanOrderHash] = lender;
        }

        orderList[trader].push(loanOrder.loanOrderHash);
        orderTraders[loanOrder.loanOrderHash].push(trader);
        
        loanList.push(LoanRef({
            loanOrderHash: loanOrder.loanOrderHash,
            trader: trader
        }));

        // A trader can only fill a portion or all of a loanOrder once:
        //  - this avoids complex interest payments for parts of an order filled at different times by the same trader
        //  - this avoids potentially large loops when calculating margin reqirements and interest payments
        LoanPosition storage loanPosition = loanPositions[loanOrder.loanOrderHash][trader];
        if (loanPosition.loanTokenAmountFilled != 0) {
            revert("BZxOrderTaking::_takeLoanOrder: loanPosition.loanTokenAmountFilled != 0");
        }     

        uint collateralTokenAmountFilled = _fillLoanOrder(
            loanOrder,
            trader,
            lender,
            collateralTokenFilled,
            loanTokenAmountFilled
        );

        orderFilledAmounts[loanOrder.loanOrderHash] = orderFilledAmounts[loanOrder.loanOrderHash].add(loanTokenAmountFilled);

        loanPosition.lender = lender;
        loanPosition.trader = trader;
        loanPosition.collateralTokenAddressFilled = collateralTokenFilled;
        loanPosition.positionTokenAddressFilled = loanOrder.loanTokenAddress;
        loanPosition.loanTokenAmountFilled = loanTokenAmountFilled;
        loanPosition.collateralTokenAmountFilled = collateralTokenAmountFilled;
        loanPosition.positionTokenAmountFilled = loanTokenAmountFilled;
        loanPosition.loanStartUnixTimestampSec = block.timestamp;
        loanPosition.index = loanList.length-1;
        loanPosition.active = true;

        emit LogLoanTaken (
            loanPosition.lender,
            loanPosition.trader,
            loanPosition.collateralTokenAddressFilled,
            loanPosition.positionTokenAddressFilled,
            loanPosition.loanTokenAmountFilled,
            loanPosition.collateralTokenAmountFilled,
            loanPosition.positionTokenAmountFilled,
            loanPosition.loanStartUnixTimestampSec,
            loanPosition.active,
            loanOrder.loanOrderHash
        );

        if (collateralTokenAmountFilled > 0) {
            if (! OracleInterface(oracleAddresses[loanOrder.oracleAddress]).didTakeOrder(
                loanOrder.loanOrderHash,
                [loanOrder.loanTokenAddress, collateralTokenFilled, loanOrder.interestTokenAddress, msg.sender],
                [loanTokenAmountFilled, collateralTokenAmountFilled, loanOrder.interestAmount, gasUsed]
            )) {
                revert("BZxOrderTaking::_takeLoanOrder: OracleInterface.didTakeOrder failed");
            }
        }

        return loanTokenAmountFilled;
    }

    function _fillLoanOrder(
        LoanOrder memory loanOrder,
        address trader,
        address lender,
        address collateralTokenFilled,
        uint loanTokenAmountFilled)
        internal
        returns (uint)
    {
        uint collateralTokenAmountFilled = _getInitialCollateralRequired(
            loanOrder.loanTokenAddress,
            collateralTokenFilled,
            oracleAddresses[loanOrder.oracleAddress],
            loanTokenAmountFilled,
            loanOrder.initialMarginAmount
        );
        if (collateralTokenAmountFilled == 0) {
            revert("BZxOrderTaking::_fillLoanOrder: collateralTokenAmountFilled == 0");
        }

        // deposit collateral token
        if (! BZxVault(vaultContract).depositToken(
            collateralTokenFilled,
            trader,
            collateralTokenAmountFilled
        )) {
            revert("BZxOrderTaking::_fillLoanOrder: BZxVault.depositToken collateral failed");
        }

        // total interest required if loan is kept until order expiration
        // unused interest at the end of a loan is refunded to the trader
        uint totalInterestRequired = _getTotalInterestRequired(
            loanOrder.loanTokenAmount,
            loanTokenAmountFilled,
            loanOrder.interestAmount,
            loanOrder.expirationUnixTimestampSec,
            block.timestamp);

        // deposit interest token
        if (! BZxVault(vaultContract).depositToken(
            loanOrder.interestTokenAddress,
            trader,
            totalInterestRequired
        )) {
            revert("BZxOrderTaking::_fillLoanOrder: BZxVault.depositToken interest failed");
        }

        // deposit loan token
        if (! BZxVault(vaultContract).depositToken(
            loanOrder.loanTokenAddress,
            lender,
            loanTokenAmountFilled
        )) {
            revert("BZxOrderTaking::_fillLoanOrder: BZxVault.depositToken loan failed");
        }

        LoanOrderFees memory loanOrderFees = orderFees[loanOrder.loanOrderHash];
        if (loanOrderFees.feeRecipientAddress != address(0)) {
            if (loanOrderFees.traderRelayFee > 0) {
                uint paidTraderFee = _getPartialAmountNoError(loanTokenAmountFilled, loanOrder.loanTokenAmount, loanOrderFees.traderRelayFee);
                
                if (! BZxVault(vaultContract).transferTokenFrom(
                    bZRxTokenContract, 
                    trader,
                    loanOrderFees.feeRecipientAddress,
                    paidTraderFee
                )) {
                    revert("BZxOrderTaking::_fillLoanOrder: BZxVault.transferTokenFrom traderRelayFee failed");
                }
            }
            if (loanOrderFees.lenderRelayFee > 0) {
                uint paidLenderFee = _getPartialAmountNoError(loanTokenAmountFilled, loanOrder.loanTokenAmount, loanOrderFees.lenderRelayFee);
                
                if (! BZxVault(vaultContract).transferTokenFrom(
                    bZRxTokenContract, 
                    lender,
                    loanOrderFees.feeRecipientAddress,
                    paidLenderFee
                )) {
                    revert("BZxOrderTaking::_fillLoanOrder: BZxVault.transferTokenFrom lenderRelayFee failed");
                }
            }
        }

        return collateralTokenAmountFilled;
    }

    // this cancels any reminaing un-loaned loanToken in the order
    function _cancelLoanOrder(
        bytes32 loanOrderHash,
        uint cancelLoanTokenAmount)
        internal
        returns (uint)
    {
        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.maker == address(0)) {
            revert("BZxOrderTaking::cancelLoanOrder: loanOrder.maker == address(0)");
        }

        require(loanOrder.maker == msg.sender, "BZxOrderTaking::_cancelLoanOrder: loanOrder.maker != msg.sender");
        require(loanOrder.loanTokenAmount > 0 && cancelLoanTokenAmount > 0, "BZxOrderTaking::_cancelLoanOrder: invalid params");

        if (block.timestamp >= loanOrder.expirationUnixTimestampSec) {
            _removeLoanOrder(loanOrder.loanOrderHash);
            return 0;
        }

        uint remainingLoanTokenAmount = loanOrder.loanTokenAmount.sub(getUnavailableLoanTokenAmount(loanOrder.loanOrderHash));
        uint cancelledLoanTokenAmount = Math.min256(cancelLoanTokenAmount, remainingLoanTokenAmount);
        if (cancelledLoanTokenAmount == 0) {
            // none left to cancel
            return 0;
        }

        if (remainingLoanTokenAmount == cancelledLoanTokenAmount) {
            _removeLoanOrder(loanOrder.loanOrderHash);
        }

        orderCancelledAmounts[loanOrder.loanOrderHash] = orderCancelledAmounts[loanOrder.loanOrderHash].add(cancelledLoanTokenAmount);

        emit LogLoanCancelled(
            msg.sender,
            cancelledLoanTokenAmount,
            (remainingLoanTokenAmount - cancelledLoanTokenAmount),
            loanOrder.loanOrderHash
        );
    
        return cancelledLoanTokenAmount;
    }

    function _removeLoanOrder(
        bytes32 loanOrderHash)
        internal
    {
        if (orderIndexes[loanOrderHash].active) {
            uint index = orderIndexes[loanOrderHash].index;
            if (orderList[address(0)].length > 1) {
                // replace order in list with last order in array
                orderList[address(0)][index] = orderList[address(0)][orderList[address(0)].length - 1];

                // update the position of this replacement
                orderIndexes[orderList[address(0)][index]].index = index;
            }

            // trim array and clear storage
            orderList[address(0)].length--;
            orderIndexes[loanOrderHash].index = 0;
            orderIndexes[loanOrderHash].active = false;
        }
    }

    function _verifyNewLoanOrder(
        LoanOrder loanOrder,
        bytes signature)
        internal
        view
        returns (bool)
    {
        if (loanOrder.maker == address(0)
            || loanOrder.loanTokenAddress == address(0) 
            || loanOrder.interestTokenAddress == address(0)) {
            revert("BZxOrderTaking::_verifyNewLoanOrder: loanOrder.maker == address(0) || loanOrder.loanTokenAddress == address(0) || loanOrder.interestTokenAddress == address(0)");
        }

        if (! OracleRegistry(oracleRegistryContract).hasOracle(loanOrder.oracleAddress) || oracleAddresses[loanOrder.oracleAddress] == address(0)) {
            revert("BZxOrderTaking::_verifyNewLoanOrder: Oracle doesn't exist");
        }

        if (loanOrder.maintenanceMarginAmount == 0 || loanOrder.maintenanceMarginAmount >= loanOrder.initialMarginAmount) {
            revert("BZxOrderTaking::_verifyNewLoanOrder: loanOrder.maintenanceMarginAmount == 0 || loanOrder.maintenanceMarginAmount >= loanOrder.initialMarginAmount");
        }

        if (!_isValidSignature(
            loanOrder.maker,
            loanOrder.loanOrderHash,
            signature
        )) {
            revert("BZxOrderTaking::_verifyNewLoanOrder: signature invalid");
        }

        return true;
    }

    function _verifyExistingLoanOrder(
        LoanOrder loanOrder,
        address collateralTokenFilled,
        uint loanTokenAmountFilled)
        internal
        returns (bool)
    {
        if (loanOrder.maker == msg.sender) {
            revert("BZxOrderTaking::_verifyExistingLoanOrder: loanOrder.maker == msg.sender");
        }

        if (collateralTokenFilled == address(0)) {
            revert("BZxOrderTaking::_verifyExistingLoanOrder: collateralTokenFilled == address(0)");
        }

        if (block.timestamp >= loanOrder.expirationUnixTimestampSec) {
            revert("BZxOrderTaking::_verifyExistingLoanOrder: block.timestamp >= loanOrder.expirationUnixTimestampSec");
        }

        uint remainingLoanTokenAmount = loanOrder.loanTokenAmount.sub(getUnavailableLoanTokenAmount(loanOrder.loanOrderHash));
        if (remainingLoanTokenAmount < loanTokenAmountFilled) {
            revert("BZxOrderTaking::_verifyExistingLoanOrder: remainingLoanTokenAmount < loanTokenAmountFilled");
        } else if (remainingLoanTokenAmount > loanTokenAmountFilled) {
            if (!orderIndexes[loanOrder.loanOrderHash].active) {
                // record of fillable (non-expired, unfilled) orders
                orderList[address(0)].push(loanOrder.loanOrderHash);
                orderIndexes[loanOrder.loanOrderHash] = LoanOrderIndex({
                    index: orderList[address(0)].length-1,
                    active: true
                });
            }
        } else { // remainingLoanTokenAmount == loanTokenAmountFilled
            _removeLoanOrder(loanOrder.loanOrderHash);
        }

        return true;
    }

    /// @dev Verifies that an order signature is valid.
    /// @param signer address of signer.
    /// @param hash Signed Keccak-256 hash.
    /// @param signature ECDSA signature in raw bytes (rsv) + signatureType.
    /// @return Validity of order signature.
    function _isValidSignature(
        address signer,
        bytes32 hash,
        bytes signature)
        internal
        pure
        returns (bool)
    {
        SignatureType signatureType;
        uint8 v;
        bytes32 r;
        bytes32 s;
        (signatureType, v, r, s) = _getSignatureParts(signature);

        // Signature using EIP712
        if (signatureType == SignatureType.EIP712) {
            return signer == ecrecover(
                hash,
                v,
                r,
                s
            );            

        // Signed using web3.eth_sign
        } else if (signatureType == SignatureType.EthSign) {
            return signer == ecrecover(
                keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash)),
                v,
                r,
                s
            );

        // Signature from Trezor hardware wallet.
        // It differs from web3.eth_sign in the encoding of message length
        // (Bitcoin varint encoding vs ascii-decimal, the latter is not
        // self-terminating which leads to ambiguities).
        // See also:
        // https://en.bitcoin.it/wiki/Protocol_documentation#Variable_length_integer
        // https://github.com/trezor/trezor-mcu/blob/master/firmware/ethereum.c#L602
        // https://github.com/trezor/trezor-mcu/blob/master/firmware/crypto.c#L36
        } else if (signatureType == SignatureType.Trezor) {
            return signer == ecrecover(
                keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n\x20", hash)),
                v,
                r,
                s
            );
        }

        // Anything else is illegal (We do not return false because
        // the signature may actually be valid, just not in a format
        // that we currently support. In this case returning false
        // may lead the caller to incorrectly believe that the
        // signature was invalid.)
        revert("UNSUPPORTED_SIGNATURE_TYPE");
    }

    /// @param signature ECDSA signature in raw bytes (rsv).
    /// @dev This supports 0x V2 SignatureType
    function _getSignatureParts(
        bytes signature)
        internal
        pure
        returns (
            SignatureType signatureType,
            uint8 v,
            bytes32 r,
            bytes32 s)
    {
        require(
            signature.length == 66,
            "INVALID_SIGNATURE_LENGTH"
        );

        uint8 t;
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := mload(add(signature, 65))
            t := mload(add(signature, 66))
        }
        signatureType = SignatureType(t);
        if (v < 27) {
            v = v + 27;
        }
    }
}

