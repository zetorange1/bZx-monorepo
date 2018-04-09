import { constants } from "0x.js/lib/src/utils/constants";
import B0xJS from "../../core";
import b0xJS from "../../core/__tests__/setup";
import * as tokens from "../index";
import * as Addresses from "../../core/__tests__/addresses";
import { local as Contracts } from "../../contracts";

describe("tokens", () => {
  const testTokenNames = ["b0xToken", "coolToken", "anotherToken"];
  const testTokenAddresses = [
    Contracts.B0xToken.address,
    constants.NULL_ADDRESS,
    constants.NULL_ADDRESS
  ];

  describe("getTokenList", async () => {
    test("should return formatted list of tokens including b0xToken", async () => {
      const expected = {
        address: Contracts.B0xToken.address.toLowerCase(), name: "b0x Protocol Token", symbol: "B0X", decimals: "18", url: "data:image/jpeg;base64,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"
      };
      const tokenList = await b0xJS.getTokenList();
      expect(tokenList[0]).toEqual(expected);
    });
  });
});
