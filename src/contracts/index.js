import { map } from "ramda";
import B0x from "./B0x.json";
import B0xOracle from "./B0xOracle.json";
import B0xTo0x from "./B0xTo0x.json";
import B0xToken from "./B0xToken.json";
import B0xVault from "./B0xVault.json";
import EIP20 from "./EIP20.json";
import OracleRegistry from "./OracleRegistry.json";
import TestToken0 from "./TestToken0.json";
import TestToken1 from "./TestToken1.json";
import TestToken2 from "./TestToken2.json";
import TestToken3 from "./TestToken3.json";
import TestToken4 from "./TestToken4.json";
import TestToken5 from "./TestToken5.json";
import TestToken6 from "./TestToken6.json";
import TestToken7 from "./TestToken7.json";
import TestToken8 from "./TestToken8.json";
import TestToken9 from "./TestToken9.json";
import TokenRegistry from "./TokenRegistry.json";

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

const live = {
  B0x,
  B0xOracle,
  B0xTo0x,
  B0xToken,
  B0xVault,
  EIP20,
  OracleRegistry,
  TestToken0,
  TestToken1,
  TestToken2,
  TestToken3,
  TestToken4,
  TestToken5,
  TestToken6,
  TestToken7,
  TestToken8,
  TestToken9,
  TokenRegistry
};

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

const contractsRaw = process.env.NODE_ENV === "production" ? live : test;
const contracts = map(
  ({ address, ...rest }) => ({ address: address.toLowerCase(), ...rest }),
  contractsRaw
);

export default contracts;
