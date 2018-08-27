import { pathOr } from "ramda";
import { BZxJS } from "../../core";
import bZxJS from "../../core/__tests__/setup";
import * as FillTestUtils from "./utils";
import { expectPromiEvent } from "../../core/__tests__/utils";

const { web3 } = bZxJS;
// Valid sig length, but last digit has been changed
const BAD_SIG =
  "0x056184af8d9bbf1734ddbff840e8be410193a99acab9add00512808250cb40f6423e669f24e65a8ee8af97e1a2abd90644177b39985438ecfee0dd2e7e44f77709";

describe("filling orders", () => {
  const { owner, lenders, traders } = FillTestUtils.getAccounts();

  const {
    loanTokens,
    collateralTokens,
    interestTokens
  } = FillTestUtils.initAllContractInstances();

  let promiEvent = null;
  const loanTokenAmountFilled = web3.utils.toWei("12.3");

  const order = FillTestUtils.makeOrderAsLender({
    web3,
    lenders,
    loanTokens,
    interestTokens
  });

  beforeAll(async () => {
    const transferAmount = web3.utils.toWei("500", "ether");
    await FillTestUtils.setupAll({ owner, lenders, traders, transferAmount });

    const takerAddress = traders[0];
    const txOpts = {
      from: takerAddress,
      gas: 1000000,
      gasPrice: web3.utils.toWei("5", "gwei").toString()
    };

    const orderHashHex = BZxJS.getLoanOrderHashHex(order);
    const signature = await bZxJS.signOrderHashAsync(
      orderHashHex,
      order.makerAddress
    );

    promiEvent = bZxJS.takeLoanOrderAsTrader(
      { ...order, signature },
      collateralTokens[0].options.address.toLowerCase(),
      loanTokenAmountFilled,
      txOpts
    );
  });

  describe("takeLoanOrderAsTrader", async () => {
    test("should throw an error with an invalid signature", async () => {
      const takerAddress = traders[0];
      const txOpts = {
        from: takerAddress,
        gas: 1000000,
        gasPrice: web3.utils.toWei("5", "gwei").toString()
      };

      expect(() => {
        bZxJS.takeLoanOrderAsTrader({ ...order, signature: BAD_SIG }, txOpts);
      }).toThrow();
      expect(() => {
        bZxJS.takeLoanOrderAsTrader({ ...order, signature: BAD_SIG }, txOpts);
      }).toThrowErrorMatchingSnapshot();
    });

    test("should return total amount of loanToken borrowed", async () => {
      const receipt = await promiEvent;
      const loanTokenAmountFilledReturn = pathOr(
        null,
        ["events", "LogLoanTaken", "returnValues", "loanTokenAmountFilled"],
        receipt
      );
      expect(loanTokenAmountFilledReturn).toBe(loanTokenAmountFilled);

      const debugLine = pathOr(null, ["events", "DebugLine"], receipt);
      expect(debugLine).toBe(null);
    });

    test("should return a web3 PromiEvent", async () => {
      expectPromiEvent(promiEvent);
    });
  });
});
