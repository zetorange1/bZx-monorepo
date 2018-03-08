import * as utils from "./utils";
import contracts from "./contracts";

export const takeLoanOrderAsLender = async (web3, order, txOpts) => {
  const b0xContract = await utils.getContractInstance(
    web3,
    contracts.B0x.abi,
    contracts.B0x.address
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
    order.salt
  ];

  return b0xContract.methods
    .takeLoanOrderAsLender(orderAddresses, orderValues, order.signature)
    .send({
      from: txOpts.from,
      gas: txOpts.gas,
      gasPrice: txOpts.gasPrice
    });
};

export const takeLoanOrderAsTrader = async (
  web3,
  order,
  collateralTokenAddress,
  loanTokenAmountFilled,
  txOpts
) => {
  const b0xContract = await utils.getContractInstance(
    web3,
    contracts.B0x.abi,
    contracts.B0x.address
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
    order.salt
  ];

  return b0xContract.methods
    .takeLoanOrderAsTrader(
      orderAddresses,
      orderValues,
      collateralTokenAddress,
      loanTokenAmountFilled,
      order.signature
    )
    .send({
      from: txOpts.from,
      gas: txOpts.gas,
      gasPrice: txOpts.gasPrice
    });
};
