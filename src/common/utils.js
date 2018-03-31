import { BigNumber } from "bignumber.js";

// const SCALE_FACTOR = BigNumber(1e18);

export const fromBigNumber = (bigNum, scale = 1) =>
  bigNum.div(scale).toNumber();

export const toBigNumber = (num, scale = 1) => {
  const bigNum = BigNumber(num);
  return bigNum.times(scale);
};
