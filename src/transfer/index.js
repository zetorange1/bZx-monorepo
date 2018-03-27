import { clone } from "ramda";
import * as Utils from "../core/utils";
import eip20 from "../contracts/EIP20.json";

export const transferToken = async (
  web3,
  { tokenAddress, to, amount, txOpts }
) => {
  const tokenContract = await Utils.getContractInstance(
    web3,
    eip20.abi,
    tokenAddress
  );
  return tokenContract.methods.transfer(to, amount).send(clone(txOpts));
};
