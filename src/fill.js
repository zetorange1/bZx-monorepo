import * as utils from "./utils";
import b0xAbi from "./contracts/B0x.abi.json";
import * as addresses from "../test/constants/addresses";

export const takeLoanOrderAsLender = async (
  web3,
  orderAddresses,
  orderValues,
  signature
) => {
  const b0xContract = await utils.getContractInstance(
    web3,
    b0xAbi,
    addresses.B0x
  );

  b0xContract.methods
    .takeLoanOrderAsLender(orderAddresses, orderValues, signature)
    .send();
};
