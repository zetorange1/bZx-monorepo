/* globals test, describe, expect, beforeAll */
import { pathOr, clone } from "ramda";
// import { BigNumber } from "bignumber.js";
import { constants as constantsZX } from "0x.js/lib/src/utils/constants";
import B0xJS from "../../src";
import b0xJS from "../setup";
import * as Addresses from "../constants/addresses";
import makeOrder from "../utils/order";
import * as orderConstants from "../../src/constants/order";
import * as utils from "./utils";

describe("filling orders", () => {
  const owner = Addresses.ACCOUNTS[0];
  const lenders = [Addresses.ACCOUNTS[1], Addresses.ACCOUNTS[3]];
  const traders = [Addresses.ACCOUNTS[2], Addresses.ACCOUNTS[4]];

  beforeAll(async () => {
    const {
      loanTokens,
      collateralTokens,
      interestTokens,
      b0xToken
    } = await utils.initAllContractInstances();
    const ownerTxOpts = { from: owner };
    const transferAmt = b0xJS.web3.utils.toWei("1000000", "ether");

    await utils.setupB0xToken({
      b0xToken,
      lenders,
      traders,
      transferAmt,
      ownerTxOpts: clone(ownerTxOpts)
    });
    await utils.setupLoanTokens({
      loanTokens,
      lenders,
      transferAmt,
      ownerTxOpts: clone(ownerTxOpts)
    });
    await utils.setupCollateralTokens({
      collateralTokens,
      traders,
      transferAmt,
      ownerTxOpts: clone(ownerTxOpts)
    });
    await utils.setupInterestTokens({
      interestTokens,
      traders,
      transferAmt,
      ownerTxOpts: clone(ownerTxOpts)
    });
  });

  describe("takeLoanOrderAsLender", async () => {
    test.skip("should return total amount of loanToken borrowed", async () => {
      const makerAddress = Addresses.ACCOUNTS[1];
      const takerAddress = Addresses.ACCOUNTS[0];
      const txOpts = { from: takerAddress, gas: 1000000 };

      const order = makeOrder({
        makerRole: orderConstants.MAKER_ROLE.TRADER,
        makerAddress,
        salt: B0xJS.generatePseudoRandomSalt()
      });

      const orderHashHex = B0xJS.getLoanOrderHashHex(order);
      const signature = await b0xJS.signOrderHashAsync(
        orderHashHex,
        makerAddress
      );
      const receipt = await b0xJS.takeLoanOrderAsLender(
        { ...order, signature },
        txOpts
      );

      const loanTokenAmountFilled = pathOr(
        null,
        [
          "events",
          "LoanOrderTakenAmounts",
          "returnValues",
          "loanTokenAmountFilled"
        ],
        receipt
      );
      expect(loanTokenAmountFilled).toBe("0");
    });
  });

  describe("takeLoanOrderAsTrader", async () => {
    test("should return total amount of loanToken borrowed", async () => {
      const {
        loanTokens,
        interestTokens,
        collateralTokens
      } = await utils.initAllContractInstances();
      const makerAddress = lenders[0];
      const takerAddress = traders[0];
      const txOpts = { from: takerAddress, gas: 1000000 };
      const expirationUnixTimestampSec = "1719061340";

      const order = makeOrder({
        makerAddress,
        loanTokenAddress: loanTokens[0].options.address.toLowerCase(),
        interestTokenAddress: interestTokens[0].options.address.toLowerCase(),
        collateralTokenAddress: constantsZX.NULL_ADDRESS,
        feeRecipientAddress: constantsZX.NULL_ADDRESS,
        loanTokenAmount: b0xJS.web3.utils.toWei(100000).toString(),
        interestAmount: b0xJS.web3.utils.toWei(2).toString(),
        initialMarginAmount: "50",
        maintenanceMarginAmount: "25",
        lenderRelayFee: b0xJS.web3.utils.toWei(0.001).toString(),
        traderRelayFee: b0xJS.web3.utils.toWei(0.0015).toString(),
        expirationUnixTimestampSec,
        makerRole: orderConstants.MAKER_ROLE.LENDER,
        salt: B0xJS.generatePseudoRandomSalt().toString()
      });
      const orderHashHex = B0xJS.getLoanOrderHashHex(order);
      const signature = await b0xJS.signOrderHashAsync(
        orderHashHex,
        makerAddress
      );
      const loanTokenAmountFilled = b0xJS.web3.utils.toWei(12.3);
      const receipt = await b0xJS.takeLoanOrderAsTrader(
        { ...order, signature },
        collateralTokens[0].options.address.toLowerCase(),
        loanTokenAmountFilled,
        txOpts
      );
      const loanTokenAmountFilledReturn = pathOr(
        null,
        [
          "events",
          "LoanOrderTakenAmounts",
          "returnValues",
          "loanTokenAmountFilled"
        ],
        receipt
      );
      console.log(JSON.stringify(receipt, null, 2));
      expect(loanTokenAmountFilledReturn).toBe("0");
    });
  });
});
