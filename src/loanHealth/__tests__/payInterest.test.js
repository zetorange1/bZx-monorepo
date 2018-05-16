import { pathOr } from "ramda";
import BigNumber from "bignumber.js";
import B0xJS from "../../core";
import b0xJS from "../../core/__tests__/setup";
import { expectPromiEvent } from "../../core/__tests__/utils";
import * as FillTestUtils from "../../fill/__tests__/utils";

const { web3 } = b0xJS;

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
        gasPrice: web3.utils.toWei("30", "gwei").toString()
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

      const loansBefore = await b0xJS.getLoansForLender({
        address: lenders[0],
        start: 0,
        count: 10
      });

      [loanBefore] = loansBefore.filter(
        loan => loan.loanOrderHash === loanOrderHash
      );

      balanceBefore = await b0xJS.getBalance({
        tokenAddress: loanBefore.interestTokenAddress,
        ownerAddress: lenders[0]
      });

      promiEvent = b0xJS.payInterest({
        loanOrderHash,
        trader: traders[0],
        txOpts
      });
    });

    test("should return promiEvent", () => {
      expectPromiEvent(promiEvent);
    });

    test("should pay interest successfully", async () => {
      const receipt = await promiEvent;
      expect(pathOr(null, ["events", "DebugLine"], receipt)).toEqual(null);

      const loansAfter = await b0xJS.getLoansForLender({
        address: lenders[0],
        start: 0,
        count: 10
      });

      const [loanAfter] = loansAfter.filter(
        loan => loan.loanOrderHash === loanOrderHash
      );

      const balanceAfter = await b0xJS.getBalance({
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
