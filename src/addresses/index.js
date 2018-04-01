import { map, pipe, contains } from "ramda";
import { local, ropsten } from "../contracts";

const formatData = raw =>
  pipe(
    map(contract => contract.address),
    map(address => address.toLowerCase())
  )(raw);

export const getAddresses = providerHostUrl => {
  if (contains("localhost", providerHostUrl)) return formatData(local);
  return formatData(ropsten);
};
