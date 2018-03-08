import * as Addresses from "../constants/addresses";
import contracts from "../../src/contracts";

const makeOrder = ({
  makerAddress = Addresses.ACCOUNTS[0],
  feeRecipientAddress = Addresses.ACCOUNTS[0],
  networkId = 1,
  salt = "2019429563929979"
}) => ({
  b0xAddress: contracts.B0x.address,
  makerAddress,
  networkId,

  // addresses
  loanTokenAddress: Addresses.EtherToken,
  interestTokenAddress: Addresses.EtherToken,
  collateralTokenAddress: Addresses.EtherToken,
  feeRecipientAddress,
  oracleAddress: contracts.B0xOracle.address,

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
  salt
});

export default (props = {}) => makeOrder(props);
