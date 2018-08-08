import * as CoreUtils from "../core/utils";
import { getContracts } from "../contracts";
import * as Addresses from "../addresses";
import * as LoanPosUtils from "./utils/loanPositions";

export const getSingleLoan = async (
  { web3, networkId },
  { loanOrderHash, trader }
) => {
  const bZxContract = await CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).BZx.abi,
    Addresses.getAddresses(networkId).BZx
  );

  const data = await bZxContract.methods
    .getSingleLoan(loanOrderHash, trader)
    .call();

  const cleanedData = LoanPosUtils.cleanData(data);
  if (cleanedData.length > 0)
    return cleanedData[0];
  return {};
};

export const getLoansForLender = async (
  { web3, networkId },
  { address, count, activeOnly }
) => {
  const bZxContract = await CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).BZx.abi,
    Addresses.getAddresses(networkId).BZx
  );

  const data = await bZxContract.methods
    .getLoansForLender(address, count, activeOnly)
    .call();

  return LoanPosUtils.cleanData(data);
};

export const getLoansForTrader = async (
  { web3, networkId },
  { address, count, activeOnly }
) => {
  const bZxContract = await CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).BZx.abi,
    Addresses.getAddresses(networkId).BZx
  );

  const data = await bZxContract.methods
    .getLoansForTrader(address, count, activeOnly)
    .call();

  return LoanPosUtils.cleanData(data);
};
