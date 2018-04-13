import { map } from "ramda";
import _local from "./local";
import _ropsten from "./ropsten";
import _kovan from "./kovan";
import _rinkeby from "./rinkeby";

const toLowerCase = map(({ address, ...rest }) => ({
  address: address.toLowerCase(),
  ...rest
}));

const networksRaw = {
  local: _local,
  ropsten: _ropsten,
  kovan: _kovan,
  rinkeby: _rinkeby
};
const networks = map(network => toLowerCase(network), networksRaw);

export const { local, ropsten, kovan, rinkeby } = networks;

const networksById = {
  3: ropsten,
  4: rinkeby,
  42: kovan
};

export const getContracts = (networkId = null) =>
  networksById[networkId] ? networksById[networkId] : local;
