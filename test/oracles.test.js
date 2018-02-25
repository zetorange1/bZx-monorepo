/* globals test, describe */
import b0xJS from "./setup";

describe("oracles", () => {
  test("getOracleList", async () => {
    await b0xJS.getOracleList();
  });
});
