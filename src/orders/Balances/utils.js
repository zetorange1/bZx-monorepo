/* globals localStorage */

export const permaTokens = [`WETH_SM_ADDRESS_HERE`, `ZRX_SM_ADDRESS_HERE`];

export const getTrackedTokens = () => {
  const storedTokens = localStorage.getItem(`trackedTokens`);
  return storedTokens ? [...permaTokens, ...storedTokens] : permaTokens;
};

export const addTrackedToken = tokenAddress => {
  const currTokens = getTrackedTokens();
  const newTrackedTokens = currTokens.push(tokenAddress);
  return localStorage.setItem(`trackedTokens`, newTrackedTokens);
};

export const removeTrackedToken = tokenAddress => {
  const currTokens = getTrackedTokens();
  const newTrackedTokens = currTokens.filter(token => token !== tokenAddress);
  return localStorage.setItem(`trackedTokens`, newTrackedTokens);
};
