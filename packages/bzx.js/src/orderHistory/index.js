import * as CoreUtils from "../core/utils";
import { NULL_ADDRESS } from "../core/constants";
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

  const data = await bZxContract.methods.getSingleOrder(loanOrderHash).call();

  const cleanedData = OrderUtils.cleanData(data);
  if (cleanedData.length > 0) return cleanedData[0];
  return {};
};

export const getOrdersFillable = async (
  { web3, networkId },
  { start, count, oracleFilter }
) => {
  const bZxContract = await CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).BZx.abi,
    Addresses.getAddresses(networkId).BZx
  );

  const data = await bZxContract.methods.getOrdersFillable(
	  web3.utils.toBN(start).toString(10),
	  web3.utils.toBN(count).toString(10),
	  web3.utils.isAddress(oracleFilter) ? oracleFilter : NULL_ADDRESS
  ).call();

  return OrderUtils.cleanData(data);
};

export const getOrdersForUser = async (
  { web3, networkId },
  { loanPartyAddress, start, count, oracleFilter }
) => {
  const bZxContract = await CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).BZx.abi,
    Addresses.getAddresses(networkId).BZx
  );

  const data = await bZxContract.methods
    .getOrdersForUser(
        loanPartyAddress,
        web3.utils.toBN(start).toString(10),
        web3.utils.toBN(count).toString(10),
        web3.utils.isAddress(oracleFilter) ? oracleFilter : NULL_ADDRESS
    ).call();

  return OrderUtils.cleanData(data);
};

export * from "./loans";
