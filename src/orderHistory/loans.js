import * as CoreUtils from "../core/utils";
import { getContracts } from "../contracts";
import * as Addresses from "../addresses";
import * as LoanPosUtils from "./utils/loanPositions";

export const getLoansForLender = async (
  { web3, networkId },
  { address, count, activeOnly }
) => {
  const b0xContract = await CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).B0x.abi,
    Addresses.getAddresses(networkId).B0x
  );

  const data = await b0xContract.methods
    .getLoansForLender(address, count, activeOnly)
    .call();

  return LoanPosUtils.cleanData(data);
};

export const getLoansForTrader = async (
  { web3, networkId },
  { address, count, activeOnly }
) => {
  const b0xContract = await CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).B0x.abi,
    Addresses.getAddresses(networkId).B0x
  );

  const data = await b0xContract.methods
    .getLoansForTrader(address, count, activeOnly)
    .call();

  return LoanPosUtils.cleanData(data);
};
