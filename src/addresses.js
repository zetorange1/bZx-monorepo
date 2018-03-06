import fetch from "node-fetch";
import { map, pipe } from "ramda";

const API = "https://testnet.b0x.network/info/contracts.json";

const formatData = raw =>
  pipe(
    map(contract => contract.address),
    map(address => address.toLowerCase())
  )(raw);

export const getAddresses = async () => {
  const res = await fetch(API);
  const data = await res.json();
  return formatData(data);
};
