import * as CoreUtils from "../core/utils";
import { getContracts } from "../contracts";

export const changeCollateral = (
  { web3, networkId, addresses },
  { loanOrderHash, collateralTokenFilled, getObject, txOpts }
) => {
  const b0xContract = CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).B0x.abi,
    addresses.B0x
  );

  const txObj = b0xContract.methods
    .changeCollateral(loanOrderHash, collateralTokenFilled);

  if (getObject) {
    return txObj;
  }
    return txObj.send(txOpts);
};

export const depositCollateral = (
  { web3, networkId, addresses },
  { loanOrderHash, collateralTokenFilled, depositAmount, getObject, txOpts }
) => {
  const b0xContract = CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).B0x.abi,
    addresses.B0x
  );

  const txObj = b0xContract.methods
    .depositCollateral(
      loanOrderHash,
      collateralTokenFilled,
      depositAmount
    );

  if (getObject) {
    return txObj;
  }
    return txObj.send(txOpts);
};

export const withdrawExcessCollateral = (
  { web3, networkId, addresses },
  { loanOrderHash, collateralTokenFilled, withdrawAmount, getObject, txOpts }
) => {
  const b0xContract = CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).B0x.abi,
    addresses.B0x
  );

  const txObj = b0xContract.methods
    .withdrawExcessCollateral(
      loanOrderHash,
      collateralTokenFilled,
      withdrawAmount
    );

  if (getObject) {
    return txObj;
  }
    return txObj.send(txOpts);
};

export const payInterest = (
  { web3, networkId, addresses },
  { loanOrderHash, trader, getObject, txOpts }
) => {
  const b0xContract = CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).B0x.abi,
    addresses.B0x
  );

  const txObj = b0xContract.methods
    .payInterest(loanOrderHash, trader);

  if (getObject) {
    return txObj;
  }
    return txObj.send(txOpts);
};

export const closeLoan = (
  { web3, networkId, addresses },
  { loanOrderHash, getObject, txOpts }
) => {
  const b0xContract = CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).B0x.abi,
    addresses.B0x
  );

  const txObj = b0xContract.methods
    .closeLoan(loanOrderHash);

  if (getObject) {
    return txObj;
  }
    return txObj.send(txOpts);
};

export const withdrawProfit = (
  { web3, networkId, addresses },
  { loanOrderHash, getObject, txOpts }
) => {
  const b0xContract = CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).B0x.abi,
    addresses.B0x
  );

  const txObj = b0xContract.methods
    .withdrawProfit(loanOrderHash);

  if (getObject) {
    return txObj;
  }
    return txObj.send(txOpts);
};

export const getProfitOrLoss = async (
  { web3, networkId, addresses },
  { loanOrderHash, trader }
) => {
  const b0xContract = await CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).B0x.abi,
    addresses.B0x
  );

  const data = await b0xContract.methods
    .getProfitOrLoss(loanOrderHash, trader)
    .call();

  return {
    isProfit: data.isProfit,
    profitOrLoss: data.profitOrLoss,
    positionTokenAddress: data.positionTokenAddress
  };
};
