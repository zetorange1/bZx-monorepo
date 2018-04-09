import { assert } from "@0xproject/assert";
import * as utils from "../core/utils";
import { getContracts } from "../contracts";
import * as Addresses from "../addresses";

export const getTokenList = async ({ web3, networkId }) => {

  const tokenRegistryContract = await utils.getContractInstance(
    web3,
    getContracts(networkId).TokenRegistry.abi,
    Addresses.getAddresses(networkId).TokenRegistry
  );

  const tokenAddresses = await tokenRegistryContract.methods.getTokenAddresses().call();

  var tokens = [];
  for(var i=0; i < tokenAddresses.length; i++) {
    const contractExists = await utils.doesContractExistAtAddress(web3, tokenAddresses[i]);
    if (contractExists) {
      const tokenData = await tokenRegistryContract.methods.getTokenMetaData(tokenAddresses[i]).call();
      tokens.push({
        "address": tokenData[0].toLowerCase(),
        "name": tokenData[1],
        "symbol": tokenData[2],
        "decimals": tokenData[3],
        "url": tokenData[4],
      });
    }
  }

  return tokens;
}
