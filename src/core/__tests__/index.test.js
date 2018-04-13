import { BigNumber } from "@0xproject/utils";
import B0xJS from "../../core";
import * as utils from "../../core/utils";
import b0xJS from "./setup";
import { local as Contracts } from "../../contracts";
import Accounts from "./accounts";

const { EIP20 } = Contracts;

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
