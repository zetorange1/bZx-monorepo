import { pathOr } from "ramda";
import BZxJS from "../../core";
import bZxJS from "../../core/__tests__/setup";
import * as FillTestUtils from "../../fill/__tests__/utils";

const { web3 } = bZxJS;

describe("loanHealth", () => {
  describe("getProfitOrLoss", () => {
    const { owner, lenders, traders } = FillTestUtils.getAccounts();
    const {
      loanTokens,
      interestTokens,
      collateralTokens
    } = FillTestUtils.initAllContractInstances();

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
      loanOrderHash = BZxJS.getLoanOrderHashHex(order);

      const signature = await bZxJS.signOrderHashAsync(
        loanOrderHash,
        order.makerAddress
      );
      const txOpts = {
        from: traders[0],
        gas: 1000000,
        gasPrice: web3.utils.toWei("5", "gwei").toString()
      };
      const loanTokenAmountFilled = web3.utils.toWei("12.3");
      // bZx hash that we give to tradePositionWith0x must belong to a loan that was previously filled, so we fill the loan order here
      const takeLoanOrderAsTraderReceipt = await bZxJS.takeLoanOrderAsTrader(
        { ...order, signature },
        collateralTokenFilled,
        loanTokenAmountFilled,
        txOpts
      );

      expect(
        pathOr(null, ["events", "DebugLine"], takeLoanOrderAsTraderReceipt)
      ).toEqual(null);
    });

    test("should retrieve profit or loss successfully", async () => {
      const data = await bZxJS.getProfitOrLoss({
        loanOrderHash,
        trader: traders[0]
      });

      expect(data).toMatchSnapshot();
    });
  });
});
