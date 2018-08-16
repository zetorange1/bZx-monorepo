/* globals localStorage */

export const getWeb3ProviderName = () => {
  const provider = localStorage.getItem(`web3Provider`);
  return provider;
};

export const setWeb3ProviderName = providerName => {
  localStorage.setItem(`web3Provider`, providerName);
};

export const clearWeb3ProviderName = () => {
  localStorage.removeItem(`web3Provider`);
  localStorage.removeItem(`web3Obj`);
};

/* export const setWeb3ProviderName = providerName => {
  localStorage.setItem(`web3Provider`, providerName);
}; */
