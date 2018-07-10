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
  const data = await b0xContract.methods.getActiveLoans(start, count).call();
  return ActiveLoansUtils.cleanData(data);
};

export const getMarginLevels = async (
  { web3, networkId, addresses },
  { loanOrderHash, trader }
) => {
  const b0xContract = CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).B0x.abi,
    addresses.B0x
  );
  const data = await b0xContract.methods
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
  const b0xContract = CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).B0x.abi,
    addresses.B0x
  );

  const txObj = b0xContract.methods
    .liquidatePosition(loanOrderHash, trader);

  if (getObject) {
    return txObj;
  }
    return txObj.send(txOpts);
};
