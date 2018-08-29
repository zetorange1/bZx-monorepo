
pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/math/Math.sol";

import "./BZxProxyContracts.sol";
import "../shared/OrderTakingFunctions.sol";


contract BZxOrderTaking is BZxStorage, Proxiable, OrderTakingFunctions {
    using SafeMath for uint256;

    constructor() public {}

    function initialize(
        address _target)
        public
        onlyOwner
    {
        targets[0x22cab5a1] = _target; // bytes4(keccak256("takeLoanOrderAsTrader(address[6],uint256[10],address,uint256,bytes)"))
        targets[0x8facb50c] = _target; // bytes4(keccak256("takeLoanOrderAsLender(address[6],uint256[10],bytes)"))
        targets[0xc1a5bb10] = _target; // bytes4(keccak256("cancelLoanOrder(address[6],uint256[10],uint256)"))
        targets[0x8c0a1d7c] = _target; // bytes4(keccak256("cancelLoanOrder(bytes32,uint256)"))
    }

    /// @dev Takes the order as trader
    /// @param orderAddresses Array of order's makerAddress, loanTokenAddress, interestTokenAddress, collateralTokenAddress, feeRecipientAddress, oracleAddress.
    /// @param orderValues Array of order's loanTokenAmount, interestAmount, initialMarginAmount, maintenanceMarginAmount, lenderRelayFee, traderRelayFee, maxDurationUnixTimestampSec, expirationUnixTimestampSec, makerRole (0=lender, 1=trader), and salt.
    /// @param collateralTokenFilled Desired address of the collateralTokenAddress the trader wants to use.
    /// @param loanTokenAmountFilled Desired amount of loanToken the trader wants to borrow.
    /// @param signature ECDSA signature in raw bytes (rsv).
    /// @return Total amount of loanToken borrowed (uint).
    /// @dev Traders can take a portion of the total coin being lended (loanTokenAmountFilled).
    /// @dev Traders also specify the token that will fill the margin requirement if they are taking the order.
    function takeLoanOrderAsTrader(
        address[6] orderAddresses,
        uint[10] orderValues,
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
    /// @param orderValues Array of order's loanTokenAmount, interestAmount, initialMarginAmount, maintenanceMarginAmount, lenderRelayFee, traderRelayFee, maxDurationUnixTimestampSec, expirationUnixTimestampSec, makerRole (0=lender, 1=trader), and salt.
    /// @param signature ECDSA signature in raw bytes (rsv).
    /// @return Total amount of loanToken borrowed (uint).
    /// @dev Lenders have to fill the entire desired amount the trader wants to borrow.
    /// @dev This makes loanTokenAmountFilled = loanOrder.loanTokenAmount.
    function takeLoanOrderAsLender(
        address[6] orderAddresses,
        uint[10] orderValues,
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
            orderValues[0].sub(_getUnavailableLoanTokenAmount(loanOrderHash)), // loanTokenAmountFilled
            0 // takerRole
        );
    }

    /// @dev Cancels remaining (untaken) loan
    /// @param orderAddresses Array of order's makerAddress, loanTokenAddress, interestTokenAddress, collateralTokenAddress, feeRecipientAddress, oracleAddress.
    /// @param orderValues Array of order's loanTokenAmount, interestAmount, initialMarginAmount, maintenanceMarginAmount, lenderRelayFee, traderRelayFee, maxDurationUnixTimestampSec, expirationUnixTimestampSec, makerRole (0=lender, 1=trader), and salt.
    /// @param cancelLoanTokenAmount The amount of remaining unloaned token to cancel.
    /// @return The amount of loan token canceled.
    function cancelLoanOrder(
        address[6] orderAddresses,
        uint[10] orderValues,
        uint cancelLoanTokenAmount)
        external
        nonReentrant
        tracksGas
        returns (uint)
    {
        return _cancelLoanOrder(
            _getLoanOrderHash(orderAddresses, orderValues), 
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


    /*
    * Internal functions
    */




    // this cancels any reminaing un-loaned loanToken in the order
    function _cancelLoanOrder(
        bytes32 loanOrderHash,
        uint cancelLoanTokenAmount)
        internal
        returns (uint)
    {
        LoanOrder memory loanOrder = orders[loanOrderHash];
        if (loanOrder.loanTokenAddress == address(0)) {
            revert("BZxOrderTaking::cancelLoanOrder: loanOrder.loanTokenAddress == address(0)");
        }
        
        LoanOrderAux memory loanOrderAux = orderAux[loanOrderHash];

        require(loanOrderAux.maker == msg.sender, "BZxOrderTaking::_cancelLoanOrder: loanOrderAux.maker != msg.sender");
        require(loanOrder.loanTokenAmount > 0 && cancelLoanTokenAmount > 0, "BZxOrderTaking::_cancelLoanOrder: invalid params");

        if (loanOrderAux.expirationUnixTimestampSec > 0 && block.timestamp >= loanOrderAux.expirationUnixTimestampSec) {
            _removeLoanOrder(loanOrder.loanOrderHash, address(0));
            return 0;
        }

        uint remainingLoanTokenAmount = loanOrder.loanTokenAmount.sub(_getUnavailableLoanTokenAmount(loanOrder.loanOrderHash));
        uint cancelledLoanTokenAmount = Math.min256(cancelLoanTokenAmount, remainingLoanTokenAmount);
        if (cancelledLoanTokenAmount == 0) {
            // none left to cancel
            return 0;
        }

        if (remainingLoanTokenAmount == cancelledLoanTokenAmount) {
            _removeLoanOrder(loanOrder.loanOrderHash, address(0));
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
}

