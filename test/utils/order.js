import { constants as constantsZX } from "0x.js/lib/src/utils/constants";
import * as Addresses from "../constants/addresses";
import contracts from "../../src/contracts";
import * as constants from "../../src/constants/order";

export default ({
  makerAddress = Addresses.ACCOUNTS[0],

  loanTokenAddress = Addresses.ZRXToken,
  interestTokenAddress = Addresses.ZRXToken,
  collateralTokenAddress = Addresses.ZRXToken,
  feeRecipientAddress = constantsZX.NULL_ADDRESS,

  loanTokenAmount = "40000",
  interestAmount = "2",

  initialMarginAmount = "50",
  maintenanceMarginAmount = "25",

  lenderRelayFee = "10000",
  traderRelayFee = "10000",

  expirationUnixTimestampSec = "2519061340",

  makerRole = constants.MAKER_ROLE.LENDER,
  salt = "2019429563929979"
} = {}) => ({
  b0xAddress: contracts.B0x.address,
  makerAddress,

  // addresses
  loanTokenAddress,
  interestTokenAddress,
  collateralTokenAddress,
  feeRecipientAddress,
  oracleAddress: contracts.B0xOracle.address,

  // token amounts
  loanTokenAmount,
  interestAmount,

  // margin amounts
  initialMarginAmount,
  maintenanceMarginAmount,

  // relay fees
  lenderRelayFee,
  traderRelayFee,

  // expiration date/time
  expirationUnixTimestampSec,

  makerRole,
  salt
});
