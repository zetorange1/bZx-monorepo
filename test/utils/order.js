import * as Addresses from "../constants/addresses";

const makeOrder = ({
  makerAddress = Addresses.ACCOUNTS[0],
  feeRecipientAddress = Addresses.ACCOUNTS[0],
  networkId = 1
}) => ({
  b0xAddress: Addresses.B0x,
  makerAddress,
  networkId,

  // addresses
  loanTokenAddress: Addresses.EtherToken,
  interestTokenAddress: Addresses.EtherToken,
  collateralTokenAddress: Addresses.EtherToken,
  feeRecipientAddress,
  oracleAddress: Addresses.B0xOracle,

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
});

export default (props = {}) => makeOrder(props);
