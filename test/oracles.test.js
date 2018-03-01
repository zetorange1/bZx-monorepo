/* globals test, describe, expect */
import { constants } from "0x.js/lib/src/utils/constants";
import b0xJS from "./setup";
import * as oracles from "../src/oracles";
import * as addresses from "./constants/addresses";

describe("oracles", () => {
  const testOracleNames = ["b0xOracle", "coolOracle", "anotherOracle"];
  const testOracleAddresses = [
    addresses.B0xOracle,
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
      { name: "b0xOracle", address: addresses.B0xOracle },
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
      const expected = [{ name: "b0xOracle", address: addresses.B0xOracle }];
      const oracleList = await b0xJS.getOracleList();
      expect(oracleList).toEqual(expected);
    });
  });

  describe("isTradeSupported", async () => {
    test("should return true for pair of supported tokens", async () => {
      const supportedPair = [addresses.ZRXToken, addresses.EtherToken];
      const oracleAddress = addresses.B0xOracle;

      const queriesP = Promise.all([
        b0xJS.isTradeSupported({
          sourceTokenAddress: supportedPair[0],
          destTokenAddress: supportedPair[1],
          oracleAddress
        }),
        b0xJS.isTradeSupported({
          sourceTokenAddress: supportedPair[1],
          destTokenAddress: supportedPair[0],
          oracleAddress
        })
      ]);

      const [isSupportedForward, isSupportedReverse] = await queriesP;
      const isSupported = isSupportedForward && isSupportedReverse;
      expect(isSupported).toBe(true);
    });
    test("should return false for pair of unsupported tokens", async () => {
      const unsupportedPair = [
        addresses.TEST_TOKENS[0],
        addresses.TEST_TOKENS[1]
      ];
      const oracleAddress = addresses.B0xOracle;
      const isSupported = await b0xJS.isTradeSupported({
        sourceTokenAddress: unsupportedPair[0],
        destTokenAddress: unsupportedPair[1],
        oracleAddress
      });
      expect(isSupported).toBe(false);
    });
  });
});
