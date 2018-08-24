import { pipe, map } from "ramda";
import * as Utils from "./index";

const NUM_ORDER_FIELDS = 20;

const getOrder = params => ({
  ...map(pipe(Utils.substr24, Utils.prepend0x), {
    maker: params[0],
    loanTokenAddress: params[1],
    interestTokenAddress: params[2],
    collateralTokenAddress: params[3],
    feeRecipientAddress: params[4],
    oracleAddress: params[5],
    lender: params[15]
  }),
  ...map(pipe(Utils.prepend0x, Utils.parseIntHex), {
    loanTokenAmount: params[6],
    interestAmount: params[7],
    initialMarginAmount: params[8],
    maintenanceMarginAmount: params[9],
    lenderRelayFee: params[10],
    traderRelayFee: params[11],
    maxDurationUnixTimestampSec: params[12],
    expirationUnixTimestampSec: params[13],
    orderFilledAmount: params[16],
    orderCancelledAmount: params[17],
    orderTraderCount: params[18],
    addedUnixTimestampSec: params[19]
  }),
  loanOrderHash: Utils.prepend0x(params[14])
});

const checkProperObjCount = Utils.makeCheckProperObjCount(NUM_ORDER_FIELDS);
const getOrderObjArray = Utils.makeGetOrderObjArray(NUM_ORDER_FIELDS);

export const cleanData = raw =>
  raw
    ? pipe(
        Utils.remove0xPrefix,
        checkProperObjCount,
        getOrderObjArray,
        map(pipe(Utils.getOrderParams, getOrder))
      )(raw)
    : [];
