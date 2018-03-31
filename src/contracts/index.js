import { map, contains, pathOr } from "ramda";
import _ropsten from "./ropsten";
import _local from "./local";

const toLowerCase = map(({ address, ...rest }) => ({
  address: address.toLowerCase(),
  ...rest
}));

const networksRaw = {
  local: _local,
  ropsten: _ropsten
};
const networks = map(network => toLowerCase(network), networksRaw);

const { local, ropsten } = networks;
export { local, ropsten };

export const getContracts = provider => {
  const host = pathOr(null, ["host"], provider);
  if (contains("localhost", host)) return local;
  return ropsten;
};
