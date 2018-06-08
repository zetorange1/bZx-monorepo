import { pathOr } from "ramda";
import b0xJS from "../../core/__tests__/setup";
import { expectPromiEvent } from "../../core/__tests__/utils";

const { web3 } = b0xJS;

describe("loanHeath", () => {
  describe("withdrawProfit", () => {
    let promiEvent = null;
    // Seed data values with profit
    const loanOrderHash =
      "0x675aa699238281d7bc01b954e6f4ccc960162c612b77145efb1498c76728ce3b";
    const trader = "0xe834ec434daba538cd1b9fe1582052b880bd7e63";

    beforeAll(async () => {
      const txOpts = {
        from: trader,
        gas: 1000000,
        gasPrice: web3.utils.toWei("5", "gwei").toString()
      };

      promiEvent = b0xJS.withdrawProfit({
        loanOrderHash,
        txOpts
      });
    });

    test("should return promiEvent", () => {
      expectPromiEvent(promiEvent);
    });

    test("should withdraw profit successfully", async () => {
      const receipt = await promiEvent;
      const event = pathOr(null, ["events", "LogWithdrawProfit"], receipt);
      expect(event).not.toEqual(null);
    });
  });
});
