import { pathOr } from "ramda";
import bZxJS from "../../core/__tests__/setup";
import * as FillTestUtils from "../../fill/__tests__/utils";
import Accounts from "../../core/__tests__/accounts";
import * as TransferTestUtils from "./utils";
import { expectPromiEvent } from "../../core/__tests__/utils";

const { web3 } = bZxJS;

describe("transfer", () => {
  const from = Accounts[0].address;
  const to = Accounts[1].address;
  let balances = [];

  beforeAll(async () => {
    const { bZxToken } = FillTestUtils.initAllContractInstances();

    balances = await TransferTestUtils.getBalances({
      addresses: [from, to],
      tokenAddress: bZxToken.options.address.toLowerCase()
    });
  });

  describe("transferTokens", async () => {
    test("should return total amount of loanToken borrowed and transfer funds correctly", async () => {
      const { bZxToken } = FillTestUtils.initAllContractInstances();
      const amount = web3.utils.toWei("1").toString();

      const receipt = await bZxJS.transferToken({
        tokenAddress: bZxToken.options.address.toLowerCase(),
        to,
        amount,
        txOpts: { from }
      });

      const transferValue = pathOr(
        null,
        ["events", "Transfer", "returnValues", "value"],
        receipt
      );

      const finalBalances = await TransferTestUtils.getBalances({
        addresses: [from, to],
        tokenAddress: bZxToken.options.address.toLowerCase()
      });

      expect(transferValue).toBe(amount);
      expect(balances[1].plus(amount)).toEqual(finalBalances[1]);
    });

    test("should return a web3 PromiEvent", async () => {
      const { bZxToken } = FillTestUtils.initAllContractInstances();
      const amount = web3.utils.toWei("1").toString();

      const promiEvent = bZxJS.transferToken({
        tokenAddress: bZxToken.options.address.toLowerCase(),
        to,
        amount,
        txOpts: { from }
      });

      expectPromiEvent(promiEvent);
    });
  });
});
