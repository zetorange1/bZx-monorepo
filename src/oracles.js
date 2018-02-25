import * as utils from "./utils";
import oracleRegistryAbi from "./contracts/OracleRegistry.abi.json";
import * as addresses from "../test/constants/addresses";

export const getOracleList = async web3 => {
  const ORACLE_ADDRESSES = 0;
  const ORACLE_NAME_LENGTHS = 1;
  const ORACLE_NAMES_ALL_CONCAT = 2;

  const oracleRegistryContract = await utils.getContractInstance(
    web3,
    oracleRegistryAbi,
    addresses.OracleRegistry
  );

  const res = await oracleRegistryContract.methods.getOracleList().call();
  const oracleAddresses = res[ORACLE_ADDRESSES];
  const oracleNameLengths = res[ORACLE_NAME_LENGTHS];
  const oracleNamesAllConcat = res[ORACLE_NAMES_ALL_CONCAT];

  console.log(oracleAddresses, oracleNameLengths, oracleNamesAllConcat);
};
