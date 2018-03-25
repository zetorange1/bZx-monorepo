/* globals test, describe, expect, beforeAll */
import { constants as constantsZX } from "0x.js/lib/src/utils/constants";
import b0xJS from "../../core/__tests__/setup";
import Accounts from "../../core/__tests__/accounts";
import * as FillTestUtils from "../../fill/__tests__/utils";
import makeOrder from "../../core/__tests__/order";
import * as orderConstants from "../../core/constants/order";
import B0xJS from "../../core";

const { web3 } = b0xJS;

describe("order history", () => {
  const owner = Accounts[0].address;
  const lenders = [Accounts[5].address, Accounts[7].address];
  const traders = [Accounts[6].address, Accounts[8].address];

  beforeAll(async () => {
    const {
      loanTokens,
      collateralTokens,
      interestTokens,
      b0xToken
    } = await FillTestUtils.initAllContractInstances();
    const ownerTxOpts = { from: owner };
    const transferAmt = web3.utils.toWei("1000000", "ether");

    await FillTestUtils.setupB0xToken({
      b0xToken,
      lenders,
      traders,
      transferAmt,
      ownerTxOpts
    });
    await FillTestUtils.setupLoanTokens({
      loanTokens,
      lenders,
      transferAmt,
      ownerTxOpts
    });
    await FillTestUtils.setupCollateralTokens({
      collateralTokens,
      traders,
      transferAmt,
      ownerTxOpts
    });
    await FillTestUtils.setupInterestTokens({
      interestTokens,
      traders,
      transferAmt,
      ownerTxOpts
    });

    const makerAddress = lenders[0];
    const takerAddress = traders[0];
    const txOpts = {
      from: takerAddress,
      gas: 1000000,
      gasPrice: web3.utils.toWei("30", "gwei").toString()
    };
    const expirationUnixTimestampSec = "1719061340";

    const order = makeOrder({
      makerAddress,
      loanTokenAddress: loanTokens[0].options.address.toLowerCase(),
      interestTokenAddress: interestTokens[0].options.address.toLowerCase(),
      collateralTokenAddress: constantsZX.NULL_ADDRESS,
      feeRecipientAddress: constantsZX.NULL_ADDRESS,
      loanTokenAmount: web3.utils.toWei("100000").toString(),
      interestAmount: web3.utils.toWei("2").toString(),
      initialMarginAmount: "50",
      maintenanceMarginAmount: "25",
      lenderRelayFee: web3.utils.toWei("0.001").toString(),
      traderRelayFee: web3.utils.toWei("0.0015").toString(),
      expirationUnixTimestampSec,
      makerRole: orderConstants.MAKER_ROLE.LENDER,
      salt: B0xJS.generatePseudoRandomSalt().toString()
    });

    const orderHashHex = B0xJS.getLoanOrderHashHex(order);
    const signature = await b0xJS.signOrderHashAsync(
      orderHashHex,
      makerAddress
    );

    const loanTokenAmountFilled = web3.utils.toWei("12.3");
    await b0xJS.takeLoanOrderAsTrader(
      { ...order, signature },
      collateralTokens[0].options.address.toLowerCase(),
      loanTokenAmountFilled,
      txOpts
    );
  });

  describe("getOrders", async () => {
    test("should return order history", async () => {
      const ordersRaw = await b0xJS.getOrders({
        loanPartyAddress: traders[0],
        start: 0,
        count: 10
      });

      const orders = ordersRaw.map((loanOrderHash, ...rest) => rest);
      expect(orders).toMatchSnapshot();
    });
  });
});
