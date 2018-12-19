import * as constants from "../../core/constants";
import bZxJS from "../../core/__tests__/setup";
import * as FillTestUtils from "../../fill/__tests__/utils";
import makeOrder from "../../core/__tests__/order";
import * as orderConstants from "../../core/constants/order";
import { BZxJS } from "../../core";
import * as OrderHistoryTestUtils from "./utils";

const { web3 } = bZxJS;

describe("loanPositions", () => {
  const { owner, lenders, traders } = OrderHistoryTestUtils.getAccounts();
  const {
    loanTokens,
    collateralTokens,
    interestTokens
  } = FillTestUtils.initAllContractInstances();

  const makerAddress = lenders[0];
  const order = makeOrder({
    makerAddress,
    loanTokenAddress: loanTokens[0].options.address.toLowerCase(),
    interestTokenAddress: interestTokens[0].options.address.toLowerCase(),
    collateralTokenAddress: constants.NULL_ADDRESS,
    feeRecipientAddress: constants.NULL_ADDRESS,
    loanTokenAmount: web3.utils.toWei("251").toString(),
    interestAmount: web3.utils.toWei("2").toString(),
    initialMarginAmount: "50000000000000000000",
    maintenanceMarginAmount: "25000000000000000000",
    lenderRelayFee: web3.utils.toWei("0.001").toString(),
    traderRelayFee: web3.utils.toWei("0.0015").toString(),
    maxDurationUnixTimestampSec: "2419200", // 28 days
    expirationUnixTimestampSec: "1719061340",
    makerRole: orderConstants.MAKER_ROLE.LENDER,
    withdrawOnOpen: "0",
    salt: BZxJS.generatePseudoRandomSalt().toString()
  });
  const collateralTokenAddress = collateralTokens[0].options.address.toLowerCase();

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
      makerAddress
    );

    const loanTokenAmountFilled = web3.utils.toWei("12.3");
    await bZxJS.takeLoanOrderAsTrader(
      { ...order, signature },
      collateralTokenAddress,
      loanTokenAmountFilled,
      txOpts
    );
  });

  describe("getLoansForTrader", async () => {
    test("should return loan positions", async () => {
      const loanPositions = await bZxJS.getLoansForTrader({
        address: traders[0],
        count: 10,
        activeOnly: false
      });

      /*
      One thing to keep in mind with tests against takeLoanOrderAsLender or takeLoanOrderAsTrader..
      to calcuate the amount of collateral token amount required and transfered, bZx does a call to the oracle to get the current exchange rate
      (between collateralToken and loanToken), then based on that and the initialMarginAmount,
      it calculates and transfers enough collateral token from the trader to satisfy margin requirements.
      Since the testnet isn't connected to Kyber to get true token rates, the oracle just randomly generates a bogus rate.
      */
      const loanPositionsNoRandomFields = loanPositions.map(
        ({
          loanStartUnixTimestampSec,
          collateralTokenAmountFilled,
          loanOrderHash,
          interestTotalAccrued,
          interestPaidSoFar,
          index,
          ...rest
        }) => rest
      );

      expect(loanPositionsNoRandomFields).toContainEqual({
        active: 1,
        collateralTokenAddressFilled: collateralTokenAddress,
        interestTokenAddress: order.interestTokenAddress,
        lender: "0xa8dda8d7f5310e4a9e24f8eba77e091ac264f872",
        loanTokenAddress: order.loanTokenAddress,
        loanTokenAmountFilled: 12300000000000000000,
        positionTokenAddressFilled: order.loanTokenAddress,
        positionTokenAmountFilled: 12300000000000000000,
        trader: "0x06cef8e666768cc40cc78cf93d9611019ddcb628"
      });
    });
  });

  describe("getLoansForLender", async () => {
    test("should return loan positions", async () => {
      const loanPositions = await bZxJS.getLoansForLender({
        address: lenders[0],
        count: 10,
        activeOnly: false
      });

      /*
      One thing to keep in mind with tests against takeLoanOrderAsLender or takeLoanOrderAsTrader..
      to calcuate the amount of collateral token amount required and transfered, bZx does a call to the oracle to get the current exchange rate
      (between collateralToken and loanToken), then based on that and the initialMarginAmount,
      it calculates and transfers enough collateral token from the trader to satisfy margin requirements.
      Since the testnet isn't connected to Kyber to get true token rates, the oracle just randomly generates a bogus rate.
      */
      const loanPositionsNoRandomFields = loanPositions.map(
        ({
          loanStartUnixTimestampSec,
          collateralTokenAmountFilled,
          loanOrderHash,
          interestTotalAccrued,
          interestPaidSoFar,
          index,
          ...rest
        }) => rest
      );

      expect(loanPositionsNoRandomFields).toContainEqual({
        active: 1,
        collateralTokenAddressFilled: collateralTokenAddress,
        interestTokenAddress: order.interestTokenAddress,
        lender: "0xa8dda8d7f5310e4a9e24f8eba77e091ac264f872",
        loanTokenAddress: order.loanTokenAddress,
        loanTokenAmountFilled: 12300000000000000000,
        positionTokenAddressFilled: order.loanTokenAddress,
        positionTokenAmountFilled: 12300000000000000000,
        trader: "0x06cef8e666768cc40cc78cf93d9611019ddcb628"
      });
    });
  });
});
