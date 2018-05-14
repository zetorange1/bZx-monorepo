import b0xJS from "../../core/__tests__/setup";
import * as FillTestUtils from "../../fill/__tests__/utils";
import B0xJS from "../../core";

const { web3 } = b0xJS;

describe("bounty", () => {
  const { owner, lenders, traders } = FillTestUtils.getAccounts();
  const loanTokenAmount = web3.utils.toWei("251").toString();

  const {
    loanTokens,
    collateralTokens,
    interestTokens
  } = FillTestUtils.initAllContractInstances();

  const order = FillTestUtils.makeOrderAsTrader({
    web3,
    traders,
    loanTokens,
    interestTokens,
    collateralTokens,
    loanTokenAmount
  });

  beforeAll(async () => {
    const transferAmount = web3.utils.toWei("500", "ether");
    await FillTestUtils.setupAll({ owner, lenders, traders, transferAmount });

    const takerAddress = lenders[1];
    const txOpts = {
      from: takerAddress,
      gas: 1000000,
      gasPrice: web3.utils.toWei("30", "gwei").toString()
    };

    const orderHashHex = B0xJS.getLoanOrderHashHex(order);
    const signature = await b0xJS.signOrderHashAsync(
      orderHashHex,
      order.makerAddress
    );

    await b0xJS.takeLoanOrderAsLender({ ...order, signature }, txOpts);
  });

  describe("getActiveLoans", () => {
    test("should return active loans", async () => {
      const activeLoans = await b0xJS.getActiveLoans({ start: 0, count: 10 });
      console.log(activeLoans);
    });
  });
});
