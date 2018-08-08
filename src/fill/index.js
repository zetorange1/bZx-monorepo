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
