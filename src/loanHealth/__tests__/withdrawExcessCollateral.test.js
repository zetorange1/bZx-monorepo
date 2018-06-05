import { pathOr } from "ramda";
import BigNumber from "bignumber.js";
import B0xJS from "../../core";
import b0xJS from "../../core/__tests__/setup";
import { expectPromiEvent } from "../../core/__tests__/utils";
import * as FillTestUtils from "../../fill/__tests__/utils";

const { web3 } = b0xJS;

describe("loanHeath", () => {
  describe("withdrawExcessCollateral", () => {
    const { owner, lenders, traders } = FillTestUtils.getAccounts();
    const {
      loanTokens,
      interestTokens,
      collateralTokens
    } = FillTestUtils.initAllContractInstances();

    let promiEvent = null;
    let loanOrderHash = null;
    let loansBefore = null;
    let loansAfterDeposit = null;

    const collateralTokenFilled = collateralTokens[0].options.address.toLowerCase();
    const depositAmount = web3.utils.toWei("5").toString();
    const withdrawAmount = web3.utils.toWei("2").toString();

    let loanBefore, loanAfterDeposit, loanAfterWithdraw;

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

      loanBefore = await b0xJS.getSingleLoan({
        loanOrderHash: loanOrderHash,
        trader: traders[0]
      });

      await b0xJS.depositCollateral({
        loanOrderHash,
        collateralTokenFilled,
        depositAmount,
        txOpts
      });

      loanAfterDeposit = await b0xJS.getSingleLoan({
        loanOrderHash: loanOrderHash,
        trader: traders[0]
      });
    
      promiEvent = b0xJS.withdrawExcessCollateral({
        loanOrderHash,
        collateralTokenFilled,
        withdrawAmount,
        txOpts
      });
    });

    test("should return promiEvent", () => {
      expectPromiEvent(promiEvent);
    });

    test("should withdraw collateral successfully", async () => {
      const receipt = await promiEvent;
      expect(pathOr(null, ["events", "DebugLine"], receipt)).toEqual(null);

      loanAfterWithdraw = await b0xJS.getSingleLoan({
        loanOrderHash: loanOrderHash,
        trader: traders[0]
      });

      const initialMarginAmountFrac = Number(order.initialMarginAmount) * 0.01;

      const collateralTokenAmountFilledBefore = new BigNumber(
        loanBefore.collateralTokenAmountFilled
      );

      expect(collateralTokenAmountFilledBefore).toEqual(
        new BigNumber(loanBefore.loanTokenAmountFilled).times(
          initialMarginAmountFrac
        )
      );

      const collateralTokenAmountFilledAfterDeposit = new BigNumber(
        loanAfterDeposit.collateralTokenAmountFilled
      );

      expect(collateralTokenAmountFilledAfterDeposit).toEqual(
        collateralTokenAmountFilledBefore.plus(depositAmount)
      );

      const collateralTokenAmountFilledAfterWithdraw = new BigNumber(
        loanAfterWithdraw.collateralTokenAmountFilled
      );

      expect(collateralTokenAmountFilledAfterWithdraw).toEqual(
        collateralTokenAmountFilledAfterDeposit.minus(withdrawAmount)
      );
    });
  });
});
