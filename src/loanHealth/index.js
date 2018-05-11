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

export const depositCollateral = (
  { web3, networkId, addresses },
  { loanOrderHash, collateralTokenFilled, depositAmount, txOpts }
) => {
  const b0xContract = CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).B0x.abi,
    addresses.B0x
  );

  return b0xContract.methods
    .depositCollateral(loanOrderHash, collateralTokenFilled, depositAmount)
    .send(txOpts);
};

export const withdrawExcessCollateral = (
  { web3, networkId, addresses },
  { loanOrderHash, collateralTokenFilled, withdrawAmount, txOpts }
) => {
  const b0xContract = CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).B0x.abi,
    addresses.B0x
  );

  return b0xContract.methods
    .withdrawExcessCollateral(
      loanOrderHash,
      collateralTokenFilled,
      withdrawAmount
    )
    .send(txOpts);
};

export const payInterest = (
  { web3, networkId, addresses },
  { loanOrderHash, trader, txOpts }
) => {
  const b0xContract = CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).B0x.abi,
    addresses.B0x
  );

  return b0xContract.methods.payInterest(loanOrderHash, trader).send(txOpts);
};
