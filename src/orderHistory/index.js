import * as CoreUtils from "../core/utils";
import contracts from "../contracts";
import * as OrderUtils from "./utils/orders";
import * as LoanPosUtils from "./utils/loanPositions";

export const getOrders = async (web3, { loanPartyAddress, start, count }) => {
  const b0xContract = await CoreUtils.getContractInstance(
    web3,
    contracts.B0x.abi,
    contracts.B0x.address
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
    contracts.B0x.abi,
    contracts.B0x.address
  );

  const data = await b0xContract.methods
    .getLoanPositions(loanPartyAddress, start, count)
    .call();

  return LoanPosUtils.cleanData(data);
};
