import * as CoreUtils from "../core/utils";
import { getContracts } from "../contracts";
import * as Addresses from "../addresses";
import * as OrderUtils from "./utils/orders";

export const getSingleOrder = async (
  { web3, networkId },
  { loanOrderHash }
) => {
  const b0xContract = await CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).B0x.abi,
    Addresses.getAddresses(networkId).B0x
  );

  const data = await b0xContract.methods
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
  const b0xContract = await CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).B0x.abi,
    Addresses.getAddresses(networkId).B0x
  );

  const data = await b0xContract.methods
    .getOrders(loanPartyAddress, start, count)
    .call();

  return OrderUtils.cleanData(data);
};

export * from "./loans";
