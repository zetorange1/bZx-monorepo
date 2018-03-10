/* globals test, describe, expect, beforeAll */
import { pathOr } from "ramda";
// import { BigNumber } from "bignumber.js";
import { constants as constantsZX } from "0x.js/lib/src/utils/constants";
import B0xJS from "../src";
import b0xJS from "./setup";
import * as Addresses from "./constants/addresses";
import makeOrder from "./utils/order";
import * as orderConstants from "../src/constants/order";

describe("filling orders", () => {
  beforeAll(async () => {});

  describe("takeLoanOrderAsLender", async () => {
    test.skip("should return total amount of loanToken borrowed", async () => {
      const makerAddress = Addresses.ACCOUNTS[1];
      const takerAddress = Addresses.ACCOUNTS[0];
      const txOpts = { from: takerAddress, gas: 1000000 };

      const order = makeOrder({
        makerRole: orderConstants.MAKER_ROLE.TRADER,
        makerAddress,
        salt: B0xJS.generatePseudoRandomSalt()
      });

      const orderHashHex = B0xJS.getLoanOrderHashHex(order);
      const signature = await b0xJS.signOrderHashAsync(
        orderHashHex,
        makerAddress
      );
      const receipt = await b0xJS.takeLoanOrderAsLender(
        { ...order, signature },
        txOpts
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

  describe("takeLoanOrderAsTrader", async () => {
    test("should return total amount of loanToken borrowed", async () => {
      const makerAddress = Addresses.ACCOUNTS[0];
      const takerAddress = Addresses.ACCOUNTS[1];
      const txOpts = { from: takerAddress, gas: 1000000 };
      const collateralTokenAddress = constantsZX.NULL_ADDRESS; // Addresses.ZRXToken;
      const order = makeOrder({
        makerRole: orderConstants.MAKER_ROLE.LENDER,
        makerAddress,
        salt: B0xJS.generatePseudoRandomSalt(),
        collateralTokenAddress
      });

      const orderHashHex = B0xJS.getLoanOrderHashHex(order);
      const signature = await b0xJS.signOrderHashAsync(
        orderHashHex,
        makerAddress
      );

      const loanTokenAmountFilled = "20";

      const receipt = await b0xJS.takeLoanOrderAsTrader(
        { ...order, signature },
        collateralTokenAddress,
        loanTokenAmountFilled,
        txOpts
      );

      const loanTokenAmountFilledReturn = pathOr(
        null,
        [
          "events",
          "LoanOrderTakenAmounts",
          "returnValues",
          "loanTokenAmountFilled"
        ],
        receipt
      );
      console.log(JSON.stringify(receipt, null, 2));

      expect(loanTokenAmountFilledReturn).toBe("0");
    });
  });
});
