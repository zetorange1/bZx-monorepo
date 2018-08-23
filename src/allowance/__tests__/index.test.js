import { BigNumber } from "@0xproject/utils";
import { pathOr } from "ramda";
import { local as Contracts } from "../../contracts";
import * as constants from "../../core/constants";
import bZxJS from "../../core/__tests__/setup";
import Accounts from "../../core/__tests__/accounts";
import { expectPromiEvent } from "../../core/__tests__/utils";

describe("allowance", () => {
  const tokenAddress = Contracts.TestToken0.address;
  const ownerAddress = Accounts[0].address;

  const resetAllowance = async () => {
    await bZxJS.setAllowance({
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
      const receipt = await bZxJS.setAllowance({
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

    test("should return a web3 PromiEvent", async () => {
      const promiEvent = bZxJS.setAllowance({
        tokenAddress,
        ownerAddress,
        amountInBaseUnits: ALLOWANCE_AMOUNT
      });
      expectPromiEvent(promiEvent);
    });

    test("should set spender's allowance", async () => {
      const expectedAllowance = ALLOWANCE_AMOUNT;

      await bZxJS.setAllowance({
        tokenAddress,
        ownerAddress,

        amountInBaseUnits: ALLOWANCE_AMOUNT
      });

      const allowance = await bZxJS.getAllowance({
        tokenAddress,
        ownerAddress
      });

      expect(allowance).toEqual(expectedAllowance);
    });
  });

  describe("setAllowanceUnlimited", () => {
    test("should set spender's allowance to maximum value of uint", async () => {
      const expectedAllowance = constants.UNLIMITED_ALLOWANCE_IN_BASE_UNITS;

      await bZxJS.setAllowanceUnlimited({
        tokenAddress,
        ownerAddress
      });

      const allowance = await bZxJS.getAllowance({
        tokenAddress,
        ownerAddress
      });

      expect(allowance).toEqual(expectedAllowance);
    });

    test("should return a web3 PromiEvent", async () => {
      const promiEvent = bZxJS.setAllowanceUnlimited({
        tokenAddress,
        ownerAddress
      });
      expectPromiEvent(promiEvent);
    });
  });

  describe("getAllowance", () => {
    test("should return allowance", async () => {
      const res = await bZxJS.getAllowance({
        tokenAddress,
        ownerAddress
      });

      expect(res).toEqual(new BigNumber(0));
    });
  });

  describe("resetAllowance", () => {
    test("should reset allowance", async () => {
      await bZxJS.setAllowanceUnlimited({
        tokenAddress,
        ownerAddress
      });

      await bZxJS.resetAllowance({
        tokenAddress,
        ownerAddress
      });

      const res = await bZxJS.getAllowance({
        tokenAddress,
        ownerAddress
      });

      expect(res).toEqual(new BigNumber(0));
    });

    test("should return a web3 PromiEvent", async () => {
      const promiEvent = bZxJS.resetAllowance({
        tokenAddress,
        ownerAddress
      });

      expectPromiEvent(promiEvent);
    });
  });
});
