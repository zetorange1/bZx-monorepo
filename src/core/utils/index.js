import { BigNumber } from "@0xproject/utils";
import sigUtil from "eth-sig-util";
import { assert } from "@0xproject/assert";
import { constants } from "0x.js/lib/src/utils/constants";
import BN from "bn.js";
import Web3Utils from "web3-utils";
import * as Errors from "../constants/errors";
import { SchemaValidator } from "../../schemas/b0x_json_schemas";
import { getContracts } from "../../contracts";
import * as Addresses from "../../addresses";

export const noop = () => {};

export const bigNumberToBN = value => new BN(value.toString(), 10);

export const generatePseudoRandomSalt = () => {
  // BigNumber.random returns a pseudo-random number between 0 & 1
  // with a passed in number of decimal places.
  // Source: https://mikemcl.github.io/bignumber.js/#random
  const randomNumber = BigNumber.random(
    constants.MAX_DIGITS_IN_UNSIGNED_256_INT
  );
  const factor = new BigNumber(10).pow(
    constants.MAX_DIGITS_IN_UNSIGNED_256_INT - 1
  );
  const salt = randomNumber.times(factor).round();
  return salt;
};

const getLoanOrderHashArgs = order => {
  const orderAddresses = [
    order.makerAddress,
    order.loanTokenAddress,
    order.interestTokenAddress,
    order.collateralTokenAddress,
    order.feeRecipientAddress,
    order.oracleAddress
  ];
  const orderValues = [
    bigNumberToBN(order.loanTokenAmount),
    bigNumberToBN(order.interestAmount),
    bigNumberToBN(order.initialMarginAmount),
    bigNumberToBN(order.maintenanceMarginAmount),
    bigNumberToBN(order.lenderRelayFee),
    bigNumberToBN(order.traderRelayFee),
    bigNumberToBN(order.expirationUnixTimestampSec),
    bigNumberToBN(order.makerRole),
    bigNumberToBN(order.salt)
  ];
  return { orderAddresses, orderValues };
};

export const getLoanOrderHashHex = order => {
  const { orderAddresses, orderValues } = getLoanOrderHashArgs(order);

  const orderHashHex = Web3Utils.soliditySha3(
    { t: "address", v: order.b0xAddress },
    { t: "address[6]", v: orderAddresses },
    { t: "uint256[9]", v: orderValues }
  );
  return orderHashHex;
};

export const doesContractExistAtAddress = async (web3, address) => {
  const code = await web3.eth.getCode(address);
  // Regex matches 0x0, 0x00, 0x in order to accommodate poorly implemented clients
  const codeIsEmpty = /^0x0{0,40}$/i.test(code);
  return !codeIsEmpty;
};

export const getContractInstance = async (web3, abi, address) => {
  assert.isETHAddressHex("address", address);
  const contractExists = await doesContractExistAtAddress(web3, address);
  if (!contractExists)
    throw new Error(`${Errors.ContractDoesNotExist} ${address}`);

  const contract = new web3.eth.Contract(abi, address);
  return contract;
};

export const doesConformToSchema = (variableName, value, schema) => {
  const schemaValidator = new SchemaValidator();
  const validationResult = schemaValidator.validate(value, schema);
  const hasValidationErrors = validationResult.errors.length > 0;
  const msg = `Expected ${variableName} to conform to schema ${
    schema.id
  }\nEncountered: ${JSON.stringify(
    value,
    null,
    "\t"
  )}\nValidation errors: ${validationResult.errors.join(", ")}`;
  assert.assert(!hasValidationErrors, msg);
};

export const isValidSignature = ({ account, orderHash, signature }) => {
  const recoveredAccount = sigUtil.recoverPersonalSignature({
    data: orderHash,
    sig: signature
  });
  return recoveredAccount === account;
};

export const isValidSignatureAsync = async (
  { web3, networkId },
  { account, orderHash, signature }
) => {
  const b0xContract = await getContractInstance(
    web3,
    getContracts(networkId).B0x.abi,
    Addresses.getAddresses(networkId).B0x
  );
  return b0xContract.methods
    .isValidSignature(account, orderHash, signature)
    .call();
};

export const getLoanOrderHashAsync = async ({ web3, networkId }, order) => {
  const { orderAddresses, orderValues } = getLoanOrderHashArgs(order);
  const b0xContract = await getContractInstance(
    web3,
    getContracts(networkId).B0x.abi,
    Addresses.getAddresses(networkId).B0x
  );
  return b0xContract.methods
    .getLoanOrderHash(orderAddresses, orderValues)
    .call();
};
