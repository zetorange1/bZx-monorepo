import Web3 from "web3";
import { BZxJS } from "../../core";

describe("config", () => {
  test("should use default config when config arg not provided", () => {
    const networkUrl = "http://localhost:8545";
    const provider = new Web3.providers.HttpProvider(networkUrl);
    const bZxJS = new BZxJS(provider, { networkId: 50 });

    expect(bZxJS.addresses).toMatchSnapshot();
  });

  test("should use provided config", () => {
    const networkUrl = "http://localhost:8545";
    const provider = new Web3.providers.HttpProvider(networkUrl);
    const config = {
      networkId: 50,
      addresses: {
        BZx: "thisisatest",
        BZxOracle: "thisisatest",
        BZxTo0x: "thisisatest",
        BZxToken: "thisisatest",
        BZxVault: "thisisatest",
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

    const bZxJS = new BZxJS(provider, config);

    expect(bZxJS.addresses).toMatchSnapshot();
  });
});
