import { map } from "ramda";
import ropsten from "./ropsten";

import B0xTest from "../../../protocol_contracts/test_network/deployed/B0x.json";
import B0xOracleTest from "../../../protocol_contracts/test_network/deployed/B0xOracle.json";
import B0xTo0xTest from "../../../protocol_contracts/test_network/deployed/B0xTo0x.json";
import B0xTokenTest from "../../../protocol_contracts/test_network/deployed/B0xToken.json";
import B0xVaultTest from "../../../protocol_contracts/test_network/deployed/B0xVault.json";
import EIP20Test from "../../../protocol_contracts/test_network/deployed/EIP20.json";
import OracleRegistryTest from "../../../protocol_contracts/test_network/deployed/OracleRegistry.json";
import TestToken0Test from "../../../protocol_contracts/test_network/deployed/TestToken0.json";
import TestToken1Test from "../../../protocol_contracts/test_network/deployed/TestToken1.json";
import TestToken2Test from "../../../protocol_contracts/test_network/deployed/TestToken2.json";
import TestToken3Test from "../../../protocol_contracts/test_network/deployed/TestToken3.json";
import TestToken4Test from "../../../protocol_contracts/test_network/deployed/TestToken4.json";
import TestToken5Test from "../../../protocol_contracts/test_network/deployed/TestToken5.json";
import TestToken6Test from "../../../protocol_contracts/test_network/deployed/TestToken6.json";
import TestToken7Test from "../../../protocol_contracts/test_network/deployed/TestToken7.json";
import TestToken8Test from "../../../protocol_contracts/test_network/deployed/TestToken8.json";
import TestToken9Test from "../../../protocol_contracts/test_network/deployed/TestToken9.json";
import TokenRegistryTest from "../../../protocol_contracts/test_network/deployed/TokenRegistry.json";

const test = {
  B0x: B0xTest,
  B0xOracle: B0xOracleTest,
  B0xTo0x: B0xTo0xTest,
  B0xToken: B0xTokenTest,
  B0xVault: B0xVaultTest,
  EIP20: EIP20Test,
  OracleRegistry: OracleRegistryTest,
  TestToken0: TestToken0Test,
  TestToken1: TestToken1Test,
  TestToken2: TestToken2Test,
  TestToken3: TestToken3Test,
  TestToken4: TestToken4Test,
  TestToken5: TestToken5Test,
  TestToken6: TestToken6Test,
  TestToken7: TestToken7Test,
  TestToken8: TestToken8Test,
  TestToken9: TestToken9Test,
  TokenRegistry: TokenRegistryTest
};

const contractsRaw = process.env.NODE_ENV === "production" ? ropsten : test;
const contracts = map(
  ({ address, ...rest }) => ({ address: address.toLowerCase(), ...rest }),
  contractsRaw
);

export default contracts;
