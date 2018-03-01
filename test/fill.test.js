/* globals test, describe */
import B0xJS from "../src";
import b0xJS from "./setup";
import * as addresses from "./constants/addresses";
import order from "./constants/order";

describe("filling orders", () => {
  describe("takeLoanOrderAsLender", async () => {
    test("should return total amount of loanToken borrowed", async () => {
      const signerAddress = addresses.ACCOUNTS[0];

      const orderHashHex = B0xJS.getLoanOrderHashHex(order);
      const signature = await b0xJS.signOrderHashAsync(
        orderHashHex,
        signerAddress
      );
      const res = await b0xJS.takeLoanOrderAsLender(
        { ...order, signature },
        { from: signerAddress, gas: 100000 }
      );
      console.log(JSON.stringify(res));
    });
  });
});
