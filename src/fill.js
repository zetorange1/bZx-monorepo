import * as utils from "./utils";
import b0xAbi from "./contracts/B0x.abi.json";
import * as addresses from "../test/constants/addresses";

export const takeLoanOrderAsLender = async (
  web3,
  {
    // order addresses
    makerAddress,
    loanTokenAddress,
    interestTokenAddress,
    collateralTokenAddress,
    feeRecipientAddress,
    oracleAddress,
    // order values
    loanTokenAmount,
    interestAmount,
    initialMarginAmount,
    maintenanceMarginAmount,
    lenderRelayFee,
    traderRelayFee,
    expirationUnixTimestampSec,
    salt,
    signature
  }
) => {
  const b0xContract = await utils.getContractInstance(
    web3,
    b0xAbi,
    addresses.B0x
  );

  const orderAddresses = {
    makerAddress,
    loanTokenAddress,
    interestTokenAddress,
    collateralTokenAddress,
    feeRecipientAddress,
    oracleAddress
  };

  const orderValues = {
    loanTokenAmount,
    interestAmount,
    initialMarginAmount,
    maintenanceMarginAmount,
    lenderRelayFee,
    traderRelayFee,
    expirationUnixTimestampSec,
    salt
  };

  b0xContract.methods
    .takeLoanOrderAsLender(orderAddresses, orderValues, signature)
    .send();
};
