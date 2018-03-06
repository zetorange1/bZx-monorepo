import fetch from "node-fetch";
import { map } from "ramda";

const API = "https://testnet.b0x.network/info/contracts.json";

const formatData = raw => map(contract => contract.address)(raw);

export const getAddresses = async () => {
  const res = await fetch(API);
  const data = await res.json();
  return formatData(data);
};
