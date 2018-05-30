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

export const takeLoanOrderAsLender = ({ web3, networkId }, order, txOpts) => {
  checkForValidSignature(order);

  const b0xContract = CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).B0x.abi,
    Addresses.getAddresses(networkId).B0x
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

  const txObj = b0xContract.methods.takeLoanOrderAsLender(
    orderAddresses,
    orderValues,
    order.signature
  );

  return txObj.send({
    from: txOpts.from,
    gas: txOpts.gas,
    gasPrice: web3.utils.toWei("2", "gwei") // txOpts.gasPrice
  });
};

export const takeLoanOrderAsTrader = (
  { web3, networkId },
  order,
  collateralTokenAddress,
  loanTokenAmountFilled,
  txOpts
) => {
  checkForValidSignature(order);

  const b0xContract = CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).B0x.abi,
    Addresses.getAddresses(networkId).B0x
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

  const txObj = b0xContract.methods.takeLoanOrderAsTrader(
    orderAddresses,
    orderValues,
    collateralTokenAddress,
    loanTokenAmountFilled,
    order.signature
  );

  return txObj.send({
    from: txOpts.from,
    gas: txOpts.gas,
    gasPrice: web3.utils.toWei("2", "gwei") // txOpts.gasPrice
  });
};

export const getInitialCollateralRequired = async (
  { web3, networkId },
  loanTokenAddress,
  collateralTokenAddress,
  oracleAddress,
  loanTokenAmountFilled,
  initialMarginAmount
) => {
  const b0xContract = await CoreUtils.getContractInstance(
    web3,
    getContracts(networkId).B0x.abi,
    Addresses.getAddresses(networkId).B0x
  );
  let initialCollateralRequired = null;
  try {
    initialCollateralRequired = await b0xContract.methods
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
