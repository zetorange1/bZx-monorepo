export const TOKENS = {
  WETH: {
    label: `Ether Token`,
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
  const tokenData = tokens.filter(t => t.address === address)[0];
  return tokenData.symbol;
};

export const getIconURL = ({ symbol }) => {
  if (TOKENS[symbol]) {
    return TOKENS[symbol].iconUrl;
  }
  return `https://files.coinmarketcap.com/static/img/coins/128x128/bitcoin.png`;
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
