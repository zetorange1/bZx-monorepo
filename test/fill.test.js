/* globals test, describe, expect */
import { pathOr } from "ramda";
import B0xJS from "../src";
import b0xJS from "./setup";
import * as addresses from "./constants/addresses";
import makeOrder from "./utils/order";

describe("filling orders", () => {
  describe("takeLoanOrderAsLender", async () => {
    test("should return total amount of loanToken borrowed", async () => {
      const order = makeOrder();
      const signerAddress = order.makerAddress;

      const orderHashHex = B0xJS.getLoanOrderHashHex(order);
      const signature = await b0xJS.signOrderHashAsync(
        orderHashHex,
        signerAddress
      );
      const receipt = await b0xJS.takeLoanOrderAsLender(
        { ...order, signature },
        { from: addresses.ACCOUNTS[1], gas: 1000000 }
      );

      const loanTokenAmountFilled = pathOr(
        null,
        [
          "events",
          "LoanOrderTakenAmounts",
          "returnValues",
          "loanTokenAmountFilled"
        ],
        receipt
      );
      expect(loanTokenAmountFilled).toBe("0");
    });
  });
});
