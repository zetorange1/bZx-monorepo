import { map, pipe, pathOr, contains } from "ramda";
import { local, ropsten } from "../contracts";

const formatData = raw =>
  pipe(
    map(contract => contract.address),
    map(address => address.toLowerCase())
  )(raw);

export const getAddresses = provider => {
  const host = pathOr(null, ["host"], provider);
  if (contains("localhost", host)) return formatData(local);
  return formatData(ropsten);
};
