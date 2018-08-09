
pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/ReentrancyGuard.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "../modifiers/GasTracker.sol";


contract BZxObjects {

    struct LoanOrder {
        address maker;
        address loanTokenAddress;
        address interestTokenAddress;
        address collateralTokenAddress;
        address oracleAddress;
        uint loanTokenAmount;
        uint interestAmount;
        uint initialMarginAmount;
        uint maintenanceMarginAmount;
        uint expirationUnixTimestampSec;
        uint makerRole;
        bytes32 loanOrderHash;
    }

    struct LoanOrderFees {
        address feeRecipientAddress;
        uint lenderRelayFee;
        uint traderRelayFee;
    }

    struct LoanRef {
        bytes32 loanOrderHash;
        address trader;
    }

    struct LoanPosition {
        address lender;
        address trader;
        address collateralTokenAddressFilled;
        address positionTokenAddressFilled;
        uint loanTokenAmountFilled;
        uint collateralTokenAmountFilled;
        uint positionTokenAmountFilled;
        uint loanStartUnixTimestampSec;
        uint index;
        bool active;
    }

    struct InterestData {
        address lender;
        address interestTokenAddress;
        uint interestTotalAccrued;
        uint interestPaidSoFar;
    }

    event LogLoanAdded (
        bytes32 loanOrderHash,
        address adder,
        address maker,
        address feeRecipientAddress,
        uint lenderRelayFee,
        uint traderRelayFee,
        uint expirationUnixTimestampSec,
        uint makerRole
    );

    event LogLoanTaken (
        address lender,
        address trader,
        address collateralTokenAddressFilled,
        address positionTokenAddressFilled,
        uint loanTokenAmountFilled,
        uint collateralTokenAmountFilled,
        uint positionTokenAmountFilled,
        uint loanStartUnixTimestampSec,
        bool active,
        bytes32 loanOrderHash
    );

    event LogLoanCancelled(
        address maker,
        uint cancelLoanTokenAmount,
        uint remainingLoanTokenAmount,
        bytes32 loanOrderHash
    );

    event LogLoanClosed(
        address lender,
        address trader,
        //address loanCloser,
        bool isLiquidation,
        bytes32 loanOrderHash
    );

    event LogPositionTraded(
        bytes32 loanOrderHash,
        address trader,
        address sourceTokenAddress,
        address destTokenAddress,
        uint sourceTokenAmount,
        uint destTokenAmount
    );

    event LogMarginLevels(
        bytes32 loanOrderHash,
        address trader,
        uint initialMarginAmount,
        uint maintenanceMarginAmount,
        uint currentMarginAmount
    );

    event LogWithdrawProfit(
        bytes32 loanOrderHash,
        address trader,
        uint profitWithdrawn,
        uint remainingPosition
    );

    event LogPayInterest(
        bytes32 loanOrderHash,
        address lender,
        address trader,
        uint amountPaid,
        uint totalAccrued
    );
}


// bZx shared storage
contract BZxStorage is BZxObjects, ReentrancyGuard, Ownable, GasTracker {
    uint internal constant MAX_UINT = 2**256 - 1;

/* solhint-disable var-name-mixedcase */
    address public bZRxTokenContract;
    address public vaultContract;
    address public oracleRegistryContract;
    address public bZxTo0xContract;
    address public bZxTo0xV2Contract;
    bool public DEBUG_MODE = false;
/* solhint-enable var-name-mixedcase */

    mapping (bytes32 => LoanOrder) public orders; // mapping of loanOrderHash to taken loanOrders
    mapping (bytes32 => LoanOrderFees) public orderFees; // mapping of loanOrderHash to taken loanOrder Fees
    mapping (address => bytes32[]) public orderList; // mapping of lenders and trader addresses to array of loanOrderHashes
    mapping (bytes32 => address) public orderLender; // mapping of loanOrderHash to lender address
    mapping (bytes32 => address[]) public orderTraders; // mapping of loanOrderHash to array of trader addresses
    mapping (bytes32 => uint) public orderFilledAmounts; // mapping of loanOrderHash to loanTokenAmount filled
    mapping (bytes32 => uint) public orderCancelledAmounts; // mapping of loanOrderHash to loanTokenAmount cancelled
    mapping (address => address) public oracleAddresses; // mapping of oracles to their current logic contract
    mapping (bytes32 => mapping (address => LoanPosition)) public loanPositions; // mapping of loanOrderHash to mapping of traders to loanPositions
    mapping (bytes32 => mapping (address => uint)) public interestPaid; // mapping of loanOrderHash to mapping of traders to amount of interest paid so far to a lender

    LoanRef[] public loanList; // array of loans that need to be checked for liquidation or expiration
}
