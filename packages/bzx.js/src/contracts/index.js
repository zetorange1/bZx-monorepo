import { map } from "ramda";
import _local from "./local";
import _mainnet, { TokenList as mainnetTokens/* , OracleList as mainnetOracles */ } from "./mainnet";
import _ropsten, { TokenList as ropstenTokens/* , OracleList as ropstenOracles */ } from "./ropsten";
import _rinkeby, { TokenList as rinkebyTokens/* , OracleList as rinkebyOracles */ } from "./rinkeby";
import _kovan from "./kovan";

const toLowerCase = map(({ address, ...rest }) => ({
  address: address.toLowerCase(),
  ...rest
}));

const networksRaw = {
  local: _local,
  mainnet: _mainnet,
  ropsten: _ropsten,
  kovan: _kovan,
  rinkeby: _rinkeby
};
const networks = map(network => toLowerCase(network), networksRaw);

export const { local, mainnet, ropsten, kovan, rinkeby } = networks;

const networksById = {
  1: mainnet,
  3: ropsten,
  4: rinkeby,
  42: kovan
};

const tokensById = {
  1: mainnetTokens,
  3: ropstenTokens,
  4: rinkebyTokens
};

const oraclesById = {
  /* 1: mainnetOracles,
  3: ropstenOracles,
  4: rinkebyOracles */
};

export const getContracts = (networkId = null) =>
  networksById[networkId] ? networksById[networkId] : local;

export const tokenList = (networkId = null) =>
  tokensById[networkId] ? toLowerCase(tokensById[networkId]) : undefined;

export const oracleList = (networkId = null) =>
  oraclesById[networkId] ? oraclesById[networkId] : undefined;
