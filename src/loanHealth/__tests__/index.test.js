import { pathOr } from "ramda";
import B0xJS from "../../core";
import b0xJS from "../../core/__tests__/setup";
import { expectPromiEvent } from "../../core/__tests__/utils";
import * as FillTestUtils from "../../fill/__tests__/utils";

const { web3 } = b0xJS;

describe("loanHealth", () => {
  describe("changeCollateral", () => {
    let promiEvent = null;
    beforeAll(async () => {
      const { owner, lenders, traders } = FillTestUtils.getAccounts();
      await FillTestUtils.setupAll({
        owner,
        lenders,
        traders,
        transferAmount: web3.utils.toWei("10000", "ether")
      });
      const {
        loanTokens,
        interestTokens,
        collateralTokens
      } = FillTestUtils.initAllContractInstances();

      const order = FillTestUtils.makeOrderAsLender({
        web3,
        lenders,
        loanTokens,
        interestTokens
      });
      const loanOrderHash = B0xJS.getLoanOrderHashHex(order);

      const signature = await b0xJS.signOrderHashAsync(
        loanOrderHash,
        order.makerAddress
      );
      const txOpts = {
        from: traders[0],
        gas: 1000000,
        gasPrice: web3.utils.toWei("30", "gwei").toString()
      };
      const loanTokenAmountFilled = web3.utils.toWei("12.3");
      // b0x hash that we give to tradePositionWith0x must belong to a loan that was previously filled, so we fill the loan order here
      const takeLoanOrderAsTraderReceipt = await b0xJS.takeLoanOrderAsTrader(
        { ...order, signature },
        collateralTokens[0].options.address.toLowerCase(),
        loanTokenAmountFilled,
        txOpts
      );

      expect(
        pathOr(null, ["events", "DebugLine"], takeLoanOrderAsTraderReceipt)
      ).toBe(null);

      promiEvent = b0xJS.changeCollateral({
        loanOrderHash,
        collateralTokenFilled: collateralTokens[1].options.address.toLowerCase()
      });
    });
    test("should return promiEvent", () => {
      expectPromiEvent(promiEvent);
    });
  });
});
