import * as utils from "./utils";
import b0xAbi from "./contracts/B0x.abi.json";
import * as addresses from "../test/constants/addresses";

export const takeLoanOrderAsLender = async (web3, order, txOpts) => {
  const b0xContract = await utils.getContractInstance(
    web3,
    b0xAbi,
    addresses.B0x
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
