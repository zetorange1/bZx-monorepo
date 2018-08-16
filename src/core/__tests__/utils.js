import { omit } from "ramda";

export const expectPromiEvent = candidate => {
  // https://web3js.readthedocs.io/en/1.0/callbacks-promises-events.html#promievent
  const requiredFns = ["on", "once", "off"];
  const candidateFns = Object.getOwnPropertyNames(candidate);
  expect(candidateFns).toEqual(expect.arrayContaining(requiredFns));
};

export const makeReplaceRandomFields = (randomFields = []) => (obj = {}) => {
  const noRandomFields = omit(randomFields, obj);
  const dummyStr = "this is a random field";
  const replaced = randomFields.reduce(
    (prev, curr) => ({ ...prev, [curr]: dummyStr }),
    {}
  );
  return { ...noRandomFields, ...replaced };
};
