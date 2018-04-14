import { expectPromiEvent } from "../../core/__tests__/utils";
import b0xJS from "../../core/__tests__/setup";

describe("trade", () => {
  describe("tradePositionWith0x", () => {
    test.skip("should return a web3 PromiEvent", async () => {
      // HOW TO TEST??
      const promiEvent = b0xJS.tradePositionWith0x();
      expectPromiEvent(promiEvent);
    });
  });
});
