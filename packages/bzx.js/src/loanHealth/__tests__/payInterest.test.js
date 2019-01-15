import { pathOr } from "ramda";
import { BigNumber } from "bignumber.js";
import { BZxJS } from "../../core";
import bZxJS from "../../core/__tests__/setup";
import { expectPromiEvent } from "../../core/__tests__/utils";
import * as FillTestUtils from "../../fill/__tests__/utils";

const { web3 } = bZxJS;

describe("loanHealth", () => {
  describe("payInterest", () => {
    const { owner, lenders, traders } = FillTestUtils.getAccounts();
    const {
      loanTokens,
      interestTokens,
      collateralTokens
    } = FillTestUtils.initAllContractInstances();

    let promiEvent = null;
    let loanOrderHash = null;
    let loanBefore = null;
    let balanceBefore = null;

    const collateralTokenFilled = collateralTokens[0].options.address.toLowerCase();

    let order = null;

    beforeAll(async () => {
      await FillTestUtils.setupAll({
        owner,
        lenders,
        traders,
        transferAmount: web3.utils.toWei("2000", "ether")
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

      const loansBefore = await bZxJS.getLoansForLender({
        address: lenders[0],
        start: 0,
        count: 10
      });

      [loanBefore] = loansBefore.filter(
        loan => loan.loanOrderHash === loanOrderHash
      );

      balanceBefore = await bZxJS.getBalance({
        tokenAddress: loanBefore.interestTokenAddress,
        ownerAddress: lenders[0]
      });

      promiEvent = bZxJS.payInterestForOrder({
        loanOrderHash,
        txOpts
      });
    });

    test("should return promiEvent", () => {
      expectPromiEvent(promiEvent);
    });

    test("should pay interest successfully", async () => {
      const receipt = await promiEvent;
      expect(pathOr(null, ["events", "DebugLine"], receipt)).toEqual(null);

      const loansAfter = await bZxJS.getLoansForLender({
        address: lenders[0],
        start: 0,
        count: 10
      });

      const [loanAfter] = loansAfter.filter(
        loan => loan.loanOrderHash === loanOrderHash
      );

      const balanceAfter = await bZxJS.getBalance({
        tokenAddress: loanAfter.interestTokenAddress,
        ownerAddress: lenders[0]
      });

      const balanceDiff = BigNumber(balanceAfter).minus(balanceBefore);
      const interestPaidDiff = BigNumber(loanAfter.interestPaidSoFar).minus(
        loanBefore.interestPaidSoFar
      );

      const feeAdjustment = 0.9; // 10% fee for each new interest withdrawal, will likely change in the future

      expect(balanceDiff).toEqual(
        interestPaidDiff.times(feeAdjustment).integerValue(BigNumber.ROUND_CEIL)
      );
    });
  });
});
