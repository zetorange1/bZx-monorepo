import { map } from "ramda";

const _ZRXToken = "0xa38a5c8f63b7df14e5078b95a1807abb8f41f166";
const _WETH = "0xc778417E063141139Fce010982780140Aa0cD5Ab";

const addressesRaw = {
  ZRXToken: _ZRXToken,
  WETH: _WETH
};
const addresses = map((address = "") => address.toLowerCase(), addressesRaw);
export const { ZRXToken, WETH } = addresses;
