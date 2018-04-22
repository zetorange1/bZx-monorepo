import { BigNumber } from "bignumber.js";

// const SCALE_FACTOR = BigNumber(1e18);

export const fromBigNumber = (num, scale = 1) =>
  BigNumber(num)
    .div(scale)
    .toNumber();

export const toBigNumber = (num, scale = 1) => BigNumber(num).times(scale);

export const getInitialCollateralRequired = async (
  loanTokenAddress,
  collateralTokenAddress,
  oracleAddress,
  loanTokenAmountFilled,
  initialMarginAmount,
  b0x
) =>
  b0x.getInitialCollateralRequired(
    loanTokenAddress,
    collateralTokenAddress,
    oracleAddress,
    toBigNumber(loanTokenAmountFilled, 1e18).toFixed(0),
    initialMarginAmount
  );
