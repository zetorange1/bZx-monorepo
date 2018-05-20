import { pathOr } from "ramda";
import b0xJS from "../../core/__tests__/setup";
import * as FillTestUtils from "../../fill/__tests__/utils";
import B0xJS from "../../core";

const { web3 } = b0xJS;

describe("bounty", () => {
  const { owner, lenders, traders } = FillTestUtils.getAccounts();

  const {
    loanTokens,
    interestTokens,
    collateralTokens
  } = FillTestUtils.initAllContractInstances();

  const order = FillTestUtils.makeOrderAsLender({
    web3,
    lenders,
    loanTokens,
    interestTokens
  });

  const collateralTokenFilled = collateralTokens[0].options.address.toLowerCase();
  const takerAddress = traders[0];

  let orderHashHex = null;

  beforeAll(async () => {
    const transferAmount = web3.utils.toWei("4000", "ether");
    await FillTestUtils.setupAll({ owner, lenders, traders, transferAmount });

    const txOpts = {
      from: takerAddress,
      gas: 1000000,
      gasPrice: web3.utils.toWei("5", "gwei").toString()
    };

    orderHashHex = B0xJS.getLoanOrderHashHex(order);
    const signature = await b0xJS.signOrderHashAsync(
      orderHashHex,
      order.makerAddress
    );

    const loanTokenAmountFilled = web3.utils.toWei("12.3");

    const receipt = await b0xJS.takeLoanOrderAsTrader(
      { ...order, signature },
      collateralTokenFilled,
      loanTokenAmountFilled,
      txOpts
    );

    expect(pathOr(null, ["events", "DebugLine"], receipt)).toEqual(null);
  });

  describe("getMarginLevels", () => {
    test("should return margin levels", async () => {
      const marginLevels = await b0xJS.getMarginLevels({
        loanOrderHash: orderHashHex,
        trader: traders[0],
        txOpts: {
          from: lenders[0],
          gas: 1000000,
          gasPrice: web3.utils.toWei("5", "gwei").toString()
        }
      });
      expect(marginLevels).toMatchSnapshot();
    });
  });
});
