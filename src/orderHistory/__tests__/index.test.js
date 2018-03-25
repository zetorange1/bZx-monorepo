/* globals test, describe, expect, beforeAll */
import b0xJS from "../../core/__tests__/setup";
import Accounts from "../../core/__tests__/accounts";

describe("order history", () => {
  beforeAll(async () => {});

  describe("getOrders", async () => {
    test("should return order history", async () => {
      const res = await b0xJS.getOrders({
        loanPartyAddress: Accounts[2].address,
        start: 0,
        count: 10
      });
      console.log(res);
      expect(res).toBe(null);
    });
  });
});
