import * as CoreUtils from "../core/utils";
import { getContracts } from "../contracts";
import * as ActiveLoansUtils from "./utils/activeLoans";

export const getActiveLoans = async (
  { web3, networkId, addresses },
  { start, count }
) => {
  const bZxContract = CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).BZx.abi,
    addresses.BZx
  );
  const data = await bZxContract.methods.getActiveLoans(start, count).call();
  return ActiveLoansUtils.cleanData(data);
};

export const getMarginLevels = async (
  { web3, networkId, addresses },
  { loanOrderHash, trader }
) => {
  const bZxContract = CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).BZx.abi,
    addresses.BZx
  );
  const data = await bZxContract.methods
    .getMarginLevels(loanOrderHash, trader)
    .call();
  return {
    initialMarginAmount: data[0],
    maintenanceMarginAmount: data[1],
    currentMarginAmount: data[2]
  };
};

export const liquidateLoan = (
  { web3, networkId, addresses },
  { loanOrderHash, trader, getObject, txOpts }
) => {
  const bZxContract = CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).BZx.abi,
    addresses.BZx
  );

  const txObj = bZxContract.methods.liquidatePosition(loanOrderHash, trader);

  if (getObject) {
    return txObj;
  }
  return txObj.send(txOpts);
};
