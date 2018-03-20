/* globals localStorage */

export const PERMA_TOKEN_SYMBOLS = [`B0X`, `ZRX`, `WETH`];

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
  console.log(`trackedTokens`, trackedTokens);
  console.log(`permaTokens`, permaTokens);
  return trackedTokens.filter(addr => !permaTokens.includes(addr));
};

export const addTrackedToken = (tokens, addr) => {
  const storedTokens = getStoredTokens(tokens);
  console.log(`storedTokens`, storedTokens);
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
