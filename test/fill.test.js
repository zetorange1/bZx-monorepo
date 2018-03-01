/* globals test, describe */
import b0xJS from "./setup";

describe("filling orders", () => {
  describe("takeLoanOrderAsLender", async () => {
    test("should return total amount of loanToken borrowed", async () => {
      await b0xJS.takeLoanOrderAsLender();
    });
  });
});
