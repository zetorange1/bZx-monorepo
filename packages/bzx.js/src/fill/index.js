import * as Signature from "../signature";
import * as CoreUtils from "../core/utils";
import { getContracts } from "../contracts";
import * as Addresses from "../addresses";

const checkForValidSignature = order => {
  Signature.isValidSignature({
    account: order.makerAddress,
    orderHash: CoreUtils.getLoanOrderHashHex(order),
    signature: order.signature
  });
};

export const takeLoanOrderAsLender = (
  { web3, networkId },
  { order, oracleData, getObject, txOpts }
) => {
  checkForValidSignature(order);

  const bZxContract = CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).BZx.abi,
    Addresses.getAddresses(networkId).BZx
  );

  const orderAddresses = [
    order.makerAddress,
    order.loanTokenAddress,
    order.interestTokenAddress,
    order.collateralTokenAddress,
    order.feeRecipientAddress,
    order.oracleAddress
  ];

  const orderValues = [
    order.loanTokenAmount,
    order.interestAmount,
    order.initialMarginAmount,
    order.maintenanceMarginAmount,
    order.lenderRelayFee,
    order.traderRelayFee,
    order.maxDurationUnixTimestampSec,
    order.expirationUnixTimestampSec,
    order.makerRole,
    order.salt
  ];

  const txObj = bZxContract.methods.takeLoanOrderAsLender(
    orderAddresses,
    orderValues,
    oracleData || "0x",
    order.signature
  );

  if (getObject) {
    return txObj;
  }
  return txObj.send(txOpts);
};

export const takeLoanOrderAsTrader = (
  { web3, networkId },
  { order, oracleData, collateralTokenAddress, loanTokenAmountFilled, getObject, txOpts }
) => {
  checkForValidSignature(order);
  console.log(order, oracleData, collateralTokenAddress, loanTokenAmountFilled, getObject, txOpts);
  const bZxContract = CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).BZx.abi,
    Addresses.getAddresses(networkId).BZx
  );

  const orderAddresses = [
    order.makerAddress,
    order.loanTokenAddress,
    order.interestTokenAddress,
    order.collateralTokenAddress,
    order.feeRecipientAddress,
    order.oracleAddress
  ];

  const orderValues = [
    order.loanTokenAmount,
    order.interestAmount,
    order.initialMarginAmount,
    order.maintenanceMarginAmount,
    order.lenderRelayFee,
    order.traderRelayFee,
    order.maxDurationUnixTimestampSec,
    order.expirationUnixTimestampSec,
    order.makerRole,
    order.salt
  ];

  const txObj = bZxContract.methods.takeLoanOrderAsTrader(
    orderAddresses,
    orderValues,
    oracleData || "0x",
    collateralTokenAddress,
    web3.utils.toBN(loanTokenAmountFilled).toString(10),
    order.signature
  );

  if (getObject) {
    return txObj;
  }
  return txObj.send(txOpts);
};

export const pushLoanOrderOnChain = (
  { web3, networkId },
  { order, oracleData, getObject, txOpts }
) => {
  checkForValidSignature(order);

  const bZxContract = CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).BZx.abi,
    Addresses.getAddresses(networkId).BZx
  );

  const orderAddresses = [
    order.makerAddress,
    order.loanTokenAddress,
    order.interestTokenAddress,
    order.collateralTokenAddress,
    order.feeRecipientAddress,
    order.oracleAddress
  ];

  const orderValues = [
    web3.utils.toBN(order.loanTokenAmount).toString(10),
    web3.utils.toBN(order.interestAmount).toString(10),
    web3.utils.toBN(order.initialMarginAmount).toString(10),
    web3.utils.toBN(order.maintenanceMarginAmount).toString(10),
    web3.utils.toBN(order.lenderRelayFee).toString(10),
    web3.utils.toBN(order.traderRelayFee).toString(10),
    web3.utils.toBN(order.maxDurationUnixTimestampSec).toString(10),
    web3.utils.toBN(order.expirationUnixTimestampSec).toString(10),
    web3.utils.toBN(order.makerRole).toString(10),
    web3.utils.toBN(order.salt).toString(10)
  ];

  const txObj = bZxContract.methods.pushLoanOrderOnChain(
    orderAddresses,
    orderValues,
    oracleData || "0x",
    order.signature
  );

  if (getObject) {
    return txObj;
  }
  return txObj.send(txOpts);
};

