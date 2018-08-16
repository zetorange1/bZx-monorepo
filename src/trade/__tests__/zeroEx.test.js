import { pathOr } from "ramda";
import { expectPromiEvent } from "../../core/__tests__/utils";
import BZxJS from "../../core/index";
import bZxJS from "../../core/__tests__/setup";
import Accounts from "../../core/__tests__/accounts";
import * as FillTestUtils from "../../fill/__tests__/utils";
import * as TradeTestUtils from "./utils";
import * as TradeTestUtilsOrder0x from "./utils-order0x";

describe("trade", () => {
  const { web3 } = bZxJS;

  const { order0xToken } = TradeTestUtils.initAllContractInstances();
  const {
    loanTokens,
    interestTokens,
    collateralTokens
  } = FillTestUtils.initAllContractInstances();

  const makerOf0xOrder = Accounts[7].address;
  const { owner, lenders, traders } = FillTestUtils.getAccounts();

  let tradePositionWith0xPromiEvent = null;
  let takeLoanOrderAsTraderReceipt = null;

  beforeAll(async () => {
    await TradeTestUtils.setupAll({
      owner,
      makerOf0xOrder,
      transferAmount: web3.utils.toWei("500", "ether")
    });
    await FillTestUtils.setupAll({
      owner,
      lenders,
      traders,
      transferAmount: web3.utils.toWei("500", "ether")
    });

    const orderBZx = FillTestUtils.makeOrderAsLender({
      web3,
      lenders,
      loanTokens,
      interestTokens
    });
    const orderHashBZx = BZxJS.getLoanOrderHashHex(orderBZx);
    const signatureBZx = await bZxJS.signOrderHashAsync(
      orderHashBZx,
      orderBZx.makerAddress
    );

    const takerAddress = traders[0];
    const txOpts = {
      from: takerAddress,
      gas: 1000000,
      gasPrice: web3.utils.toWei("5", "gwei").toString()
    };

    const loanTokenAmountFilled = web3.utils.toWei("12.3");
    // bZx hash that we give to tradePositionWith0x must belong to a loan that was previously filled, so we fill the loan order here
    takeLoanOrderAsTraderReceipt = await bZxJS.takeLoanOrderAsTrader(
      { ...orderBZx, signature: signatureBZx },
      collateralTokens[0].options.address.toLowerCase(),
      loanTokenAmountFilled,
      txOpts
    );

    const order0xWithSignature = await TradeTestUtilsOrder0x.getOrder0xWithSignature(
      {
        web3,
        makerAddress: makerOf0xOrder,
        makerTokenAddress: order0xToken.options.address.toLowerCase(),
        takerTokenAddress: orderBZx.loanTokenAddress
      }
    );

    tradePositionWith0xPromiEvent = bZxJS.tradePositionWith0x({
      order0x: order0xWithSignature,
      orderHashBZx,
      txOpts
    });
  });

  describe("tradePositionWith0x", () => {
    test("should return a web3 PromiEvent", async () => {
      expectPromiEvent(tradePositionWith0xPromiEvent);
    });

    test("should successfully trade position with 0x", async () => {
      expect(
        pathOr(null, ["events", "DebugLine"], takeLoanOrderAsTraderReceipt)
      ).toBe(null);

      const receipt = await tradePositionWith0xPromiEvent;
      const debugLine = pathOr(null, ["events", "DebugLine"], receipt);
      expect(debugLine).toBe(null);
    });
  });
});
