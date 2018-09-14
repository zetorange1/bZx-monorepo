import { BigNumber } from "bignumber.js";
import { map, mapAccum, pipe, zipWith } from "ramda";
import { assert } from "@0xproject/assert";
import * as utils from "../core/utils";
import { getContracts, oracleList } from "../contracts";
import * as Addresses from "../addresses";

export const getOracleListRaw = async ({ web3, networkId }) => {
  const ORACLE_ADDRESSES = 0;
  const ORACLE_NAME_LENGTHS = 1;
  const ORACLE_NAMES_ALL_CONCAT = 2;

  const oracleRegistryContract = await utils.getContractInstance(
    web3,
    getContracts(networkId).OracleRegistry.abi,
    Addresses.getAddresses(networkId).OracleRegistry
  );

  const res = await oracleRegistryContract.methods.getOracleList().call();
  const oracleAddresses = res[ORACLE_ADDRESSES];
  const oracleNameLengths = res[ORACLE_NAME_LENGTHS];
  const oracleNamesAllConcat = res[ORACLE_NAMES_ALL_CONCAT];

  return {
    oracleAddresses,
    oracleNameLengths,
    oracleNamesAllConcat
  };
};

export const cleanOracleNames = ({
  oracleNameLengths,
  oracleNamesAllConcat
}) => {
  const convertStrToNum = map(str => Number(str));
  const getSubstringIndiciesPairs = lengths => {
    // eslint-disable-next-line no-unused-vars
    const [accum, indiciesPairs] = mapAccum(
      (acc, val) => [acc + val, [acc, acc + val]],
      0
    )(lengths);
    return indiciesPairs;
  };
  const getNames = map(indicies =>
    oracleNamesAllConcat.substring(indicies[0], indicies[1])
  );

  const oracleNames = pipe(
    convertStrToNum,
    getSubstringIndiciesPairs,
    getNames
  )(oracleNameLengths);

  return oracleNames;
};

export const formatOracleList = ({ oracleAddresses, oracleNames }) =>
  zipWith(
    (address, name) => ({ address: address.toLowerCase(), name }),
    oracleAddresses,
    oracleNames
  );

export const getOracleList = async ({ web3, networkId }) => {

  const oracles = await oracleList(networkId);
  if (oracles)
    return oracles;

  // Fallback to on chain OracleRegistry if local list not found
  // Note: The local list is a stopgap to address MetaMask/Infura instability
  
  const {
    oracleAddresses,
    oracleNameLengths,
    oracleNamesAllConcat
  } = await getOracleListRaw({ web3, networkId });

  const oracleNames = cleanOracleNames({
    oracleNameLengths,
    oracleNamesAllConcat
  });

  return formatOracleList({ oracleAddresses, oracleNames });
};

export const isTradeSupported = async (
  { web3, networkId },
  { sourceTokenAddress, destTokenAddress, oracleAddress }
) => {
  assert.isETHAddressHex("sourceTokenAddress", sourceTokenAddress);
  assert.isETHAddressHex("destTokenAddress", destTokenAddress);
  assert.isETHAddressHex("oracleAddress", oracleAddress);

  const oracleContract = await utils.getContractInstance(
    web3,
    getContracts(networkId).OracleInterface.abi,
    oracleAddress
  );

  const queriesP = Promise.all([
    oracleContract.methods
      .isTradeSupported(sourceTokenAddress, destTokenAddress)
      .call(),
    oracleContract.methods
      .isTradeSupported(destTokenAddress, sourceTokenAddress)
      .call()
  ]);

  const [isSupportedForward, isSupportedReverse] = await queriesP;
  const isSupported = isSupportedForward && isSupportedReverse;

  return isSupported;
};

export const getConversionData = async (
  { web3, networkId },
  sourceTokenAddress,
  destTokenAddress,
  sourceTokenAmount,
  oracleAddress
) => {
  assert.isETHAddressHex("sourceTokenAddress", sourceTokenAddress);
  assert.isETHAddressHex("destTokenAddress", destTokenAddress);
  assert.isETHAddressHex("oracleAddress", oracleAddress);

  const oracleContract = await utils.getContractInstance(
    web3,
    getContracts(networkId).OracleInterface.abi,
    oracleAddress
  );

  const data = await oracleContract.methods
    .getTradeData(sourceTokenAddress, destTokenAddress, sourceTokenAmount)
    .call();

  return {
    rate: 0 in data && data[0] ? data[0] : new BigNumber(0),
    amount: 1 in data && data[1] ? data[1] : new BigNumber(0)
  };
};
