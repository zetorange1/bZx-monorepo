import { assert } from "@0xproject/assert";
import { BigNumber } from "@0xproject/utils";
import * as CoreUtils from "../core/utils";
import { local as Contracts } from "../contracts";
import * as Addresses from "../addresses";

const erc20Abi = Contracts.EIP20.abi;

export const setAllowance = (
  { web3, networkId },
  {
    tokenAddress,
    ownerAddress,
    spenderAddress = Addresses.getAddresses(networkId).BZxVault,
    amountInBaseUnits,
    getObject,
    txOpts
  }
) => {
  assert.isETHAddressHex("ownerAddress", ownerAddress);
  assert.isETHAddressHex("spenderAddress", spenderAddress);
  assert.isETHAddressHex("tokenAddress", tokenAddress);
  assert.isValidBaseUnitAmount("amountInBaseUnits", amountInBaseUnits);

  const tokenContract = CoreUtils.getContractInstance(
    web3,
    erc20Abi,
    tokenAddress
  );

  const txObj = tokenContract.methods.approve(
    spenderAddress,
    amountInBaseUnits
  );

  if (getObject) {
    return txObj;
  }
  return txObj.send(txOpts);
};

export const getAllowance = async (
  { web3, networkId },
  {
    tokenAddress,
    ownerAddress,
    spenderAddress = Addresses.getAddresses(networkId).BZxVault
  }
) => {
  assert.isETHAddressHex("ownerAddress", ownerAddress);
  assert.isETHAddressHex("spenderAddress", spenderAddress);
  assert.isETHAddressHex("tokenAddress", tokenAddress);

  const tokenContract = await CoreUtils.getContractInstance(
    web3,
    erc20Abi,
    tokenAddress
  );
  const allowanceValue = await tokenContract.methods
    .allowance(ownerAddress, spenderAddress)
    .call();
  return new BigNumber(allowanceValue);
};
