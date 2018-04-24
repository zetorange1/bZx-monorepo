import { pipe, repeat } from "ramda";
import Web3Utils from "web3-utils";
import BN from "bn.js";
import ethABI from "ethereumjs-abi";
import ethUtil from "ethereumjs-util";
import * as CoreUtils from "../core/utils";
import { getContracts } from "../contracts";

const makeBN = arg => new BN(arg);
const padLeft = arg => Web3Utils.padLeft(arg, 64);
const prepend0x = arg => `0x${arg}`;

export const tradePositionWith0x = (
  { web3, networkId },
  { order0x, signature0x, orderHashB0x, txOpts }
) => {
  const contracts = getContracts(networkId);
  const b0xContract = CoreUtils.getContractInstance(
    web3,
    contracts.B0x.abi,
    contracts.B0x.address
  );

  const values = [
    ...[
      order0x.maker,
      order0x.taker,
      order0x.makerTokenAddress,
      order0x.takerTokenAddress,
      order0x.feeRecipient
    ].map(padLeft),
    ...[
      order0x.makerTokenAmount,
      order0x.takerTokenAmount,
      order0x.makerFee,
      order0x.takerFee,
      order0x.expirationUnixTimestampSec,
      order0x.salt
    ].map(value => pipe(makeBN, padLeft, prepend0x)(value))
  ];

  const types = repeat("bytes32", values.length);
  const hashBuff = ethABI.solidityPack(types, values);
  const order0xTightlyPacked = ethUtil.bufferToHex(hashBuff);

  return b0xContract.methods
    .tradePositionWith0x(orderHashB0x, order0xTightlyPacked, signature0x)
    .send({
      from: txOpts.from,
      gas: txOpts.gas,
      gasPrice: txOpts.gasPrice
    });
};

export const tradePositionWithOracle = (
  { web3, networkId },
  { orderHash, tokenAddress, txOpts = {} } = {}
) => {
  const contracts = getContracts(networkId);
  const b0xContract = CoreUtils.getContractInstance(
    web3,
    contracts.B0x.abi,
    contracts.B0x.address
  );

  return b0xContract.methods
    .tradePositionWithOracle(orderHash, tokenAddress)
    .send({
      from: txOpts.from,
      gas: txOpts.gas,
      gasPrice: txOpts.gasPrice
    });
};
