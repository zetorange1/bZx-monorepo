import { clone } from "ramda";
import * as CoreUtils from "../core/utils";
import eip20 from "../contracts/EIP20.json";

export const transferToken = async (
  { web3 },
  { tokenAddress, to, amount, txOpts } = {}
) => {
  const tokenContract = await CoreUtils.getContractInstance(
    web3,
    eip20.abi,
    tokenAddress
  );
  return tokenContract.methods.transfer(to, amount).send(clone(txOpts));
};

export const transferTokenWithTxHash = async (
  { web3 },
  { tokenAddress, to, amount, txOpts }
) => {
  const tokenContract = await CoreUtils.getContractInstance(
    web3,
    eip20.abi,
    tokenAddress
  );

  const p = tokenContract.methods.transfer(to, amount).send(clone(txOpts));
  return {
    transactionHash: CoreUtils.promisifyReturningTxHash(p),
    receipt: p
  };
};
