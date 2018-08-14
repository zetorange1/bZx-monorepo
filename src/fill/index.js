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
    { order, getObject, txOpts }
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
    order.expirationUnixTimestampSec,
    order.makerRole,
    order.salt
  ];

  const txObj = bZxContract.methods.takeLoanOrderAsLender(
    orderAddresses,
    orderValues,
    order.signature
  );

  if (getObject) {
    return txObj;
  }
    return txObj.send(txOpts);
};

export const takeLoanOrderAsTrader = (
  { web3, networkId },
  { order, collateralTokenAddress, loanTokenAmountFilled, getObject, txOpts }
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
    order.expirationUnixTimestampSec,
    order.makerRole,
    order.salt
  ];

  const txObj = bZxContract.methods.takeLoanOrderAsTrader(
    orderAddresses,
    orderValues,
    collateralTokenAddress,
    loanTokenAmountFilled,
    order.signature
  );

  if (getObject) {
    return txObj;
  }
    return txObj.send(txOpts);
};

export const pushLoanOrderOnChain = (
  { web3, networkId },
  { order, getObject, txOpts }
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
    order.expirationUnixTimestampSec,
    order.makerRole,
    order.salt
  ];

  const txObj = bZxContract.methods.pushLoanOrderOnChain(
    orderAddresses,
    orderValues,
    order.signature
  );

  if (getObject) {
    return txObj;
  }
    return txObj.send(txOpts);
};

export const takeLoanOrderOnChainAsTrader = (
  { web3, networkId },
  { loanOrderHash, collateralTokenAddress, loanTokenAmountFilled, getObject, txOpts }
) => {
  const bZxContract = CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).BZx.abi,
    Addresses.getAddresses(networkId).BZx
  );

  const txObj = bZxContract.methods.takeLoanOrderOnChainAsTrader(
    loanOrderHash,
    collateralTokenAddress,
    loanTokenAmountFilled
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

  const txObj = bZxContract.methods.takeLoanOrderOnChainAsLender(
    loanOrderHash
  );

  if (getObject) {
    return txObj;
  }
    return txObj.send(txOpts);
};

export const cancelLoanOrder = (
  { web3, networkId },
  { order, cancelLoanTokenAmount, getObject, txOpts }
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
    order.expirationUnixTimestampSec,
    order.makerRole,
    order.salt
  ];

  const txObj = bZxContract.methods.cancelLoanOrder(
    orderAddresses,
    orderValues,
    cancelLoanTokenAmount
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

  const txObj = bZxContract.methods.cancelLoanOrder(
    loanOrderHash,
    cancelLoanTokenAmount
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
