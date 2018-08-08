import { constants } from "0x.js/lib/src/utils/constants";
import bZxJS from "../../core/__tests__/setup";
import * as oracles from "../index";
import * as Addresses from "../../core/__tests__/addresses";
import { local as Contracts } from "../../contracts";

describe("oracles", () => {
  const testOracleNames = ["bZxOracle", "coolOracle", "anotherOracle"];
  const testOracleAddresses = [
    Contracts.BZxOracle.address,
    constants.NULL_ADDRESS,
    constants.NULL_ADDRESS
  ];

  test("cleanOracleNames", () => {
    const oracleNames = oracles.cleanOracleNames({
      oracleNameLengths: testOracleNames.map(name => name.length),
      oracleNamesAllConcat: testOracleNames.join("")
    });

    expect(oracleNames).toEqual(testOracleNames);
  });

  test("formatOracleList", () => {
    const expected = [
      { name: "bZxOracle", address: Contracts.BZxOracle.address },
      { name: "coolOracle", address: constants.NULL_ADDRESS },
      { name: "anotherOracle", address: constants.NULL_ADDRESS }
    ];

    const oracleList = oracles.formatOracleList({
      oracleAddresses: testOracleAddresses,
      oracleNames: testOracleNames
    });

    expect(oracleList).toEqual(expected);
  });

  describe("getOracleList", async () => {
    test("should return formatted list of oracles", async () => {
      const expected = [
        { name: "bZxOracle", address: Contracts.BZxOracle.address }
      ];
      const oracleList = await bZxJS.getOracleList();
      expect(oracleList).toEqual(expected);
    });
  });

  describe("isTradeSupported", async () => {
    test("should return true for pair of supported tokens", async () => {
      const oracleAddress = Contracts.BZxOracle.address;
      const isSupported = await bZxJS.isTradeSupported({
        sourceTokenAddress: Addresses.ZRXToken,
        destTokenAddress: Addresses.WETH,
        oracleAddress
      });
      expect(isSupported).toBe(true);
    });
  });
});
