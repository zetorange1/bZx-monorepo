import { map, pipe } from "ramda";
import { getContracts } from "../contracts";

const formatData = raw =>
  pipe(
    map(contract => contract.address),
    map(address => address.toLowerCase())
  )(raw);

export const getAddresses = networkId =>
  pipe(
    getContracts,
    formatData
  )(networkId);
