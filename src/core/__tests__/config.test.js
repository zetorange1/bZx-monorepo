/* globals test, expect, describe */
import Web3 from "web3";
import B0xJS from "../../core";

describe("config", () => {
  test("should use default config when config arg not provided", () => {
    const networkUrl = "http://localhost:8545";
    const provider = new Web3.providers.HttpProvider(networkUrl);
    const b0xJS = new B0xJS(provider);

    expect(b0xJS.addresses).toMatchSnapshot();
  });

  test("should use provided config", () => {});
});
