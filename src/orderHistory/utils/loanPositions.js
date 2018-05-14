import { pipe, map } from "ramda";
import * as Utils from "./index";

const NUM_LOAN_POS_FIELDS = 15;
const HEX_RADIX = 16;

const getLoanPosition = params => ({
  lender: `0x${params[0].substr(24)}`,
  trader: `0x${params[1].substr(24)}`,
  collateralTokenAddressFilled: `0x${params[2].substr(24)}`,
  positionTokenAddressFilled: `0x${params[3].substr(24)}`,
  loanTokenAmountFilled: parseInt(`0x${params[4]}`, HEX_RADIX),
  collateralTokenAmountFilled: parseInt(`0x${params[5]}`, HEX_RADIX),
  positionTokenAmountFilled: parseInt(`0x${params[6]}`, HEX_RADIX),
  loanStartUnixTimestampSec: parseInt(`0x${params[7]}`, HEX_RADIX),
  index: parseInt(`0x${params[8]}`, HEX_RADIX),
  active: parseInt(`0x${params[9]}`, HEX_RADIX),
  loanOrderHash: `0x${params[10]}`,
  loanTokenAddress: `0x${params[11].substr(24)}`,
  interestTokenAddress: `0x${params[12].substr(24)}`,
  interestTotalAccrued: parseInt(`0x${params[13]}`, HEX_RADIX),
  interestPaidSoFar: parseInt(`0x${params[14]}`, HEX_RADIX)
});

const checkProperObjCount = Utils.makeCheckProperObjCount(NUM_LOAN_POS_FIELDS);
const getOrderObjArray = Utils.makeGetOrderObjArray(NUM_LOAN_POS_FIELDS);

export const cleanData = raw =>
  raw
    ? pipe(
        Utils.remove0xPrefix,
        checkProperObjCount,
        getOrderObjArray,
        map(pipe(Utils.getOrderParams, getLoanPosition))
      )(raw)
    : [];
