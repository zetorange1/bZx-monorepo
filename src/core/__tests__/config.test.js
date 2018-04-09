import Web3 from "web3";
import B0xJS from "../../core";

describe("config", () => {
  test("should use default config when config arg not provided", () => {
    const networkUrl = "http://localhost:8545";
    const provider = new Web3.providers.HttpProvider(networkUrl);
    const b0xJS = new B0xJS(provider, { networkId: 50 });

    expect(b0xJS.addresses).toMatchSnapshot();
  });

  test("should use provided config", () => {
    const networkUrl = "http://localhost:8545";
    const provider = new Web3.providers.HttpProvider(networkUrl);
    const config = {
      networkId: 50,
      addresses: {
        B0x: "thisisatest",
        B0xOracle: "thisisatest",
        B0xTo0x: "thisisatest",
        B0xToken: "thisisatest",
        B0xVault: "thisisatest",
        EIP20: "thisisatest",
        OracleRegistry: "thisisatest",
        OracleInterface: "thisisatest",
        TestToken0: "thisisatest",
        TestToken1: "thisisatest",
        TestToken2: "thisisatest",
        TestToken3: "thisisatest",
        TestToken4: "thisisatest",
        TestToken5: "thisisatest",
        TestToken6: "thisisatest",
        TestToken7: "thisisatest",
        TestToken8: "thisisatest",
        TestToken9: "thisisatest",
        TokenRegistry: "thisisatest"
      }
    };

    const b0xJS = new B0xJS(provider, config);

    expect(b0xJS.addresses).toMatchSnapshot();
  });
});
