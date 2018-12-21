import * as constants from "../constants";
import * as Addresses from "./addresses";
import { local as Contracts } from "../../contracts";
import * as orderConstants from "../constants/order";
import Accounts from "./accounts";

export default ({
  makerAddress = Accounts[0].address,

  loanTokenAddress = Addresses.ZRXToken,
  interestTokenAddress = Addresses.ZRXToken,
  collateralTokenAddress = Addresses.ZRXToken,
  feeRecipientAddress = constants.NULL_ADDRESS,

  loanTokenAmount = "40000",
  interestAmount = "2",

  initialMarginAmount = "50000000000000000000",
  maintenanceMarginAmount = "25000000000000000000",

  lenderRelayFee = "10000",
  traderRelayFee = "10000",

  maxDurationUnixTimestampSec = "2419200", // 28 days

  expirationUnixTimestampSec = "2519061340",

  makerRole = orderConstants.MAKER_ROLE.LENDER,
  withdrawOnOpen = "0",
  salt = "2019429563929979"
} = {}) => ({
  bZxAddress: Contracts.BZx.address,
  makerAddress,

  // addresses
  loanTokenAddress,
  interestTokenAddress,
  collateralTokenAddress,
  feeRecipientAddress,
  oracleAddress: Contracts.BZxOracle.address,

  // token amounts
  loanTokenAmount,
  interestAmount,

  // margin amounts
  initialMarginAmount,
  maintenanceMarginAmount,

  // relay fees
  lenderRelayFee,
  traderRelayFee,

  maxDurationUnixTimestampSec, // 28 days

  // expiration date/time
  expirationUnixTimestampSec,

  makerRole,
  withdrawOnOpen,
  salt
});
