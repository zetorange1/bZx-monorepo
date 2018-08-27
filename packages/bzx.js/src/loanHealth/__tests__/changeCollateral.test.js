import { pathOr } from "ramda";
import { BZxJS } from "../../core";
import bZxJS from "../../core/__tests__/setup";
import { expectPromiEvent } from "../../core/__tests__/utils";
import * as FillTestUtils from "../../fill/__tests__/utils";

const { web3 } = bZxJS;

describe("loanHealth", () => {
  describe("changeCollateral", () => {
    const { owner, lenders, traders } = FillTestUtils.getAccounts();
    const {
      loanTokens,
      interestTokens,
      collateralTokens
    } = FillTestUtils.initAllContractInstances();

    let promiEvent = null;
    let loanOrderHash = null;
    let loansBefore = null;

    const collateralTokenAddressBefore = collateralTokens[0].options.address.toLowerCase();
    const collateralTokenAddressAfter = collateralTokens[1].options.address.toLowerCase();

    beforeAll(async () => {
      await FillTestUtils.setupAll({
        owner,
        lenders,
        traders,
        transferAmount: web3.utils.toWei("2000", "ether")
      });

      const order = FillTestUtils.makeOrderAsLender({
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
        collateralTokenAddressBefore,
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

      promiEvent = bZxJS.changeCollateral({
        loanOrderHash,
        collateralTokenFilled: collateralTokenAddressAfter,
        txOpts
      });
    });

    test("should return promiEvent", () => {
      expectPromiEvent(promiEvent);
    });

    test("should change collateral successfully", async () => {
      const receipt = await promiEvent;
      expect(pathOr(null, ["events", "DebugLine"], receipt)).toEqual(null);

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

      expect(loanBefore.collateralTokenAddressFilled).toEqual(
        collateralTokenAddressBefore
      );
      expect(loanAfter.collateralTokenAddressFilled).toEqual(
        collateralTokenAddressAfter
      );
    });
  });
});
