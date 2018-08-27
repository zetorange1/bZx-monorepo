import * as CoreUtils from "../core/utils";
import { getContracts } from "../contracts";

export const wrapEth = (
  { web3, networkId, addresses },
  { amount, getObject, txOpts }
) => {
  const wethContract = CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).WETH.abi,
    addresses.WETH
  );

  const txObj = wethContract.methods.deposit();

  if (getObject) {
    return txObj;
  }
  return txObj.send({ ...txOpts, value: amount });
};

export const unwrapEth = (
  { web3, networkId, addresses },
  { amount, getObject, txOpts }
) => {
  const wethContract = CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).WETH.abi,
    addresses.WETH
  );

  const txObj = wethContract.methods.withdraw(amount);

  if (getObject) {
    return txObj;
  }
  return txObj.send(txOpts);
};
