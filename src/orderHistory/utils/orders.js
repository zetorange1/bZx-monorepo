import { pipe, map } from "ramda";
import * as Utils from "./index";

const NUM_ORDER_FIELDS = 14;
const HEX_RADIX = 16;

const getOrder = params => ({
  maker: `0x${params[0].substr(24)}`,
  loanTokenAddress: `0x${params[1].substr(24)}`,
  interestTokenAddress: `0x${params[2].substr(24)}`,
  collateralTokenAddress: `0x${params[3].substr(24)}`,
  feeRecipientAddress: `0x${params[4].substr(24)}`,
  oracleAddress: `0x${params[5].substr(24)}`,
  loanTokenAmount: parseInt(`0x${params[6]}`, HEX_RADIX),
  interestAmount: parseInt(`0x${params[7]}`, HEX_RADIX),
  initialMarginAmount: parseInt(`0x${params[8]}`, HEX_RADIX),
  maintenanceMarginAmount: parseInt(`0x${params[9]}`, HEX_RADIX),
  lenderRelayFee: parseInt(`0x${params[10]}`, HEX_RADIX),
  traderRelayFee: parseInt(`0x${params[11]}`, HEX_RADIX),
  expirationUnixTimestampSec: parseInt(`0x${params[12]}`, HEX_RADIX),
  loanOrderHash: `0x${params[13]}`
});

const checkProperObjCount = Utils.makeCheckProperObjCount(NUM_ORDER_FIELDS);
const getOrderObjArray = Utils.makeGetOrderObjArray(NUM_ORDER_FIELDS);

export const cleanData = raw =>
  raw ?
  pipe(
    Utils.remove0xPrefix,
    checkProperObjCount,
    getOrderObjArray,
    map(pipe(Utils.getOrderParams, getOrder))
  )(raw) :
  [];
