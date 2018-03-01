import * as addresses from "./addresses";

export default {
  b0xAddress: addresses.B0x,
  makerAddress: addresses.ACCOUNTS[0],
  networkId: 1,

  // addresses
  loanTokenAddress: addresses.ZRXToken,
  interestTokenAddress: addresses.ZRXToken,
  collateralTokenAddress: addresses.ZRXToken,
  feeRecipientAddress: addresses.ACCOUNTS[0],
  oracleAddress: addresses.B0xOracle,

  // token amounts
  loanTokenAmount: "40",
  interestAmount: "41",

  // margin amounts
  initialMarginAmount: "40",
  maintenanceMarginAmount: "20",

  // relay fees
  lenderRelayFee: "0",
  traderRelayFee: "0",

  // expiration date/time
  expirationUnixTimestampSec: "2519061340",
  salt: "2019429563929979"
};
