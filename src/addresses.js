import fetch from "node-fetch";

const API = "https://testnet.b0x.network/info/contracts.json";

export const getAddresses = async () => {
  const res = await fetch(API);
  const data = await res.json();
  return data;
};
