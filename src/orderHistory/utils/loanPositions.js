import { pipe, map } from "ramda";
import { SOLIDITY_TYPE_MAX_CHARS } from "../../core/constants";

const LOAN_POS_FIELD_COUNT = 9;
const HEX_RADIX = 16;

const remove0xPrefix = data => data.substr(2);

const checkProperObjCount = data => {
  const objCount = data.length / SOLIDITY_TYPE_MAX_CHARS / LOAN_POS_FIELD_COUNT;
  if (objCount % 1 !== 0)
    throw new Error("Data length invalid. Must be whole number of objects");
  return data;
};

const getOrderObjArray = data =>
  data.match(
    new RegExp(`.{1,${LOAN_POS_FIELD_COUNT * SOLIDITY_TYPE_MAX_CHARS}}`, "g")
  );

const getOrderParams = data =>
  data.match(new RegExp(`.{1,${SOLIDITY_TYPE_MAX_CHARS}}`, "g"));

const getLoanPosition = params => ({
  lender: `0x${params[0].substr(24)}`,
  trader: `0x${params[1].substr(24)}`,
  collateralTokenAddressFilled: `0x${params[2].substr(24)}`,
  positionTokenAddressFilled: `0x${params[3].substr(24)}`,
  loanTokenAmountFilled: parseInt(`0x${params[4]}`, HEX_RADIX),
  collateralTokenAmountFilled: parseInt(`0x${params[5]}`, HEX_RADIX),
  positionTokenAmountFilled: parseInt(`0x${params[6]}`, HEX_RADIX),
  loanStartUnixTimestampSec: parseInt(`0x${params[7]}`, HEX_RADIX),
  active: parseInt(`0x${params[8]}`, HEX_RADIX)
});

export const cleanData = raw =>
  pipe(
    remove0xPrefix,
    checkProperObjCount,
    getOrderObjArray,
    map(pipe(getOrderParams, getLoanPosition))
  )(raw);
