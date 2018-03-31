import { map } from "ramda";
import ropsten from "./ropsten";
import local from "./local";

const contractsRaw = process.env.NODE_ENV === "production" ? ropsten : local;
const contracts = map(
  ({ address, ...rest }) => ({ address: address.toLowerCase(), ...rest }),
  contractsRaw
);

export default contracts;
