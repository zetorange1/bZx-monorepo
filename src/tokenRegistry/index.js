import * as utils from "../core/utils";
import { getContracts } from "../contracts";
import * as Addresses from "../addresses";

export const getTokenList = async ({ web3, networkId }) => {
  const tokenRegistryContract = await utils.getContractInstance(
    web3,
    getContracts(networkId).TokenRegistry.abi,
    Addresses.getAddresses(networkId).TokenRegistry
  );

  const tokenAddresses = await tokenRegistryContract.methods
    .getTokenAddresses()
    .call();

  const promises = tokenAddresses.map(async address => {
    const doesExist = await utils.doesContractExistAtAddress(web3, address);
    if (doesExist) {
      const tokenData = await tokenRegistryContract.methods
        .getTokenMetaData(address)
        .call();
      return {
        address: tokenData[0].toLowerCase(),
        name: tokenData[1],
        symbol: tokenData[2],
        decimals: tokenData[3],
        url: tokenData[4]
      };
    }
    return null;
  });

  const tokensRaw = await Promise.all(promises);
  const tokens = tokensRaw.filter(token => !!token);

  return tokens;
};
