import { assert } from "0x.js/lib/src/utils/assert";
import { BigNumber } from "@0xproject/utils";
import * as utils from "./utils";
import erc20Json from "./contracts/ERC20.json";

export const setAllowance = async (
  web3,
  { tokenAddress, ownerAddress, spenderAddress, amountInBaseUnits, txOpts = {} }
) => {
  assert.isETHAddressHex("ownerAddress", ownerAddress);
  assert.isETHAddressHex("spenderAddress", spenderAddress);
  assert.isETHAddressHex("tokenAddress", tokenAddress);
  assert.isValidBaseUnitAmount("amountInBaseUnits", amountInBaseUnits);

  const tokenContract = await utils.getTokenContract(
    web3,
    erc20Json,
    tokenAddress
  );
  const receipt = await tokenContract.methods
    .approve(spenderAddress, amountInBaseUnits)
    .send({
      from: ownerAddress,
      gas: txOpts.gasLimit,
      gasPrice: txOpts.gasPrice
    });

  return receipt.transactionHash;
};

export const getAllowance = async (
  web3,
  { tokenAddress, ownerAddress, spenderAddress }
) => {
  assert.isETHAddressHex("ownerAddress", ownerAddress);
  assert.isETHAddressHex("spenderAddress", spenderAddress);
  assert.isETHAddressHex("tokenAddress", tokenAddress);

  const tokenContract = await utils.getTokenContract(
    web3,
    erc20Json,
    tokenAddress
  );
  const allowanceValue = await tokenContract.methods
    .allowance(ownerAddress, spenderAddress)
    .call();
  return new BigNumber(allowanceValue);
};
