import { pipe, map } from "ramda";
import * as Utils from "./index";

const NUM_LOAN_POS_FIELDS = 16;

const getLoanPosition = params => ({
  ...map(pipe(Utils.substr24, Utils.prepend0x), {
    lender: params[0],
    trader: params[1],
    collateralTokenAddressFilled: params[2],
    positionTokenAddressFilled: params[3],
    loanTokenAddress: params[11],
    interestTokenAddress: params[12]
  }),
  ...map(pipe(Utils.prepend0x, Utils.parseIntHex), {
    loanTokenAmountFilled: params[4],
    collateralTokenAmountFilled: params[5],
    positionTokenAmountFilled: params[6],
    loanStartUnixTimestampSec: params[7],
    loanEndUnixTimestampSec: params[8],
    active: params[9],
    interestTotalAccrued: params[13],
    interestPaidSoFar: params[14],
    interestLastPaidDate: params[15]
  }),
  ...map(pipe(Utils.prepend0x), {
    loanOrderHash: params[10]
  })
});

const checkProperObjCount = Utils.makeCheckProperObjCount(NUM_LOAN_POS_FIELDS);
const getOrderObjArray = Utils.makeGetOrderObjArray(NUM_LOAN_POS_FIELDS);

export const cleanData = raw =>
  raw
    ? pipe(
        Utils.remove0xPrefix,
        checkProperObjCount,
        getOrderObjArray,
        map(
          pipe(
            Utils.getOrderParams,
            getLoanPosition
          )
        )
      )(raw)
    : [];
