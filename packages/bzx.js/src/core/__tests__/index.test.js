import { BigNumber } from "@0xproject/utils";
import { BZxJS } from "../../core";
import * as utils from "../../core/utils";
import bZxJS from "./setup";
import { local as Contracts } from "../../contracts";
import Accounts from "./accounts";

const { EIP20 } = Contracts;

describe("generatePseudoRandomSalt", () => {
  test("should generate different salts", () => {
    expect(BZxJS.generatePseudoRandomSalt()).not.toEqual(
      BZxJS.generatePseudoRandomSalt()
    );
  });

  test("should generate salt in range [0..2^256)", () => {
    const salt = BZxJS.generatePseudoRandomSalt();
    expect(salt.greaterThanOrEqualTo(0)).toBe(true);
    const twoPow256 = new BigNumber(2).pow(256);
    expect(salt.lessThan(twoPow256)).toBe(true);
  });
});

describe("toChecksumAddress", () => {
  test("should convert to checksum address", () => {
    expect("0x9Bffd1579bd6760a186fFf1A720f2a5dB35dE0f4").toEqual(
      BZxJS.toChecksumAddress("0x9bffd1579bd6760a186fff1a720f2a5db35de0f4")
    );
  });
});

describe("getContractInstance", () => {
  test("should create web3 contract instance", async () => {
    const tokenContract = await utils.getContractInstance(
      bZxJS.web3,
      EIP20.abi,
      Contracts.TestToken0.address
    );
    expect(tokenContract).toBeInstanceOf(bZxJS.web3.eth.Contract);
    expect(tokenContract.options.address.toLowerCase()).toBe(
      Contracts.TestToken0.address.toLowerCase()
    );
  });
});

describe("getBalance", () => {
  test("should return token balance", async () => {
    const balance = await bZxJS.getBalance({
      tokenAddress: Contracts.TestToken0.address,
      ownerAddress: Accounts[9].address
    });

    expect(balance).toEqual(new BigNumber("0"));
  });
});
