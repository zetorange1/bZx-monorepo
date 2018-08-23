import bZxJS from "../../core/__tests__/setup";
import * as FillTestUtils from "../../fill/__tests__/utils";
import makeOrder from "../../core/__tests__/order";
import * as constants from "../../core/constants";
import * as orderConstants from "../../core/constants/order";
import BZxJS from "../../core";
import * as OrderHistoryTestUtils from "./utils";

const { web3 } = bZxJS;

describe("order history", () => {
  const { owner, lenders, traders } = OrderHistoryTestUtils.getAccounts();

  const makerAddress = lenders[0];
  const takerAddress = traders[0];

  beforeAll(async () => {
    const {
      loanTokens,
      collateralTokens,
      interestTokens
    } = FillTestUtils.initAllContractInstances();

    const transferAmount = web3.utils.toWei("500", "ether");
    await FillTestUtils.setupAll({ owner, lenders, traders, transferAmount });

    const txOpts = {
      from: takerAddress,
      gas: 1000000,
      gasPrice: web3.utils.toWei("5", "gwei").toString()
    };
    const expirationUnixTimestampSec = "1719061340";

    const order = makeOrder({
      makerAddress,
      loanTokenAddress: loanTokens[0].options.address.toLowerCase(),
      interestTokenAddress: interestTokens[0].options.address.toLowerCase(),
      collateralTokenAddress: constants.NULL_ADDRESS,
      feeRecipientAddress: constants.NULL_ADDRESS,
      loanTokenAmount: web3.utils.toWei("100000").toString(),
      interestAmount: web3.utils.toWei("2").toString(),
      initialMarginAmount: "50",
      maintenanceMarginAmount: "25",
      lenderRelayFee: web3.utils.toWei("0.001").toString(),
      traderRelayFee: web3.utils.toWei("0.0015").toString(),
      expirationUnixTimestampSec,
      makerRole: orderConstants.MAKER_ROLE.LENDER,
      salt: BZxJS.generatePseudoRandomSalt().toString()
    });

    const orderHashHex = BZxJS.getLoanOrderHashHex(order);
    const signature = await bZxJS.signOrderHashAsync(
      orderHashHex,
      makerAddress
    );

    const loanTokenAmountFilled = web3.utils.toWei("12.3");
    await bZxJS.takeLoanOrderAsTrader(
      { ...order, signature },
      collateralTokens[0].options.address.toLowerCase(),
      loanTokenAmountFilled,
      txOpts
    );
  });

  describe("getOrdersForUser", async () => {
    /* NOTE: If you want to re-run this test, you must restart
     the local testnet as the orders made by this address will
      accumulate causing this test to fail */
    test("should return order history", async () => {
      const {
        loanTokens,
        interestTokens
      } = FillTestUtils.initAllContractInstances();

      const orders = await bZxJS.getOrdersForUser({
        loanPartyAddress: traders[0],
        start: 0,
        count: 10
      });

      const ordersNoRandomFields = orders.map(
        ({ loanOrderHash, addedUnixTimestampSec, ...rest }) => rest
      );

      expect(ordersNoRandomFields).toContainEqual({
        collateralTokenAddress: "0x0000000000000000000000000000000000000000",
        expirationUnixTimestampSec: 1719061340,
        feeRecipientAddress: "0x0000000000000000000000000000000000000000",
        initialMarginAmount: 50,
        interestAmount: 2000000000000000000,
        interestTokenAddress: interestTokens[0].options.address.toLowerCase(),
        lender: makerAddress,
        lenderRelayFee: 1000000000000000,
        loanTokenAddress: loanTokens[0].options.address.toLowerCase(),
        loanTokenAmount: 1e23,
        maintenanceMarginAmount: 25,
        maker: makerAddress,
        oracleAddress: bZxJS.addresses.BZxOracle,
        orderCancelledAmount: 0,
        orderFilledAmount: 12300000000000000000,
        orderTraderCount: 1,
        traderRelayFee: 1500000000000000
      });
    });
  });
});
