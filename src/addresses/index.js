import { map, pipe } from "ramda";
import contracts from "../contracts";

const formatData = raw =>
  pipe(
    map(contract => contract.address),
    map(address => address.toLowerCase())
  )(raw);

export const getAddresses = () => formatData(contracts);
