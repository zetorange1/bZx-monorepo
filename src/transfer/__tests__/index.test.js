import { pathOr } from "ramda";
import b0xJS from "../../core/__tests__/setup";
import * as FillTestUtils from "../../fill/__tests__/utils";
import Accounts from "../../core/__tests__/accounts";
import * as TransferUtils from "./utils";

const { web3 } = b0xJS;

describe("filling orders", () => {
  const from = Accounts[0].address;
  const to = Accounts[1].address;
  let balances = [];

  beforeAll(async () => {
    const { b0xToken } = await FillTestUtils.initAllContractInstances();

    balances = await TransferUtils.getBalances({
      addresses: [from, to],
      tokenAddress: b0xToken.options.address.toLowerCase()
    });
  });

  describe("transferTokens", async () => {
    test("should return total amount of loanToken borrowed", async () => {
      const { b0xToken } = await FillTestUtils.initAllContractInstances();
      const amount = web3.utils.toWei("1").toString();

      const receipt = await b0xJS.transferToken({
        tokenAddress: b0xToken.options.address.toLowerCase(),
        to,
        amount,
        txOpts: { from }
      });

      const transferValue = pathOr(
        null,
        ["events", "Transfer", "returnValues", "value"],
        receipt
      );

      const finalBalances = await TransferUtils.getBalances({
        addresses: [from, to],
        tokenAddress: b0xToken.options.address.toLowerCase()
      });

      expect(transferValue).toBe(amount);
      expect(balances[1].plus(amount)).toEqual(finalBalances[1]);
    });
  });
});
