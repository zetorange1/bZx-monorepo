import * as CoreUtils from "../core/utils";
import { getContracts } from "../contracts";
import * as Addresses from "../addresses";
import * as OrderUtils from "./utils/orders";
import * as LoanPosUtils from "./utils/loanPositions";

export const getOrders = async (web3, { loanPartyAddress, start, count }) => {
  const b0xContract = await CoreUtils.getContractInstance(
    web3,
    getContracts(web3.currentProvider).B0x.abi,
    Addresses.getAddresses(web3.currentProvider).B0x
  );

  const data = await b0xContract.methods
    .getOrders(loanPartyAddress, start, count)
    .call();

  return OrderUtils.cleanData(data);
};

export const getLoanPositions = async (
  web3,
  { loanPartyAddress, start, count }
) => {
  const b0xContract = await CoreUtils.getContractInstance(
    web3,
    getContracts(web3.currentProvider).B0x.abi,
    Addresses.getAddresses(web3.currentProvider).B0x
  );

  const data = await b0xContract.methods
    .getLoanPositions(loanPartyAddress, start, count)
    .call();

  return LoanPosUtils.cleanData(data);
};