export const takeLoanOrderOnChainAsTrader = (
  { web3, networkId },
  {
    loanOrderHash,
    collateralTokenAddress,
    loanTokenAmountFilled,
    getObject,
    txOpts
  }
) => {
  const bZxContract = CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).BZx.abi,
    Addresses.getAddresses(networkId).BZx
  );

  const txObj = bZxContract.methods.takeLoanOrderOnChainAsTrader(
    loanOrderHash,
    collateralTokenAddress,
    web3.utils.toBN(loanTokenAmountFilled).toString(10)
  );

  if (getObject) {
    return txObj;
  }
  return txObj.send(txOpts);
};

export const takeLoanOrderOnChainAsLender = (
  { web3, networkId },
  { loanOrderHash, getObject, txOpts }
) => {
  const bZxContract = CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).BZx.abi,
    Addresses.getAddresses(networkId).BZx
  );

  const txObj = bZxContract.methods.takeLoanOrderOnChainAsLender(loanOrderHash);

  if (getObject) {
    return txObj;
  }
  return txObj.send(txOpts);
};

export const cancelLoanOrder = (
  { web3, networkId },
  { order, oracleData, cancelLoanTokenAmount, getObject, txOpts }
) => {
  checkForValidSignature(order);

  const bZxContract = CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).BZx.abi,
    Addresses.getAddresses(networkId).BZx
  );

  const orderAddresses = [
    order.makerAddress,
    order.loanTokenAddress,
    order.interestTokenAddress,
    order.collateralTokenAddress,
    order.feeRecipientAddress,
    order.oracleAddress
  ];

  const orderValues = [
    order.loanTokenAmount,
    order.interestAmount,
    order.initialMarginAmount,
    order.maintenanceMarginAmount,
    order.lenderRelayFee,
    order.traderRelayFee,
    order.maxDurationUnixTimestampSec,
    order.expirationUnixTimestampSec,
    order.makerRole,
    order.salt
  ];

  const txObj = bZxContract.methods.cancelLoanOrder(
    orderAddresses,
    orderValues,
    oracleData || "0x",
    web3.utils.toBN(cancelLoanTokenAmount).toString(10)
  );

  if (getObject) {
    return txObj;
  }
  return txObj.send(txOpts);
};

export const cancelLoanOrderWithHash = (
  { web3, networkId },
  { loanOrderHash, cancelLoanTokenAmount, getObject, txOpts }
) => {
  const bZxContract = CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).BZx.abi,
    Addresses.getAddresses(networkId).BZx
  );

  const txObj = bZxContract.methods.cancelLoanOrderWithHash(
    loanOrderHash,
    web3.utils.toBN(cancelLoanTokenAmount).toString(10)
  );

  if (getObject) {
    return txObj;
  }
  return txObj.send(txOpts);
};

export const getInitialCollateralRequired = async (
  { web3, networkId },
  loanTokenAddress,
  collateralTokenAddress,
  oracleAddress,
  loanTokenAmountFilled,
  initialMarginAmount
) => {
  const bZxContract = await CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).BZx.abi,
    Addresses.getAddresses(networkId).BZx
  );
  let initialCollateralRequired = null;
  try {
    initialCollateralRequired = await bZxContract.methods
      .getInitialCollateralRequired(
        loanTokenAddress,
        collateralTokenAddress,
        oracleAddress,
        loanTokenAmountFilled,
        initialMarginAmount
      )
      .call();
  } catch (e) {
    console.log(e);
  }
  return initialCollateralRequired;
};

export const orderFilledAmount = async (
  { web3, networkId },
  loanOrderHash
) => {
  const bZxContract = await CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).BZx.abi,
    Addresses.getAddresses(networkId).BZx
  );
  let filledAmount = null;
  try {
    filledAmount = await bZxContract.methods
      .orderFilledAmounts(loanOrderHash)
      .call();
  } catch (e) {
    console.log(e);
  }
  return filledAmount;
};

export const orderCancelledAmount = async (
  { web3, networkId },
  loanOrderHash
) => {
  const bZxContract = await CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).BZx.abi,
    Addresses.getAddresses(networkId).BZx
  );
  let cancelledAmount = null;
  try {
    cancelledAmount = await bZxContract.methods
      .orderCancelledAmounts(loanOrderHash)
      .call();
  } catch (e) {
    console.log(e);
  }
  return cancelledAmount;
};
