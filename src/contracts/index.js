import { map } from "ramda";
import _local from "./local";
import _ropsten from "./ropsten";
import _kovan from "./kovan";

const toLowerCase = map(({ address, ...rest }) => ({
  address: address.toLowerCase(),
  ...rest
}));

const networksRaw = {
  local: _local,
  ropsten: _ropsten,
  kovan: _kovan
};
const networks = map(network => toLowerCase(network), networksRaw);

const { local, ropsten, kovan } = networks;
export { local, ropsten, kovan };

const networksById = {
  3: ropsten,
  42: kovan
};

export const getContracts = (networkId = null) =>
  networksById[networkId] ? networksById[networkId] : local;
