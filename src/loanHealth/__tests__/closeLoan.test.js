import { pathOr } from "ramda";
import BZxJS from "../../core";
import bZxJS from "../../core/__tests__/setup";
import { expectPromiEvent } from "../../core/__tests__/utils";
import * as FillTestUtils from "../../fill/__tests__/utils";

const { web3 } = bZxJS;

describe("loanHealth", () => {
  describe("closeLoan", () => {
    const { owner, lenders, traders } = FillTestUtils.getAccounts();
    const {
      loanTokens,
      interestTokens,
      collateralTokens
    } = FillTestUtils.initAllContractInstances();

    let promiEvent = null;
    let loanOrderHash = null;
    let loansBefore = null;

    const collateralTokenFilled = collateralTokens[0].options.address.toLowerCase();

    let order = null;

    beforeAll(async () => {
      await FillTestUtils.setupAll({
        owner,
        lenders,
        traders,
        // tranferAmount must be a sufficiently large amount (probably to pay the fees on loan close)
        transferAmount: web3.utils.toWei("4000", "ether")
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

      const takeLoanOrderAsTraderReceipt = await bZxJS.takeLoanOrderAsTrader(
        { ...order, signature },
        collateralTokenFilled,
        loanTokenAmountFilled,
        txOpts
      );

      expect(
        pathOr(null, ["events", "DebugLine"], takeLoanOrderAsTraderReceipt)
      ).toEqual(null);

      loansBefore = await bZxJS.getLoansForTrader({
        address: traders[0],
        start: 0,
        count: 10
      });

      promiEvent = bZxJS.closeLoan({
        loanOrderHash,
        txOpts
      });
    });

    test("should return promiEvent", () => {
      expectPromiEvent(promiEvent);
    });

    test("should close loan successfully", async () => {
      const receipt = await promiEvent;
      expect(pathOr(null, ["events", "DebugLine"], receipt)).toEqual(null);
      expect(pathOr(null, ["events", "LogPayInterest"], receipt)).not.toEqual(
        null
      );
      expect(pathOr(null, ["events", "LogLoanClosed"], receipt)).not.toEqual(
        null
      );

      const loansAfter = await bZxJS.getLoansForTrader({
        address: traders[0],
        start: 0,
        count: 10
      });

      const [loanBefore] = loansBefore.filter(
        loan => loan.loanOrderHash === loanOrderHash
      );
      const [loanAfter] = loansAfter.filter(
        loan => loan.loanOrderHash === loanOrderHash
      );

      expect(loanBefore.active).toEqual(1);
      expect(loanAfter.active).toEqual(0);
    });
  });
});
