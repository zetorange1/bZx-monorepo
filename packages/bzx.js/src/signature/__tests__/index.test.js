import * as constants from "../../core/constants";
import { BZxJS } from "../../core";
import bZxJS from "../../core/__tests__/setup";
import makeOrder from "../../core/__tests__/order";
import { local as Contracts } from "../../contracts";
import Accounts from "../../core/__tests__/accounts";
import * as orderConstants from "../../core/constants/order";

const { web3 } = bZxJS;

describe("signOrderHashAsync", () => {
  test("should sign properly", async () => {
    const [signerAddressRaw] = await bZxJS.web3.eth.getAccounts();
    const signerAddress = signerAddressRaw.toLowerCase();

    const orderHash = BZxJS.getLoanOrderHashHex(makeOrder());
    const signature = await bZxJS.signOrderHashAsync(orderHash, signerAddress);
    const isValid = BZxJS.isValidSignature({
      account: signerAddress,
      orderHash,
      signature
    });

    expect(isValid).toBe(true);
  });
});

describe("isValidSignature", () => {
  test("bZxJS result should matach bZx contract result", async () => {
    const [signerAddressRaw] = await bZxJS.web3.eth.getAccounts();
    const signerAddress = signerAddressRaw.toLowerCase();

    const orderHash = BZxJS.getLoanOrderHashHex(makeOrder());
    const signature = await bZxJS.signOrderHashAsync(orderHash, signerAddress);

    const isValidBZxJS = BZxJS.isValidSignature({
      account: signerAddress,
      orderHash,
      signature
    });

    const isValidBZx = await bZxJS.isValidSignatureAsync({
      account: signerAddress,
      orderHash,
      signature
    });

    expect(isValidBZxJS).toBe(isValidBZx);
  });
});

describe("isValidSignatureAsync", () => {
  test("should return true for a valid signature", async () => {
    const makerAddress = Accounts[4].address;

    const maxDurationUnixTimestampSec = "2419200"; // 28 days
    const expirationUnixTimestampSec = "1719061340";
    const loanTokenAmount = web3.utils.toWei("100000").toString();

    const order = makeOrder({
      makerAddress,
      loanTokenAddress: Contracts.TestToken1.address,
      interestTokenAddress: Contracts.TestToken5.address,
      collateralTokenAddress: Contracts.TestToken3.address,
      feeRecipientAddress: constants.NULL_ADDRESS,
      loanTokenAmount,
      interestAmount: web3.utils.toWei("2").toString(),
      initialMarginAmount: "50000000000000000000",
      maintenanceMarginAmount: "25000000000000000000",
      lenderRelayFee: web3.utils.toWei("0.001").toString(),
      traderRelayFee: web3.utils.toWei("0.0015").toString(),
      maxDurationUnixTimestampSec, // 28 days
      expirationUnixTimestampSec,
      makerRole: orderConstants.MAKER_ROLE.TRADER,
      withdrawOnOpen: "0",
      salt: BZxJS.generatePseudoRandomSalt().toString()
    });

    const orderHash = BZxJS.getLoanOrderHashHex(order);
    const signature = await bZxJS.signOrderHashAsync(orderHash, makerAddress);
    const res = await bZxJS.isValidSignatureAsync({
      account: makerAddress,
      orderHash,
      signature
    });
    expect(res).toBe(true);
  });

  test("should return false for an invalid signature", async () => {
    const makerAddress = Accounts[4].address;
    const nonMakerAddress = Accounts[0].address;

    const maxDurationUnixTimestampSec = "2419200"; // 28 days
    const expirationUnixTimestampSec = "1719061340";
    const loanTokenAmount = web3.utils.toWei("100000").toString();

    const order = makeOrder({
      makerAddress,
      loanTokenAddress: Contracts.TestToken1.address,
      interestTokenAddress: Contracts.TestToken5.address,
      collateralTokenAddress: Contracts.TestToken3.address,
      feeRecipientAddress: constants.NULL_ADDRESS,
      loanTokenAmount,
      interestAmount: web3.utils.toWei("2").toString(),
      initialMarginAmount: "50000000000000000000",
      maintenanceMarginAmount: "25000000000000000000",
      lenderRelayFee: web3.utils.toWei("0.001").toString(),
      traderRelayFee: web3.utils.toWei("0.0015").toString(),
      maxDurationUnixTimestampSec, // 28 days
      expirationUnixTimestampSec,
      makerRole: orderConstants.MAKER_ROLE.TRADER,
      withdrawOnOpen: "0",
      salt: BZxJS.generatePseudoRandomSalt().toString()
    });

    const orderHash = BZxJS.getLoanOrderHashHex(order);
    const signature = await bZxJS.signOrderHashAsync(
      orderHash,
      nonMakerAddress
    );
    const res = await bZxJS.isValidSignatureAsync({
      account: makerAddress,
      orderHash,
      signature
    });
    expect(res).toBe(false);
  });
});
