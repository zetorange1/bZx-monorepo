import * as CoreUtils from "../core/utils";
import eip20 from "../contracts/EIP20.json";

export const transferToken = (
  { web3 },
  { tokenAddress, to, amount, getObject, txOpts }
) => {
  const tokenContract = CoreUtils.getContractInstance(
    web3,
    eip20.abi,
    tokenAddress
  );

  const txObj = tokenContract.methods.transfer(to, amount);

  if (getObject) {
    return txObj;
  }
  return txObj.send(txOpts);
};
