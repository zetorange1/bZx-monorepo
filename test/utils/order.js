import { constants as constantsZX } from "0x.js/lib/src/utils/constants";
import * as Addresses from "../constants/addresses";
import contracts from "../../src/contracts";
import * as constants from "../../src/constants/order";

export default ({
  makerRole = constants.MAKER_ROLE.LENDER,
  makerAddress = Addresses.ACCOUNTS[0],
  networkId = 1,
  collateralTokenAddress = Addresses.ZRXToken,
  feeRecipientAddress = constantsZX.NULL_ADDRESS,
  salt = "2019429563929979",
  loanTokenAmount = "40000"
} = {}) => ({
  makerRole,
  b0xAddress: contracts.B0x.address,
  makerAddress,
  networkId,

  // addresses
  loanTokenAddress: Addresses.ZRXToken,
  interestTokenAddress: Addresses.ZRXToken,
  collateralTokenAddress,
  feeRecipientAddress,
  oracleAddress: contracts.B0xOracle.address,

  // token amounts
  loanTokenAmount,
  interestAmount: "2",

  // margin amounts
  initialMarginAmount: "50",
  maintenanceMarginAmount: "25",

  // relay fees
  lenderRelayFee: "10000",
  traderRelayFee: "10000",

  // expiration date/time
  expirationUnixTimestampSec: "2519061340",
  salt
});
