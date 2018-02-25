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
});
