import { constants } from "0x.js/lib/src/utils/constants";
import { pathOr } from "ramda";
import { ZeroEx } from "0x.js";
import { expectPromiEvent } from "../../core/__tests__/utils";
import B0xJS from "../../core/index";
import b0xJS from "../../core/__tests__/setup";
import { protocol } from "../../../../config/secrets";
import Accounts from "../../core/__tests__/accounts";
import * as FillTestUtils from "../../fill/__tests__/utils";
import * as TradeTestUtils from "./utils";

describe("trade", () => {
  const { web3 } = b0xJS;
  const zxConstants = pathOr(null, ["development", "ZeroEx"], protocol);

  const { order0xToken } = TradeTestUtils.initAllContractInstances();
  const {
    loanTokens,
    interestTokens,
    collateralTokens
  } = FillTestUtils.initAllContractInstances();

  const makerOf0xOrder = Accounts[7].address;
  const { owner, lenders, traders } = FillTestUtils.getAccounts();

  let orderHash0x = null;
  let ecSignature0x = null;
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

    const orderB0x = FillTestUtils.makeOrderAsLender({
      web3,
      lenders,
      loanTokens,
      interestTokens
    });
    const orderHashB0x = B0xJS.getLoanOrderHashHex(orderB0x);
    const signatureB0x = await b0xJS.signOrderHashAsync(
      orderHashB0x,
      orderB0x.makerAddress
    );

    const takerAddress = traders[0];
    const txOpts = {
      from: takerAddress,
      gas: 1000000,
      gasPrice: web3.utils.toWei("30", "gwei").toString()
    };

    const loanTokenAmountFilled = web3.utils.toWei("12.3");
    // b0x hash that we give to tradePositionWith0x must belong to a loan that was previously filled, so we fill the loan order here
    takeLoanOrderAsTraderReceipt = await b0xJS.takeLoanOrderAsTrader(
      { ...orderB0x, signature: signatureB0x },
      collateralTokens[0].options.address.toLowerCase(),
      loanTokenAmountFilled,
      txOpts
    );

    const order0x = {
      exchangeContractAddress: zxConstants.Exchange.toLowerCase(),
      expirationUnixTimestampSec: "2519061340",
      feeRecipient: constants.NULL_ADDRESS,
      maker: makerOf0xOrder,
      makerFee: web3.utils.toWei("0.002", "ether").toString(),
      makerTokenAddress: order0xToken.options.address.toLowerCase(),
      makerTokenAmount: web3.utils.toWei("100", "ether").toString(),
      salt: B0xJS.generatePseudoRandomSalt().toString(),
      taker: constants.NULL_ADDRESS,
      takerFee: web3.utils.toWei("0.0013", "ether").toString(),
      takerTokenAddress: orderB0x.loanTokenAddress,
      takerTokenAmount: web3.utils.toWei("90", "ether").toString()
    };

    orderHash0x = ZeroEx.getOrderHashHex(order0x);
    const signature0x = await b0xJS.signOrderHashAsync(
      orderHash0x,
      makerOf0xOrder
    );
    ecSignature0x = {
      v: parseInt(signature0x.substring(130, 132), 10) + 27,
      r: `0x${signature0x.substring(2, 66)}`,
      s: `0x${signature0x.substring(66, 130)}`
    };

    tradePositionWith0xPromiEvent = b0xJS.tradePositionWith0x({
      order0x,
      signature0x,
      orderHashB0x,
      txOpts
    });
  });

  describe("tradePositionWith0x", () => {
    test("should return a web3 PromiEvent", async () => {
      expect(ZeroEx.isValidOrderHash(orderHash0x)).toBe(true);

      expect(
        ZeroEx.isValidSignature(orderHash0x, ecSignature0x, makerOf0xOrder)
      ).toBe(true);
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
