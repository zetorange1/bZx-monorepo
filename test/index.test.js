/* globals test, expect, describe */
import { constants } from "0x.js/lib/src/utils/constants";
import { BigNumber } from "@0xproject/utils";
import sigUtil from "eth-sig-util";
import B0xJS from "../src";
import erc20Abi from "../src/contracts/ERC20.abi.json";
import * as utils from "../src/utils";
import * as Errors from "../src/constants/errors";
import * as Addresses from "./constants/addresses";
import b0xJS from "./setup";
import order from "./constants/order";

describe("signOrderHashAsync", () => {
  test("should sign properly", async () => {
    const [signerAddress] = await b0xJS.web3.eth.getAccounts();

    const orderHash = B0xJS.getLoanOrderHashHex(order);
    const signature = await b0xJS.signOrderHashAsync(orderHash, signerAddress);

    // Not sure why this doesn't work
    // const recoveredAccount = await b0xJS.web3.eth.accounts.recover(
    //   orderHash,
    //   signature
    // );
    const recoveredAccount = sigUtil.recoverPersonalSignature({
      data: orderHash,
      sig: signature
    });
    expect(recoveredAccount).toBe(signerAddress.toLowerCase());
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
      erc20Abi,
      Addresses.TEST_TOKENS[0]
    );
    expect(tokenContract).toBeInstanceOf(b0xJS.web3.eth.Contract);
    expect(tokenContract.options.address.toLowerCase()).toBe(
      Addresses.TEST_TOKENS[0].toLowerCase()
    );
  });

  test("should throw error on incorrect address", async () => {
    await expect(
      utils.getContractInstance(b0xJS.web3, erc20Abi, constants.NULL_ADDRESS)
    ).rejects.toThrow(Errors.ContractDoesNotExist);
  });
});

describe("getBalance", () => {
  test("should return token balance", async () => {
    const balance = await b0xJS.getBalance({
      tokenAddress: Addresses.TEST_TOKENS[0],
      ownerAddress: Addresses.ACCOUNTS[10]
    });

    expect(balance).toEqual(new BigNumber("0"));
  });
});
