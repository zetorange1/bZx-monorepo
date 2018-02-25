import { BigNumber } from "@0xproject/utils";
import { constants } from "0x.js/lib/src/utils/constants";
import BN from "bn.js";
import Web3Utils from "web3-utils";
import * as Errors from "./constants/errors";

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

export const getLoanOrderHashHex = order => {
  const orderAddrs = [
    order.makerAddress,
    order.loanTokenAddress,
    order.interestTokenAddress,
    order.collateralTokenAddress,
    order.feeRecipientAddress,
    order.oracleAddress
  ];
  const orderUints = [
    bigNumberToBN(order.loanTokenAmount),
    bigNumberToBN(order.interestAmount),
    bigNumberToBN(order.initialMarginAmount),
    bigNumberToBN(order.maintenanceMarginAmount),
    bigNumberToBN(order.lenderRelayFee),
    bigNumberToBN(order.traderRelayFee),
    bigNumberToBN(order.expirationUnixTimestampSec),
    bigNumberToBN(order.salt)
  ];
  const orderHashHex = Web3Utils.soliditySha3(
    { t: "address", v: order.b0xAddress },
    { t: "address[6]", v: orderAddrs },
    { t: "uint256[8]", v: orderUints }
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
  const contractExists = await doesContractExistAtAddress(web3, address);
  if (!contractExists) throw new Error(Errors.ContractDoesNotExist);

  const contract = new web3.eth.Contract(abi, address);
  return contract;
};
