import { assert } from "@0xproject/assert";
import { BigNumber } from "@0xproject/utils";
import * as utils from "./utils";
import erc20Abi from "./contracts/ERC20.abi.json";
import * as Addresses from "../test/constants/addresses";

export const setAllowance = async (
  web3,
  {
    tokenAddress,
    ownerAddress,
    spenderAddress = Addresses.B0x,
    amountInBaseUnits,
    txOpts = {
      gasLimit: 100000
    }
  }
) => {
  assert.isETHAddressHex("ownerAddress", ownerAddress);
  assert.isETHAddressHex("spenderAddress", spenderAddress);
  assert.isETHAddressHex("tokenAddress", tokenAddress);
  assert.isValidBaseUnitAmount("amountInBaseUnits", amountInBaseUnits);

  const tokenContract = await utils.getContractInstance(
    web3,
    erc20Abi,
    tokenAddress
  );
  const receipt = await tokenContract.methods
    .approve(spenderAddress, amountInBaseUnits)
    .send({
      from: ownerAddress,
      gas: txOpts.gasLimit,
      gasPrice: txOpts.gasPrice
    });

  return receipt;
};

export const getAllowance = async (
  web3,
  { tokenAddress, ownerAddress, spenderAddress = Addresses.B0x }
) => {
  assert.isETHAddressHex("ownerAddress", ownerAddress);
  assert.isETHAddressHex("spenderAddress", spenderAddress);
  assert.isETHAddressHex("tokenAddress", tokenAddress);

  const tokenContract = await utils.getContractInstance(
    web3,
    erc20Abi,
    tokenAddress
  );
  const allowanceValue = await tokenContract.methods
    .allowance(ownerAddress, spenderAddress)
    .call();
  return new BigNumber(allowanceValue);
};
