import * as CoreUtils from "../core/utils";
import { getContracts } from "../contracts";
import * as Addresses from "../addresses";
import * as OrderUtils from "./utils/orders";

export const getSingleOrder = async (
  { web3, networkId },
  { loanOrderHash }
) => {
  const bZxContract = await CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).BZx.abi,
    Addresses.getAddresses(networkId).BZx
  );

  const data = await bZxContract.methods
    .getSingleOrder(loanOrderHash)
    .call();

  const cleanedData = OrderUtils.cleanData(data);
  if (cleanedData.length > 0)
    return cleanedData[0];
  return {};
};

export const getOrders = async (
  { web3, networkId },
  { loanPartyAddress, start, count }
) => {
  const bZxContract = await CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).BZx.abi,
    Addresses.getAddresses(networkId).BZx
  );

  const data = await bZxContract.methods
    .getOrders(loanPartyAddress, start, count)
    .call();

  return OrderUtils.cleanData(data);
};

export * from "./loans";
