import { pathOr } from "ramda";
import B0xJS from "../../core";
import b0xJS from "../../core/__tests__/setup";
import { expectPromiEvent } from "../../core/__tests__/utils";
import * as FillTestUtils from "../../fill/__tests__/utils";

const { web3 } = b0xJS;

describe("loanHeath", () => {
  describe("withdrawProfit", () => {
    const { owner, lenders, traders } = FillTestUtils.getAccounts();
    const {
      loanTokens,
      interestTokens,
      collateralTokens
    } = FillTestUtils.initAllContractInstances();

    let promiEvent = null;
    let loanOrderHash = null;

    const collateralTokenFilled = collateralTokens[0].options.address.toLowerCase();

    let order = null;

    beforeAll(async () => {
      await FillTestUtils.setupAll({
        owner,
        lenders,
        traders,
        transferAmount: web3.utils.toWei("100", "ether")
      });

      order = FillTestUtils.makeOrderAsLender({
        web3,
        lenders,
        loanTokens,
        interestTokens
      });
      loanOrderHash = B0xJS.getLoanOrderHashHex(order);

      const signature = await b0xJS.signOrderHashAsync(
        loanOrderHash,
        order.makerAddress
      );
      const txOpts = {
        from: traders[0],
        gas: 1000000,
        gasPrice: web3.utils.toWei("5", "gwei").toString()
      };
      const loanTokenAmountFilled = web3.utils.toWei("12.3");
      // b0x hash that we give to tradePositionWith0x must belong to a loan that was previously filled, so we fill the loan order here
      const takeLoanOrderAsTraderReceipt = await b0xJS.takeLoanOrderAsTrader(
        { ...order, signature },
        collateralTokenFilled,
        loanTokenAmountFilled,
        txOpts
      );

      expect(
        pathOr(null, ["events", "DebugLine"], takeLoanOrderAsTraderReceipt)
      ).toEqual(null);

      promiEvent = b0xJS.withdrawProfit({
        loanOrderHash,
        txOpts
      });
    });

    test("should return promiEvent", () => {
      expectPromiEvent(promiEvent);
    });
  });
});
