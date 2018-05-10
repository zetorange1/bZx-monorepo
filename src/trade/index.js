import { pipe, repeat } from "ramda";

import Web3Utils from "web3-utils";
import BN from "bn.js";
import ethABI from "ethereumjs-abi";
import ethUtil from "ethereumjs-util";
import * as CoreUtils from "../core/utils";
import { getContracts } from "../contracts";
import * as ZeroExTradeUtils from "./utils/zeroEx";

const makeBN = arg => new BN(arg);
const padLeft = arg => Web3Utils.padLeft(arg, 64);
const prepend0x = arg => `0x${arg}`;

export const tradePositionWith0x = (
  { web3, networkId },
  { order0x, orderHashB0x, txOpts }
) => {
  const contracts = getContracts(networkId);
  const b0xContract = CoreUtils.getContractInstance(
    web3,
    contracts.B0x.abi,
    contracts.B0x.address
  );

  const transformedOrder0x = ZeroExTradeUtils.transform0xOrder(order0x);

  const values = [
    ...[
      transformedOrder0x.maker,
      transformedOrder0x.taker,
      transformedOrder0x.makerTokenAddress,
      transformedOrder0x.takerTokenAddress,
      transformedOrder0x.feeRecipient
    ].map(padLeft),
    ...[
      transformedOrder0x.makerTokenAmount,
      transformedOrder0x.takerTokenAmount,
      transformedOrder0x.makerFee,
      transformedOrder0x.takerFee,
      transformedOrder0x.expirationUnixTimestampSec,
      transformedOrder0x.salt
    ].map(value => pipe(makeBN, padLeft, prepend0x)(value))
  ];

  const types = repeat("bytes32", values.length);
  const hashBuff = ethABI.solidityPack(types, values);
  const order0xTightlyPacked = ethUtil.bufferToHex(hashBuff);

  const rpcSig0x = ethUtil.toRpcSig(
    order0x.signature.v,
    order0x.signature.r,
    order0x.signature.s
  );

  return b0xContract.methods
    .tradePositionWith0x(orderHashB0x, order0xTightlyPacked, rpcSig0x)
    .send({
      from: txOpts.from,
      gas: txOpts.gas,
      gasPrice: txOpts.gasPrice
    });
};

export const tradePositionWithOracle = (
  { web3, networkId },
  { orderHash, tradeTokenAddress, txOpts = {} } = {}
) => {
  const contracts = getContracts(networkId);
  const b0xContract = CoreUtils.getContractInstance(
    web3,
    contracts.B0x.abi,
    contracts.B0x.address
  );

  return b0xContract.methods
    .tradePositionWithOracle(orderHash, tradeTokenAddress)
    .send({
      from: txOpts.from,
      gas: txOpts.gas,
      gasPrice: txOpts.gasPrice
    });
};
