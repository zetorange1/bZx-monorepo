import { BigNumber } from "bignumber.js";

// const SCALE_FACTOR = BigNumber(1e18);

export const fromBigNumber = (num, scale = 1) =>
  BigNumber(num)
    .div(scale)
    .toNumber();

export const toBigNumber = (num, scale = 1) => BigNumber(num).times(scale);
