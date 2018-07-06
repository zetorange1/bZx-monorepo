/* globals localStorage */

export const PERMA_TOKEN_SYMBOLS = [`BZX`, `ZRX`, `WETH`];

export const FAUCET_TOKEN_SYMBOLS = {
  ropsten: [`BZX`],
  rinkeby: [
    `BZX`,
    `TEST0`,
    `TEST1`,
    `TEST2`,
    `TEST3`,
    `TEST4`,
    `TEST5`,
    `TEST6`,
    `TEST7`,
    `TEST8`,
    `TEST9`
  ],
  kovan: [
    `BZX`,
    `TEST0`,
    `TEST1`,
    `TEST2`,
    `TEST3`,
    `TEST4`,
    `TEST5`,
    `TEST6`,
    `TEST7`,
    `TEST8`,
    `TEST9`
  ]
};

// Gets an array of addresses of the perma tokens.
const getPermaTokens = tokens =>
  tokens
    .filter(t => PERMA_TOKEN_SYMBOLS.includes(t.symbol))
    .map(t => t.address);

// Gets an array of all tracked token addresses (including perma tokens).
export const getTrackedTokens = tokens => {
  const res = localStorage.getItem(`trackedTokens`);
  const data = JSON.parse(res);
  const trackedTokens = data && data.length > 0 ? data : [];
  return [...getPermaTokens(tokens), ...trackedTokens];
};

// Gets the tokens stored in local storage; omits perma tokens.
const getStoredTokens = tokens => {
  const trackedTokens = getTrackedTokens(tokens);
  const permaTokens = getPermaTokens(tokens);
  return trackedTokens.filter(addr => !permaTokens.includes(addr));
};

export const addTrackedToken = (tokens, addr) => {
  const storedTokens = getStoredTokens(tokens);
  const alreadyExists = storedTokens.includes(addr);
  if (!alreadyExists) {
    const newTrackedTokens = [...storedTokens, addr];
    localStorage.setItem(`trackedTokens`, JSON.stringify(newTrackedTokens));
  }
};

export const removeTrackedToken = (tokens, addr) => {
  const storedTokens = getStoredTokens(tokens);
  const newTrackedTokens = storedTokens.filter(x => x !== addr);
  localStorage.setItem(`trackedTokens`, JSON.stringify(newTrackedTokens));
};
