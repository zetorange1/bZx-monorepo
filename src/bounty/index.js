import * as CoreUtils from "../core/utils";
import { getContracts } from "../contracts";
import * as ActiveLoansUtils from "./utils/activeLoans";

export const getActiveLoans = async (
  { web3, networkId, addresses },
  { start, count }
) => {
  const b0xContract = CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).B0x.abi,
    addresses.B0x
  );
  const data = await b0xContract.methods.getLoans(start, count).call();
  return ActiveLoansUtils.cleanData(data);
};
