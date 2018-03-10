/* globals test, describe, expect, beforeAll, afterAll */
import { pathOr } from "ramda";
import { BigNumber } from "bignumber.js";
import B0xJS from "../src";
import b0xJS from "./setup";
import * as Addresses from "./constants/addresses";
import makeOrder from "./utils/order";
import * as orderConstants from "../src/constants/order";

describe("filling orders", () => {
  const accounts = [Addresses.ACCOUNTS[0], Addresses.ACCOUNTS[1]];
  beforeAll(async () => {
    const promises = accounts.map(account =>
      b0xJS.setAllowanceUnlimited({
        tokenAddress: Addresses.ZRXToken,
        ownerAddress: account
      })
    );
    await Promise.all(promises);

    test("should have greater than 0 balance", async () => {
      const balance = await b0xJS.getBalance({
        tokenAddress: Addresses.ZRXToken,
        ownerAddress: Addresses.ACCOUNTS[0]
      });
      expect(balance.gt(new BigNumber(0))).toBe(true);
    });
  });

  afterAll(async () => {
    const promises = accounts.map(account =>
      b0xJS.resetAllowance({
        tokenAddress: Addresses.ZRXToken,
        ownerAddress: account
      })
    );
    await Promise.all(promises);
  });

  describe("takeLoanOrderAsLender", async () => {
    test("should return total amount of loanToken borrowed", async () => {
      const makerAddress = Addresses.ACCOUNTS[1];
      const takerAddress = Addresses.ACCOUNTS[0];
      const txOpts = { from: takerAddress, gas: 1000000 };

      const order = makeOrder({
        makerRole: orderConstants.MAKER_ROLE.LENDER,
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

      console.log(JSON.stringify(receipt));

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
    test.skip("should return total amount of loanToken borrowed", async () => {
      const order = makeOrder({
        makerAddress: Addresses.ACCOUNTS[0],
        salt: B0xJS.generatePseudoRandomSalt()
      });

      const orderHashHex = B0xJS.getLoanOrderHashHex(order);
      const signature = await b0xJS.signOrderHashAsync(
        orderHashHex
        // signerAddress
      );

      const collateralTokenAddress = Addresses.EtherToken;
      const loanTokenAmountFilled = "20";

      const receipt = await b0xJS.takeLoanOrderAsTrader(
        { ...order, signature },
        collateralTokenAddress,
        loanTokenAmountFilled
        // txOpts
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
      expect(loanTokenAmountFilledReturn).toBe("0");
    });
  });
});
