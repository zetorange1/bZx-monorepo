/* globals jest */
import Web3 from "web3";
import B0xJS from "../../core/index";

describe("addresses", () => {
  test("should return local testnet addresses for all other networkIds", async () => {
    const networkUrl = "http://localhost:8545";
    const networkId = 50;
    const provider = new Web3.providers.HttpProvider(networkUrl);
    const b0xJS = new B0xJS(provider, { networkId });

    expect(b0xJS.addresses).toMatchSnapshot();
  });
});
