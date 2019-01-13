import * as CoreUtils from "../core/utils";
import { getContracts } from "../contracts";

export const depositCollateral = (
  { web3, networkId, addresses },
  { loanOrderHash, collateralTokenFilled, depositAmount, getObject, txOpts }
) => {
  const bZxContract = CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).BZx.abi,
    addresses.BZx
  );

  const txObj = bZxContract.methods.depositCollateral(
    loanOrderHash,
    collateralTokenFilled,
    web3.utils.toBN(depositAmount).toString(10)
  );

  if (getObject) {
    return txObj;
  }
  return txObj.send(txOpts);
};

export const withdrawCollateral = (
  { web3, networkId, addresses },
  { loanOrderHash, collateralTokenFilled, withdrawAmount, getObject, txOpts }
) => {
  const bZxContract = CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).BZx.abi,
    addresses.BZx
  );

  const txObj = bZxContract.methods.withdrawCollateral(
    loanOrderHash,
    collateralTokenFilled,
    web3.utils.toBN(withdrawAmount).toString(10)
  );

  if (getObject) {
    return txObj;
  }
  return txObj.send(txOpts);
};

export const changeCollateral = (
  { web3, networkId, addresses },
  { loanOrderHash, collateralTokenFilled, getObject, txOpts }
) => {
  const bZxContract = CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).BZx.abi,
    addresses.BZx
  );

  const txObj = bZxContract.methods.changeCollateral(
    loanOrderHash,
    collateralTokenFilled
  );

  if (getObject) {
    return txObj;
  }
  return txObj.send(txOpts);
};

export const withdrawPosition = (
  { web3, networkId, addresses },
  { loanOrderHash, withdrawAmount, getObject, txOpts }
) => {
  const bZxContract = CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).BZx.abi,
    addresses.BZx
  );

  const txObj = bZxContract.methods.withdrawPosition(
    loanOrderHash,
    web3.utils.toBN(withdrawAmount).toString(10)
  );

  if (getObject) {
    return txObj;
  }
  return txObj.send(txOpts);
};

export const depositPosition = (
  { web3, networkId, addresses },
  { loanOrderHash, depositTokenAddress, depositAmount, getObject, txOpts }
) => {
  const bZxContract = CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).BZx.abi,
    addresses.BZx
  );

  const txObj = bZxContract.methods.depositPosition(
    loanOrderHash,
    depositTokenAddress,
    web3.utils.toBN(depositAmount).toString(10)
  );

  if (getObject) {
    return txObj;
  }
  return txObj.send(txOpts);
};

export const getPositionOffset = async (
  { web3, networkId, addresses },
  { loanOrderHash, trader }
) => {
  const bZxContract = await CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).BZx.abi,
    addresses.BZx
  );

  const data = await bZxContract.methods
    .getPositionOffset(loanOrderHash, trader)
    .call();

  return {
    isPositive: data.isPositive,
    positionOffsetAmount: data.positionOffsetAmount,
    loanOffsetAmount: data.loanOffsetAmount,
    positionTokenAddress: data.positionTokenAddress
  };
};

export const payInterest = (
  { web3, networkId, addresses },
  { loanOrderHash, getObject, txOpts }
) => {
  const bZxContract = CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).BZx.abi,
    addresses.BZx
  );

  const txObj = bZxContract.methods.payInterest(loanOrderHash);

  if (getObject) {
    return txObj;
  }
  return txObj.send(txOpts);
};

export const getLenderInterestForToken = async (
  { web3, networkId, addresses },
  { lender, interestTokenAddress }
) => {
  const bZxContract = CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).BZx.abi,
    addresses.BZx
  );
  const data = await bZxContract.methods
    .getLenderInterestForToken(lender, interestTokenAddress)
    .call();
  return {
    interestPaid: data[0],
    interestPaidDate: data[1],
    interestOwedPerDay: data[2],
    interestUnPaid: data[3]
  };
};

export const getLenderInterestForOrder = async (
  { web3, networkId, addresses },
  { loanOrderHash }
) => {
  const bZxContract = CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).BZx.abi,
    addresses.BZx
  );
  const data = await bZxContract.methods
    .getLenderInterestForOrder(loanOrderHash)
    .call();
  return {
    lender: data[0],
    interestTokenAddress: data[1],
    interestPaid: data[2],
    interestPaidDate: data[3],
    interestOwedPerDay: data[4],
    interestUnPaid: data[5]
  };
};

export const getTraderInterestForLoan = async (
  { web3, networkId, addresses },
  { loanOrderHash, trader }
) => {
  const bZxContract = CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).BZx.abi,
    addresses.BZx
  );
  const data = await bZxContract.methods
    .getTraderInterestForLoan(loanOrderHash, trader)
    .call();
  return {
    interestTokenAddress: data[0],
    interestOwedPerDay: data[1],
    interestPaidTotal: data[2],
    interestDepositTotal: data[3],
    interestDepositRemaining: data[4]
  };
};

export const closeLoanPartially = (
  { web3, networkId, addresses },
  { loanOrderHash, closeAmount, getObject, txOpts }
) => {
  const bZxContract = CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).BZx.abi,
    addresses.BZx
  );

  const txObj = bZxContract.methods.closeLoanPartially(
    loanOrderHash,
    web3.utils.toBN(closeAmount).toString(10)
  );

  if (getObject) {
    return txObj;
  }
  return txObj.send(txOpts);
};

export const closeLoan = (
  { web3, networkId, addresses },
  { loanOrderHash, getObject, txOpts }
) => {
  const bZxContract = CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).BZx.abi,
    addresses.BZx
  );

  const txObj = bZxContract.methods.closeLoan(loanOrderHash);

  if (getObject) {
    return txObj;
  }
  return txObj.send(txOpts);
};