import * as CoreUtils from "../core/utils";
import { getContracts } from "../contracts";

export const wrapEth = (
  { web3, networkId, addresses },
  { amount, txOpts } = {}
) => {
  const wethContract = CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).WETH.abi,
    addresses.WETH
  );

  return wethContract.methods
    .deposit().send({ ...txOpts, value: amount });
};

export const unwrapEth = (
  { web3, networkId, addresses },
  { amount, txOpts } = {}
) => {
  const wethContract = CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).WETH.abi,
    addresses.WETH
  );

  return wethContract.methods
    .withdraw(
      amount
    )
    .send(txOpts);
};
