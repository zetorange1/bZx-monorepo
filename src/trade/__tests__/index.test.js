import { constants } from "0x.js/lib/src/utils/constants";
import { pathOr } from "ramda";
import { ZeroEx } from "0x.js";
import { expectPromiEvent } from "../../core/__tests__/utils";
import B0xJS from "../../core/index";
import b0xJS from "../../core/__tests__/setup";
import { protocol } from "../../../../config/secrets";
import Accounts from "../../core/__tests__/accounts";
import { local as Contracts } from "../../contracts";
import * as FillTestUtils from "../../fill/__tests__/utils";
import * as TradeTestUtils from "./utils";

describe("trade", () => {
  const { web3 } = b0xJS;
  const zxConstants = pathOr(null, ["development", "ZeroEx"], protocol);

  const makerOf0xOrder = Accounts[7].address;
  const maker0xToken1 = Contracts.TestToken6;
  const loanToken1 = Contracts.TestToken0;

  const { owner, lenders, traders } = FillTestUtils.getAccounts();

  beforeAll(async () => {
    await TradeTestUtils.setupAll({
      owner,
      traders,
      makerOf0xOrder,
      transferAmount: web3.utils.toWei("10000", "ether")
    });
    await FillTestUtils.setupAll({
      owner,
      lenders,
      traders,
      transferAmount: web3.utils.toWei("1000000", "ether")
    });
  });

  describe("tradePositionWith0x", () => {
    const order0x = {
      exchangeContractAddress: zxConstants.Exchange.toLowerCase(),
      expirationUnixTimestampSec: "2519061340",
      feeRecipient: constants.NULL_ADDRESS,
      maker: makerOf0xOrder,
      makerFee: web3.utils.toWei("0.002", "ether").toString(),
      makerTokenAddress: maker0xToken1.address,
      makerTokenAmount: web3.utils.toWei("100", "ether").toString(),
      salt: B0xJS.generatePseudoRandomSalt().toString(),
      taker: constants.NULL_ADDRESS,
      takerFee: web3.utils.toWei("0.0013", "ether").toString(),
      takerTokenAddress: loanToken1.address,
      takerTokenAmount: web3.utils.toWei("90", "ether").toString()
    };

    const orderHash = ZeroEx.getOrderHashHex(order0x);

    test("should return a web3 PromiEvent", async () => {
      const {
        loanTokens,
        interestTokens
      } = await FillTestUtils.initAllContractInstances();

      expect(ZeroEx.isValidOrderHash(orderHash)).toBe(true);

      const signature0x = await b0xJS.signOrderHashAsync(
        orderHash,
        makerOf0xOrder
      );

      const ecSignature0x = {
        v: parseInt(signature0x.substring(130, 132), 10) + 27,
        r: `0x${signature0x.substring(2, 66)}`,
        s: `0x${signature0x.substring(66, 130)}`
      };

      expect(
        ZeroEx.isValidSignature(orderHash, ecSignature0x, makerOf0xOrder)
      ).toBe(true);

      const order = FillTestUtils.makeOrderAsLender({
        web3,
        lenders,
        loanTokens,
        interestTokens
      });
      const orderHashB0x = B0xJS.getLoanOrderHashHex(order);

      const txOpts = { from: traders[0] };
      const promiEvent = b0xJS.tradePositionWith0x({
        order0x,
        signature0x,
        orderHashB0x,
        txOpts
      });
      expectPromiEvent(promiEvent);
    });

    test("should successfully trade position with 0x", async () => {
      const {
        loanTokens,
        interestTokens,
        collateralTokens
      } = await FillTestUtils.initAllContractInstances();

      const takerAddress = traders[0];
      const txOpts = {
        from: takerAddress,
        gas: 1000000,
        gasPrice: web3.utils.toWei("30", "gwei").toString()
      };

      const order = FillTestUtils.makeOrderAsLender({
        web3,
        lenders,
        loanTokens,
        interestTokens
      });

      const orderHashB0x = B0xJS.getLoanOrderHashHex(order);
      const signatureB0x = await b0xJS.signOrderHashAsync(
        orderHashB0x,
        order.makerAddress
      );
      const loanTokenAmountFilled = web3.utils.toWei("12.3");
      // b0x hash that we give to tradePositionWith0x must belong to a loan that was previously filled, so we fill the loan order here
      const takeLoanOrderAsTraderReceipt = await b0xJS.takeLoanOrderAsTrader(
        { ...order, signature: signatureB0x },
        collateralTokens[0].options.address.toLowerCase(),
        loanTokenAmountFilled,
        txOpts
      );

      console.log(
        "takeLoanOrderAsTraderReceipt",
        JSON.stringify(takeLoanOrderAsTraderReceipt, null, 2)
      );

      expect(
        pathOr(null, ["events", "DebugLine"], takeLoanOrderAsTraderReceipt)
      ).toBe(null);

      const signature0x = await b0xJS.signOrderHashAsync(
        orderHash,
        makerOf0xOrder
      );

      const receipt = await b0xJS.tradePositionWith0x({
        order0x,
        signature0x,
        orderHashB0x,
        txOpts
      });

      const debugLine = pathOr(null, ["events", "DebugLine"], receipt);
      expect(debugLine).toBe(null);
    });
  });
});
