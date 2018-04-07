import { constants } from "0x.js/lib/src/utils/constants";
import { BigNumber } from "@0xproject/utils";
import B0xJS from "../../core";
import * as utils from "../../core/utils";
import * as Errors from "../constants/errors";
import b0xJS from "./setup";
import makeOrder from "./order";
import { local as Contracts } from "../../contracts";
import Accounts from "./accounts";
import * as orderConstants from "../constants/order";

const { EIP20 } = Contracts;
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

describe("generatePseudoRandomSalt", () => {
  test("should generate different salts", () => {
    expect(B0xJS.generatePseudoRandomSalt()).not.toEqual(
      B0xJS.generatePseudoRandomSalt()
    );
  });

  test("should generate salt in range [0..2^256)", () => {
    const salt = B0xJS.generatePseudoRandomSalt();
    expect(salt.greaterThanOrEqualTo(0)).toBe(true);
    const twoPow256 = new BigNumber(2).pow(256);
    expect(salt.lessThan(twoPow256)).toBe(true);
  });
});

describe("getContractInstance", () => {
  test("should create web3 contract instance", async () => {
    const tokenContract = await utils.getContractInstance(
      b0xJS.web3,
      EIP20.abi,
      Contracts.TestToken0.address
    );
    expect(tokenContract).toBeInstanceOf(b0xJS.web3.eth.Contract);
    expect(tokenContract.options.address.toLowerCase()).toBe(
      Contracts.TestToken0.address.toLowerCase()
    );
  });

  test("should throw error on incorrect address", async () => {
    await expect(
      utils.getContractInstance(b0xJS.web3, EIP20.abi, constants.NULL_ADDRESS)
    ).rejects.toThrow(Errors.ContractDoesNotExist);
  });
});

describe("getBalance", () => {
  test("should return token balance", async () => {
    const balance = await b0xJS.getBalance({
      tokenAddress: Contracts.TestToken0.address,
      ownerAddress: Accounts[9].address
    });

    expect(balance).toEqual(new BigNumber("0"));
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
