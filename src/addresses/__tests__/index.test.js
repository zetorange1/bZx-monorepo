import Web3 from "web3";
import B0xJS from "../../core/index";
import * as Errors from "../../core/constants/errors";

describe("addresses", () => {
  test("should return kovan testnet addresses for networkId 42", async () => {
    const networkUrl = "https://kovan.infura.io";
    const networkId = 42;
    const provider = new Web3.providers.HttpProvider(networkUrl);
    const b0xJS = new B0xJS(provider, { networkId });

    expect(b0xJS.addresses).toMatchSnapshot();
  });

  test("should return rinkeby testnet addresses for networkId 4", async () => {
    const networkUrl = "http://localhost:8545";
    const networkId = 4;
    const provider = new Web3.providers.HttpProvider(networkUrl);
    const b0xJS = new B0xJS(provider, { networkId });

    expect(b0xJS.addresses).toMatchSnapshot();
  });

  test("should return local testnet addresses for all other networkIds", async () => {
    const networkUrl = "http://localhost:8545";
    const networkId = 50;
    const provider = new Web3.providers.HttpProvider(networkUrl);
    const b0xJS = new B0xJS(provider, { networkId });

    expect(b0xJS.addresses).toMatchSnapshot();
  });

  test("should throw error for no networkId", async () => {
    expect(() => {
      const networkUrl = "http://localhost:8545";
      const provider = new Web3.providers.HttpProvider(networkUrl);
      // eslint-disable-next-line no-unused-vars
      const b0xJS = new B0xJS(provider, { networkId: null });
    }).toThrow(Errors.NoNetworkId);
  });
});
