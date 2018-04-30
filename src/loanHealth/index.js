import * as CoreUtils from "../core/utils";
import { getContracts } from "../contracts";

export const changeCollateral = (
  { web3, networkId, addresses },
  { loanOrderHash, collateralTokenFilled, txOpts }
) => {
  const b0xContract = CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).B0x.abi,
    addresses.B0x
  );

  return b0xContract.methods
    .changeCollateral(loanOrderHash, collateralTokenFilled)
    .send(txOpts);
};
