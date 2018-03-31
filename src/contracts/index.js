import { map } from "ramda";
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
