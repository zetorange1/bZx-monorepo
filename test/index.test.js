/* globals test, expect, describe */
import Web3 from "web3";
import BigNumber from "bignumber.js";
import sigUtil from "eth-sig-util";
import B0xJS from "../src";
import erc20Json from "../src/contracts/ERC20.json";
import * as utils from "../src/utils";
import * as constants from "../src/constants";
import * as Errors from "../src/constants/errors";
import * as Addresses from "./constants/addresses";

const networkUrl = "https://testnet.b0x.network";
const provider = new Web3.providers.HttpProvider(networkUrl);

const b0xJS = new B0xJS(provider);

test("signOrderHashAsync signs properly", async () => {
  const order = {
    b0xAddress: "0x0000000000000000000000000000000000000000",
    makerAddress: "0x0000000000000000000000000000000000000000",
    networkId: 1,

    // addresses
    loanTokenAddress: "0x25b8fe1de9daf8ba351890744ff28cf7dfa8f5e3",
    interestTokenAddress: "0x25b8fe1de9daf8ba351890744ff28cf7dfa8f5e3",
    collateralTokenAddress: "0x25b8fe1de9daf8ba351890744ff28cf7dfa8f5e3",
    feeRecipientAddress: "0x0000000000000000000000000000000000000000",
    oracleAddress: "0x0000000000000000000000000000000000000000",

    // token amounts
    loanTokenAmount: "40",
    interestAmount: "41",

    // margin amounts
    initialMarginAmount: "40",
    maintenanceMarginAmount: "20",

    // relay fees
    lenderRelayFee: "0",
    traderRelayFee: "0",

    // expiration date/time
    expirationUnixTimestampSec: "1519061340",
    salt: "0.2019429563929979"
  };

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

test("generatePseudoRandomSalt generates proper salt", () => {
  const salt = B0xJS.generatePseudoRandomSalt();
  expect(salt.gte(0)).toBe(true);
  expect(salt.lt(1)).toBe(true);
});

describe("getTokenContract", () => {
  test("creates web3 contract instance", async () => {
    const tokenContract = await utils.getTokenContract(
      b0xJS.web3,
      erc20Json,
      Addresses.TEST_TOKENS[0]
    );
    expect(tokenContract).toBeInstanceOf(b0xJS.web3.eth.Contract);
    expect(tokenContract.options.address.toLowerCase()).toBe(
      Addresses.TEST_TOKENS[0].toLowerCase()
    );
  });

  test("throws error on incorrect address", async () => {
    await expect(
      utils.getTokenContract(b0xJS.web3, erc20Json, constants.ZERO_ADDRESS)
    ).rejects.toThrow(Errors.ContractDoesNotExist);
  });
});

describe("setAllowance", () => {
  test("interacts with blockchain", async () => {
    await expect(
      b0xJS.setAllowance({
        tokenAddress: Addresses.TEST_TOKENS[0],
        ownerAddress: Addresses.ACCOUNTS[0],
        spenderAddress: Addresses.B0x,
        amountInBaseUnits: new BigNumber(100)
      })
    ).resolves.toBe(1);
  });
});
