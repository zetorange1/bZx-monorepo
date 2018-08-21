import blockies from "ethereum-blockies-png";

export const TOKENS = {
  WETH: {
    label: `Wrapped Ether`,
    address: `WETH_SM_ADDRESS_HERE`,
    iconUrl: `https://files.coinmarketcap.com/static/img/coins/128x128/ethereum.png`,
    decimals: 18
  },
  ZRX: {
    label: `0x Protocol Token`,
    address: `ZRX_SM_ADDRESS_HERE`,
    iconUrl: `https://files.coinmarketcap.com/static/img/coins/128x128/0x.png`,
    decimals: 18
  },
  MKR: {
    label: `MakerDAO`,
    address: `MKR_SM_ADDRESS_HERE`,
    iconUrl: `https://files.coinmarketcap.com/static/img/coins/128x128/maker.png`,
    decimals: 18
  }
};

export const getSymbol = (tokens, address) => {
  if (!window.tokenSymbols[address]) {
    const tokenData = tokens.filter(t => t.address === address)[0];
    window.tokenSymbols[address] = tokenData ? tokenData.symbol : `unknown`;
  }
  return window.tokenSymbols[address];
};

export const getDecimals = (tokens, address) => {
  if (!window.tokenDecimals[address]) {
    const tokenData = tokens.filter(t => t.address === address)[0];
    window.tokenDecimals[address] = tokenData ? tokenData.decimals : 18;
  }
  return window.tokenDecimals[address];
};

export const getIconURL = ({ url, address }) => {
  if (url) {
    return url;
  }
  const dataURL = blockies.createDataURL({ seed: address });
  return dataURL;
};

export const getTokenInfo = address => {
  const tokenArray = Object.entries(TOKENS).map(([symbol, data]) => ({
    name: data.label,
    symbol,
    decimals: data.decimals,
    address: data.address
  }));
  return tokenArray.filter(token => token.address === address)[0];
};

export const getTokenInfoWithIcon = address => {
  const tokenArray = Object.entries(TOKENS).map(([symbol, data]) => ({
    name: data.label,
    symbol,
    decimals: data.decimals,
    address: data.address,
    iconUrl: getIconURL({ symbol })
  }));
  return tokenArray.filter(token => token.address === address)[0];
};

export const getTokenBalance = async (bZx, tokenAddress, accounts) => {
  const balance = await bZx.getBalance({
    tokenAddress,
    ownerAddress: accounts[0].toLowerCase()
  });
  return balance; // returns a BigNumber
};
