/* globals test, expect, describe, beforeEach, afterEach */
import { constants } from "0x.js/lib/src/utils/constants";
import { BigNumber } from "@0xproject/utils";
import { pathOr } from "ramda";
import Contracts from "../../contracts";
import b0xJS from "../../../test/setup";
import Accounts from "../../../test/constants/accounts";

describe("allowance", () => {
  const tokenAddress = Contracts.TestToken0.address;
  const ownerAddress = Accounts[0].address;

  const resetAllowance = async () => {
    await b0xJS.setAllowance({
      tokenAddress,
      ownerAddress,
      amountInBaseUnits: new BigNumber(0)
    });
  };

  beforeEach(resetAllowance);
  afterEach(resetAllowance);

  describe("setAllowance", () => {
    const ALLOWANCE_AMOUNT = new BigNumber(436);

    test("should return receipt with Approval event", async () => {
      const receipt = await b0xJS.setAllowance({
        tokenAddress,
        ownerAddress,

        amountInBaseUnits: ALLOWANCE_AMOUNT
      });

      const value = pathOr(
        null,
        ["events", "Approval", "returnValues", "value"],
        receipt
      );

      expect(new BigNumber(value)).toEqual(ALLOWANCE_AMOUNT);
    });

    test("should set spender's allowance", async () => {
      const expectedAllowance = ALLOWANCE_AMOUNT;

      await b0xJS.setAllowance({
        tokenAddress,
        ownerAddress,

        amountInBaseUnits: ALLOWANCE_AMOUNT
      });

      const allowance = await b0xJS.getAllowance({
        tokenAddress,
        ownerAddress
      });

      expect(allowance).toEqual(expectedAllowance);
    });
  });

  describe("setAllowanceUnlimited", () => {
    test("should set spender's allowance to maximum value of uint", async () => {
      const expectedAllowance = constants.UNLIMITED_ALLOWANCE_IN_BASE_UNITS;

      await b0xJS.setAllowanceUnlimited({
        tokenAddress,
        ownerAddress
      });

      const allowance = await b0xJS.getAllowance({
        tokenAddress,
        ownerAddress
      });

      expect(allowance).toEqual(expectedAllowance);
    });
  });

  describe("getAllowance", () => {
    test("should return allowance", async () => {
      const res = await b0xJS.getAllowance({
        tokenAddress,
        ownerAddress
      });

      expect(res).toEqual(new BigNumber(0));
    });
  });

  describe("resetAllowance", () => {
    test("should reset allowance", async () => {
      await b0xJS.setAllowanceUnlimited({
        tokenAddress,
        ownerAddress
      });

      await b0xJS.resetAllowance({
        tokenAddress,
        ownerAddress
      });

      const res = await b0xJS.getAllowance({
        tokenAddress,
        ownerAddress
      });

      expect(res).toEqual(new BigNumber(0));
    });
  });
});
