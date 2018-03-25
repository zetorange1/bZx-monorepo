import { pipe, map } from "ramda";

const ORDER_FIELD_COUNT = 14;
const MAX_SOLIDITY_TYPE_SIZE = 64;
const HEX_RADIX = 16;

const remove0xPrefix = data => data.substr(2);

const checkProperObjCount = data => {
  const objCount = data.length / MAX_SOLIDITY_TYPE_SIZE / ORDER_FIELD_COUNT;
  if (objCount % 1 !== 0) throw new Error("Must be whole number of objects");
  return data;
};

const getOrderObjArray = data =>
  data.match(
    new RegExp(`.{1,${ORDER_FIELD_COUNT * MAX_SOLIDITY_TYPE_SIZE}}`, "g")
  );

const getOrderParams = data =>
  data.match(new RegExp(`.{1,${MAX_SOLIDITY_TYPE_SIZE}}`, "g"));

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

export const cleanData = raw =>
  pipe(
    remove0xPrefix,
    checkProperObjCount,
    getOrderObjArray,
    map(pipe(getOrderParams, getOrder))
  )(raw);
