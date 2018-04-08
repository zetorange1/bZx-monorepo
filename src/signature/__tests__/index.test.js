import { constants } from "0x.js/lib/src/utils/constants";
import B0xJS from "../../core";
import b0xJS from "../../core/__tests__/setup";
import makeOrder from "../../core/__tests__/order";
import { local as Contracts } from "../../contracts";
import Accounts from "../../core/__tests__/accounts";
import * as orderConstants from "../../core/constants/order";

const { web3 } = b0xJS;

describe("signOrderHashAsync", () => {
  test("should sign properly", async () => {
    const [signerAddressRaw] = await b0xJS.web3.eth.getAccounts();
    const signerAddress = signerAddressRaw.toLowerCase();

    const orderHash = B0xJS.getLoanOrderHashHex(makeOrder());
    const signature = await b0xJS.signOrderHashAsync(orderHash, signerAddress);
    const isValid = B0xJS.isValidSignature({
      account: signerAddress,
      orderHash,
      signature
    });

    expect(isValid).toBe(true);
  });
});

describe("isValidSignature", () => {
  test("b0xJS result should matach b0x contract result", async () => {
    const [signerAddressRaw] = await b0xJS.web3.eth.getAccounts();
    const signerAddress = signerAddressRaw.toLowerCase();

    const orderHash = B0xJS.getLoanOrderHashHex(makeOrder());
    const signature = await b0xJS.signOrderHashAsync(orderHash, signerAddress);

    const isValidB0xJS = B0xJS.isValidSignature({
      account: signerAddress,
      orderHash,
      signature
    });

    const isValidB0x = await b0xJS.isValidSignatureAsync({
      account: signerAddress,
      orderHash,
      signature
    });

    expect(isValidB0xJS).toBe(isValidB0x);
  });
});

describe("isValidSignatureAsync", () => {
  test("should return true for a valid signature", async () => {
    const makerAddress = Accounts[4].address;

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
      initialMarginAmount: "50",
      maintenanceMarginAmount: "25",
      lenderRelayFee: web3.utils.toWei("0.001").toString(),
      traderRelayFee: web3.utils.toWei("0.0015").toString(),
      expirationUnixTimestampSec,
      makerRole: orderConstants.MAKER_ROLE.TRADER,
      salt: B0xJS.generatePseudoRandomSalt().toString()
    });

    const orderHash = B0xJS.getLoanOrderHashHex(order);
    const signature = await b0xJS.signOrderHashAsync(orderHash, makerAddress);
    const res = await b0xJS.isValidSignatureAsync({
      account: makerAddress,
      orderHash,
      signature
    });
    expect(res).toBe(true);
  });

  test("should return false for an invalid signature", async () => {
    const makerAddress = Accounts[4].address;
    const nonMakerAddress = Accounts[0].address;

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
      initialMarginAmount: "50",
      maintenanceMarginAmount: "25",
      lenderRelayFee: web3.utils.toWei("0.001").toString(),
      traderRelayFee: web3.utils.toWei("0.0015").toString(),
      expirationUnixTimestampSec,
      makerRole: orderConstants.MAKER_ROLE.TRADER,
      salt: B0xJS.generatePseudoRandomSalt().toString()
    });

    const orderHash = B0xJS.getLoanOrderHashHex(order);
    const signature = await b0xJS.signOrderHashAsync(
      orderHash,
      nonMakerAddress
    );
    const res = await b0xJS.isValidSignatureAsync({
      account: makerAddress,
      orderHash,
      signature
    });
    expect(res).toBe(false);
  });
});
