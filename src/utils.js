import BigNumber from 'bignumber.js';
import BN from 'bn.js';
// import ethABI from 'ethereumjs-abi';
// import ethUtil from 'ethereumjs-util';
import Web3Utils from 'web3-utils';
import _ from 'lodash';

// import { SolidityTypes } from './types';

export const noop = () => {

};

export const bigNumberToBN = value => new BN(value.toString(), 10);

export const generatePseudoRandomSalt = () => {
  // BigNumber.random returns a pseudo-random number between 0 & 1
  // with a passed in number of decimal places.
  // Source: https://mikemcl.github.io/bignumber.js/#random
  const MAX_DIGITS_IN_UNSIGNED_256_INT = 78;
  const randomNumber = BigNumber.random(MAX_DIGITS_IN_UNSIGNED_256_INT);
  const factor = new BigNumber(10).pow(MAX_DIGITS_IN_UNSIGNED_256_INT - 1);
  const salt = randomNumber.times(factor).round();
  return salt;
};

export const getLoanOrderHashHex = (order) => {
  const orderAddrs = [
    order.makerAddress,
    order.loanTokenAddress,
    order.interestTokenAddress,
    order.collateralTokenAddress,
    order.feeRecipientAddress,
    order.oracleAddress,
  ];
  const orderUints = [
    bigNumberToBN(order.loanTokenAmount),
    bigNumberToBN(order.interestAmount),
    bigNumberToBN(order.initialMarginAmount),
    bigNumberToBN(order.maintenanceMarginAmount),
    bigNumberToBN(order.lenderRelayFee),
    bigNumberToBN(order.traderRelayFee),
    bigNumberToBN(order.expirationUnixTimestampSec),
    bigNumberToBN(order.salt),
  ];
  const orderHashHex = Web3Utils.soliditySha3(
    { t: 'address', v: order.b0x },
    { t: 'address[6]', v: orderAddrs },
    { t: 'uint256[8]', v: orderUints },
  );
  return orderHashHex;
};
