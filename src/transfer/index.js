import { clone } from "ramda";
import * as CoreUtils from "../core/utils";
import eip20 from "../contracts/EIP20.json";

export const transferToken = (
  { web3 },
  { tokenAddress, to, amount, txOpts } = {}
) => {
  const tokenContract = CoreUtils.getContractInstance(
    web3,
    eip20.abi,
    tokenAddress
  );

  return tokenContract.methods.transfer(to, amount).send(clone(txOpts));
};
