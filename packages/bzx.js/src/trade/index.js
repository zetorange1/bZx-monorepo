import { pipe, repeat } from "ramda";
import Web3Utils from "web3-utils";
import BN from "bn.js";
import ethABI from "ethereumjs-abi";
import ethUtil from "ethereumjs-util";
import { ZeroEx } from "0x.js";
import * as CoreUtils from "../core/utils";
import { getContracts } from "../contracts";
import * as ZeroExTradeUtils from "./utils/zeroEx";
import * as Signature from "../signature";

const makeBN = arg => new BN(arg);
const padLeft = arg => Web3Utils.padLeft(arg, 64);
const prepend0x = arg => `0x${arg}`;

export const tradePositionWith0x = (
  { web3, networkId },
  { order0x, orderHashBZx, getObject, txOpts }
) => {

  const rpcSig0x = ethUtil.toRpcSig(
    order0x.signedOrder.ecSignature.v,
    order0x.signedOrder.ecSignature.r,
    order0x.signedOrder.ecSignature.s
  );

  const transformedOrder0x = ZeroExTradeUtils.transform0xOrder(order0x);
  const orderHash0x = ZeroEx.getOrderHashHex(transformedOrder0x);

  Signature.isValidSignature({
    account: order0x.signedOrder.maker,
    orderHash: orderHash0x,
    signature: rpcSig0x
  });

  const contracts = getContracts(networkId);
  const bZxContract = CoreUtils.getContractInstance(
    web3,
    contracts.BZx.abi,
    contracts.BZx.address
  );

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

  const txObj = bZxContract.methods
    .tradePositionWith0x(orderHashBZx, order0xTightlyPacked, rpcSig0x);

  if (getObject) {
    return txObj;
  }
  return txObj.send(txOpts);
};

export const tradePositionWithOracle = (
  { web3, networkId },
  { orderHash, tradeTokenAddress, getObject, txOpts = {} } = {}
) => {
  const contracts = getContracts(networkId);
  const bZxContract = CoreUtils.getContractInstance(
    web3,
    contracts.BZx.abi,
    contracts.BZx.address
  );

  const txObj = bZxContract.methods
    .tradePositionWithOracle(orderHash, tradeTokenAddress);

  if (getObject) {
    return txObj;
  }
  return txObj.send(txOpts);
};
