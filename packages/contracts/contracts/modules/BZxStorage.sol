
pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/ReentrancyGuard.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "../modifiers/GasTracker.sol";


contract BZxObjects {

    struct ListIndex {
        uint index;
        bool isSet;
    }

    struct LoanOrder {
        address loanTokenAddress;
        address interestTokenAddress;
        address collateralTokenAddress;
        address oracleAddress;
        uint loanTokenAmount;
        uint interestAmount;
        uint initialMarginAmount;
        uint maintenanceMarginAmount;
        uint maxDurationUnixTimestampSec;
        bytes32 loanOrderHash;
    }

    struct LoanOrderAux {
        address maker;
        address feeRecipientAddress;
        uint lenderRelayFee;
        uint traderRelayFee;
        uint makerRole;
        uint expirationUnixTimestampSec;
    }

    struct LoanPosition {
        address trader;
        address collateralTokenAddressFilled;
        address positionTokenAddressFilled;
        uint loanTokenAmountFilled;
        uint collateralTokenAmountFilled;
        uint positionTokenAmountFilled;
        uint loanStartUnixTimestampSec;
        uint loanEndUnixTimestampSec;
        bool active;
    }

    struct PositionRef {
        bytes32 loanOrderHash;
        uint positionId;
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
        uint maxDuration,
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
        address loanCloser,
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

    event LogChangeTraderOwnership(
        bytes32 loanOrderHash,
        address oldOwner,
        address newOwner
    );

    event LogChangeLenderOwnership(
        bytes32 loanOrderHash,
        address oldOwner,
        address newOwner
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

    // Loan Orders
    mapping (bytes32 => LoanOrder) public orders; // mapping of loanOrderHash to on chain loanOrders
    mapping (bytes32 => LoanOrderAux) public orderAux; // mapping of loanOrderHash to on chain loanOrder auxiliary parameters
    mapping (bytes32 => uint) public orderFilledAmounts; // mapping of loanOrderHash to loanTokenAmount filled
    mapping (bytes32 => uint) public orderCancelledAmounts; // mapping of loanOrderHash to loanTokenAmount cancelled
    mapping (bytes32 => address) public orderLender; // mapping of loanOrderHash to lender (only one lender per order)

    // Loan Positions
    mapping (uint => LoanPosition) public loanPositions; // mapping of position ids to loanPositions
    mapping (bytes32 => mapping (address => uint)) public loanPositionsIds; // mapping of loanOrderHash to mapping of trader address to position id

    // Lists
    mapping (address => bytes32[]) public orderList; // mapping of lenders and trader addresses to array of loanOrderHashes
    mapping (bytes32 => mapping (address => ListIndex)) public orderListIndex; // mapping of loanOrderHash to mapping of lenders and trader addresses to ListIndex objects

    mapping (bytes32 => uint[]) public orderPositionList; // mapping of loanOrderHash to array of order position ids

    PositionRef[] public positionList; // array of loans that need to be checked for liquidation or expiration
    mapping (uint => ListIndex) public positionListIndex; // mapping of position ids to ListIndex objects

    // Other Storage
    mapping (bytes32 => mapping (uint => uint)) public interestPaid; // mapping of loanOrderHash to mapping of position ids to amount of interest paid so far to a lender
    mapping (address => address) public oracleAddresses; // mapping of oracles to their current logic contract
}



