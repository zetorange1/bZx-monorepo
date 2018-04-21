import { constants as constantsZX } from "0x.js/lib/src/utils/constants";
import b0xJS from "../../core/__tests__/setup";
import * as FillTestUtils from "../../fill/__tests__/utils";
import makeOrder from "../../core/__tests__/order";
import * as orderConstants from "../../core/constants/order";
import B0xJS from "../../core";
import * as OrderHistoryTestUtils from "./utils";

const { web3 } = b0xJS;

describe("order history", () => {
  const { owner, lenders, traders } = OrderHistoryTestUtils.getAccounts();

  const makerAddress = lenders[0];
  const takerAddress = traders[0];

  beforeAll(async () => {
    const {
      loanTokens,
      collateralTokens,
      interestTokens
    } = await FillTestUtils.initAllContractInstances();

    const transferAmount = web3.utils.toWei("1000000", "ether");
    await FillTestUtils.setupAll({ owner, lenders, traders, transferAmount });

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
    /* NOTE: If you want to re-run this test, you must restart
     the local testnet as the orders made by this address will
      accumulate causing this test to fail */
    test("should return order history", async () => {
      const {
        loanTokens,
        interestTokens
      } = await FillTestUtils.initAllContractInstances();

      const orders = await b0xJS.getOrders({
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
        oracleAddress: b0xJS.addresses.B0xOracle,
        orderCancelledAmount: 0,
        orderFilledAmount: 12300000000000000000,
        orderTraderCount: 1,
        traderRelayFee: 1500000000000000
      });
    });
  });
});
