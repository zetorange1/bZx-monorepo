import { SOLIDITY_TYPE_MAX_CHARS } from "../../core/constants";

export const remove0xPrefix = data => (data ? data.substr(2) : "");

export const makeCheckProperObjCount = numFields => data => {
  const objCount = data.length / SOLIDITY_TYPE_MAX_CHARS / numFields;
  if (objCount % 1 !== 0)
    throw new Error("Data length invalid, must be whole number of objects");
  return data;
};

export const makeGetOrderObjArray = numFields => data =>
  data.match(new RegExp(`.{1,${numFields * SOLIDITY_TYPE_MAX_CHARS}}`, "g"));

export const getOrderParams = data =>
  data.match(new RegExp(`.{1,${SOLIDITY_TYPE_MAX_CHARS}}`, "g"));

const HEX_RADIX = 16;
export const prepend0x = arg => `0x${arg}`;
export const substr24 = arg => arg.substr(24);
export const parseIntHex = arg => parseInt(arg, HEX_RADIX);
