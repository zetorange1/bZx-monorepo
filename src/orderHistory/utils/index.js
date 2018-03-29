import { SOLIDITY_TYPE_MAX_CHARS } from "../../core/constants";

export const remove0xPrefix = data => data.substr(2);

export const makeCheckProperObjCount = numFields => data => {
  const objCount = data.length / SOLIDITY_TYPE_MAX_CHARS / numFields;
  if (objCount % 1 !== 0) throw new Error("Must be whole number of objects");
  return data;
};

export const makeGetOrderObjArray = numFields => data =>
  data.match(new RegExp(`.{1,${numFields * SOLIDITY_TYPE_MAX_CHARS}}`, "g"));

export const getOrderParams = data =>
  data.match(new RegExp(`.{1,${SOLIDITY_TYPE_MAX_CHARS}}`, "g"));
