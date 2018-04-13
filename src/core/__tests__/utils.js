export const expectPromiEvent = candidate => {
  // https://web3js.readthedocs.io/en/1.0/callbacks-promises-events.html#promievent
  const requiredFns = ["on", "once", "off"];
  const candidateFns = Object.getOwnPropertyNames(candidate);
  expect(candidateFns).toEqual(expect.arrayContaining(requiredFns));
};
