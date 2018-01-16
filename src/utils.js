import BigNumber from 'bignumber.js';
import BN from 'bn.js';
import ethABI from 'ethereumjs-abi';
import ethUtil from 'ethereumjs-util';
import _ from 'lodash';

import { SolidityTypes } from './types';

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

export const getLendOrderHashHex = (order) => {
  const orderParams = [
    { value: order.b0x, type: SolidityTypes.Address },
    { value: order.maker, type: SolidityTypes.Address },
    { value: order.lendTokenAddress, type: SolidityTypes.Address },
    { value: order.interestTokenAddress, type: SolidityTypes.Address },
    { value: order.marginTokenAddress, type: SolidityTypes.Address },
    { value: order.feeRecipientAddress, type: SolidityTypes.Address },
    { value: order.oracleAddress, type: SolidityTypes.Address },
    { value: bigNumberToBN(order.lendTokenAmount), type: SolidityTypes.Uint256 },
    { value: bigNumberToBN(order.interestAmount), type: SolidityTypes.Uint256 },
    { value: bigNumberToBN(order.initialMarginAmount), type: SolidityTypes.Uint256 },
    { value: bigNumberToBN(order.liquidationMarginAmount), type: SolidityTypes.Uint256 },
    { value: bigNumberToBN(order.lenderRelayFee), type: SolidityTypes.Uint256 },
    { value: bigNumberToBN(order.traderRelayFee), type: SolidityTypes.Uint256 },
    { value: bigNumberToBN(order.expirationUnixTimestampSec), type: SolidityTypes.Uint256 },
    { value: bigNumberToBN(order.salt), type: SolidityTypes.Uint256 },
  ];
  const types = _.map(orderParams, o => o.type);
  const values = _.map(orderParams, o => o.value);
  const hashBuff = ethABI.soliditySHA3(types, values);
  const orderHashHex = ethUtil.bufferToHex(hashBuff);
  return orderHashHex;
};
