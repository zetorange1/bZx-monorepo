/* globals test, describe, expect, beforeAll */
import { pathOr } from "ramda";
import { constants as constantsZX } from "0x.js/lib/src/utils/constants";
import B0xJS from "../../src";
import b0xJS from "../setup";
import makeOrder from "../utils/order";
import * as orderConstants from "../../src/constants/order";
import * as Utils from "./utils";
import Accounts from "../constants/accounts";

const { web3 } = b0xJS;

describe("filling orders", () => {
  const owner = Accounts[0].address;
  const lenders = [Accounts[1].address, Accounts[3].address];
  const traders = [Accounts[2].address, Accounts[4].address];

  beforeAll(async () => {
    const {
      loanTokens,
      collateralTokens,
      interestTokens,
      b0xToken
    } = await Utils.initAllContractInstances();
    const ownerTxOpts = { from: owner };
    const transferAmt = web3.utils.toWei("1000000", "ether");

    const balancePs = [
      b0xToken,
      ...loanTokens,
      ...collateralTokens,
      ...interestTokens
    ].map(token =>
      b0xJS.getBalance({
        tokenAddress: token.options.address.toLowerCase(),
        ownerAddress: owner
      })
    );

    const res = await Promise.all(balancePs);
    console.log(res.map(bigNum => bigNum.toString()));

    await Utils.setupB0xToken({
      b0xToken,
      lenders,
      traders,
      transferAmt,
      ownerTxOpts
    });
    await Utils.setupLoanTokens({
      loanTokens,
      lenders,
      transferAmt,
      ownerTxOpts
    });
    await Utils.setupCollateralTokens({
      collateralTokens,
      traders,
      transferAmt,
      ownerTxOpts
    });
    await Utils.setupInterestTokens({
      interestTokens,
      traders,
      transferAmt,
      ownerTxOpts
    });

    const balancePs2 = [
      b0xToken,
      ...loanTokens,
      ...collateralTokens,
      ...interestTokens
    ].map(token =>
      b0xJS.getBalance({
        tokenAddress: token.options.address.toLowerCase(),
        ownerAddress: owner
      })
    );

    const res2 = await Promise.all(balancePs2);
    console.log(res2.map(bigNum => bigNum.toString()));
  });

  describe("takeLoanOrderAsLender", async () => {
    test("should return total amount of loanToken borrowed", async () => {
      const {
        loanTokens,
        interestTokens,
        collateralTokens
      } = await Utils.initAllContractInstances();
      const makerAddress = traders[1];
      const takerAddress = lenders[1];
      const txOpts = {
        from: takerAddress,
        gas: 1000000,
        gasPrice: web3.utils.toWei("30", "gwei").toString()
      };
      const expirationUnixTimestampSec = "1719061340";

      const order = makeOrder({
        makerAddress,
        loanTokenAddress: loanTokens[1].options.address.toLowerCase(),
        interestTokenAddress: interestTokens[1].options.address.toLowerCase(),
        collateralTokenAddress: collateralTokens[1].options.address.toLowerCase(),
        feeRecipientAddress: constantsZX.NULL_ADDRESS,
        loanTokenAmount: web3.utils.toWei("100000").toString(),
        interestAmount: web3.utils.toWei("2").toString(),
        initialMarginAmount: "50",
        maintenanceMarginAmount: "25",
        lenderRelayFee: web3.utils.toWei("0.001").toString(),
        traderRelayFee: web3.utils.toWei("0.0015").toString(),
        expirationUnixTimestampSec,
        makerRole: orderConstants.MAKER_ROLE.TRADER,
        salt: B0xJS.generatePseudoRandomSalt().toString()
      });

      const orderHashHex = B0xJS.getLoanOrderHashHex(order);
      const signature = await b0xJS.signOrderHashAsync(
        orderHashHex,
        makerAddress
      );

      const isValidSig = await b0xJS.isValidSignature({
        account: makerAddress,
        orderHash: orderHashHex,
        signature
      });
      console.log("isValidSig", isValidSig);

      const receipt = await b0xJS.takeLoanOrderAsLender(
        { ...order, signature },
        txOpts
      );
      console.log(JSON.stringify(receipt, null, 2));
      const loanTokenAmountFilledReturn = pathOr(
        null,
        [
          "events",
          "LoanPositionUpdated",
          "returnValues",
          "loanTokenAmountFilled"
        ],
        receipt
      );
      const loanTokenAmountFilled = "100000000000000000000000";
      expect(loanTokenAmountFilledReturn).toBe(loanTokenAmountFilled);
    });
  });

  describe("takeLoanOrderAsTrader", async () => {
    test("should return total amount of loanToken borrowed", async () => {
      const {
        loanTokens,
        interestTokens,
        collateralTokens
      } = await Utils.initAllContractInstances();
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

      const isValidSig = await b0xJS.isValidSignature({
        account: makerAddress,
        orderHash: orderHashHex,
        signature
      });
      console.log("isValidSig", isValidSig);

      const loanTokenAmountFilled = web3.utils.toWei("12.3");
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
          "LoanPositionUpdated",
          "returnValues",
          "loanTokenAmountFilled"
        ],
        receipt
      );
      // console.log(JSON.stringify(receipt, null, 2));
      expect(loanTokenAmountFilledReturn).toBe(loanTokenAmountFilled);
    });
  });
});
