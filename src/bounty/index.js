import * as CoreUtils from "../core/utils";
import { getContracts } from "../contracts";

export const getActiveLoans = (
  { web3, networkId, addresses },
  { start, count, txOpts }
) => {
  const b0xContract = CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).B0x.abi,
    addresses.B0x
  );
  return b0xContract.methods.getLoans(start, count).send(txOpts);
};
